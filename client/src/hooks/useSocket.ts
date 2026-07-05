import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGridStore, GridTile, HistoryEvent } from '../store/useGridStore';
import confetti from 'canvas-confetti';

let socketInstance: Socket | null = null;

export function useSocket() {
  const {
    user,
    setConnected,
    setPresenceList,
    updateCursor,
    removeCursor,
    updateTile,
    setLatency,
    addNotification,
    setHistory,
    addHistoryEvent,
    setTiles,
    updateUserScore,
    updateRegionControl,
    latencySimulatedDelay,
  } = useGridStore();

  const socketRef = useRef<Socket | null>(null);
  const originalTilesRef = useRef<Record<string, GridTile>>({});

  useEffect(() => {
    if (!user) return;

    // Connect to server
    const serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5001';
    
    if (!socketInstance) {
      socketInstance = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: true,
      });
    }

    const socket = socketInstance;
    socketRef.current = socket;

    // Ping/Latency tracker
    let pingInterval: NodeJS.Timeout;
    const startPingTracking = () => {
      pingInterval = setInterval(() => {
        const start = Date.now();
        socket.emit('ping', () => {
          const latencyValue = Date.now() - start;
          setLatency(latencyValue);
        });
      }, 2000);
    };

    socket.on('connect', () => {
      setConnected(true);
      
      // Join server room with our guest profile
      socket.emit('join', user);
      
      startPingTracking();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      clearInterval(pingInterval);
    });

    // Multiplayer listeners
    socket.on('presence_update', (data: { count: number; users: any[] }) => {
      setPresenceList(data.users);
    });

    socket.on('cursor_update', (data: { userId: string; username: string; x: number; y: number }) => {
      // Don't draw our own cursor
      if (data.userId === user.id) return;
      updateCursor(data.userId, { username: data.username, x: data.x, y: data.y });
    });

    socket.on('cursor_remove', (userId: string) => {
      removeCursor(userId);
    });

    // Real-time synchronization
    socket.on('capture_success', (payload: { tile: GridTile; combo: number; scoreGain: number; history: HistoryEvent }) => {
      // Play Confetti burst if WE captured the tile
      const isMyCapture = payload.tile.ownerId === user.id;
      if (isMyCapture) {
        // Trigger small confetti burst
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#FF007A', '#7B2CBF', '#00F0FF', '#0072FF'],
        });

        // Trigger combo popup / updates
        useGridStore.setState({ combo: payload.combo });
        
        // Update local score
        updateUserScore(user.score + payload.scoreGain);
      }

      // Add to cooldowns list for 5 seconds lock
      useGridStore.getState().addCooldownTile(payload.tile.id, 5000);

      // Update the tile in store
      updateTile(payload.tile);

      // Add history record
      addHistoryEvent(payload.history);
    });

    socket.on('capture_failed', (data: { tileId: string; error: string }) => {
      // Trigger clash shake effect
      useGridStore.getState().triggerClash(data.tileId);

      // Rollback to cached pre-optimistic state
      const original = originalTilesRef.current[data.tileId];
      if (original) {
        updateTile(original);
        delete originalTilesRef.current[data.tileId];
      }

      // Trigger warning notification
      addNotification(data.error, 'alert');
    });

    socket.on('territory_update', (data: { regionId: string; ownerId: string | null; color: string | null }) => {
      updateRegionControl(data.regionId, data.ownerId, data.color);
      
      if (data.ownerId) {
        const owner = useGridStore.getState().presenceList.find(p => p.id === data.ownerId);
        const name = owner ? owner.username : 'A user';
        if (data.ownerId === user.id) {
          addNotification('You captured region control!', 'info');
        } else {
          addNotification(`${name} captured control of region ${data.regionId}`, 'info');
        }
      }
    });

    socket.on('achievement_unlocked', (ach: { id: string; title: string; description: string }) => {
      addNotification(`Achievement Unlocked: ${ach.title} - ${ach.description}`, 'achievement');
    });

    socket.on('system_notification', (data: { message: string; type: string }) => {
      addNotification(data.message, 'info');
    });

    // Initial load connection setup
    if (socket.connected) {
      setConnected(true);
      socket.emit('join', user);
      startPingTracking();
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('presence_update');
      socket.off('cursor_update');
      socket.off('cursor_remove');
      socket.off('capture_success');
      socket.off('capture_failed');
      socket.off('territory_update');
      socket.off('achievement_unlocked');
      socket.off('system_notification');
      clearInterval(pingInterval);
    };
  }, [user]);

  // Lag Simulation Emitters
  const emitCursorMove = (x: number, y: number) => {
    if (!socketRef.current || !socketRef.current.connected) return;
    
    const socket = socketRef.current;
    if (latencySimulatedDelay > 0) {
      setTimeout(() => {
        socket.emit('cursor_move', { x, y });
      }, latencySimulatedDelay);
    } else {
      socket.emit('cursor_move', { x, y });
    }
  };

  const emitCapture = (tileId: string) => {
    if (!socketRef.current || !socketRef.current.connected || !user) return;

    const socket = socketRef.current;
    
    // Optimistic UI Update: immediately claim cell locally
    const originalTile = useGridStore.getState().tiles[tileId];
    if (originalTile) {
      originalTilesRef.current[tileId] = originalTile;
    }
    
    const optimisticTile: GridTile = {
      id: tileId,
      ownerId: user.id,
      username: user.username,
      avatar: user.avatar,
      color: user.color,
      updatedAt: new Date().toISOString(),
      captureCount: originalTile ? originalTile.captureCount + 1 : 1,
    };

    // Apply optimistic update locally
    updateTile(optimisticTile);
    useGridStore.getState().addCooldownTile(tileId, 5000);

    // Emit capture socket event with simulated lag delay if configured
    if (latencySimulatedDelay > 0) {
      setTimeout(() => {
        socket.emit('capture', { tileId, userId: user.id });
      }, latencySimulatedDelay);
    } else {
      socket.emit('capture', { tileId, userId: user.id });
    }
  };

  return {
    emitCursorMove,
    emitCapture,
  };
}
