import { Server, Socket } from 'socket.io';
import { prisma } from '../services/db';
import { redisClient, acquireLock, releaseLock } from '../services/redis';

// Track socket-to-user mappings in memory for quick disconnect cleanup
const activeSockets = new Map<string, { userId: string; username: string }>();

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle user join
    socket.on('join', async (userData: { id: string; username: string; avatar: string; color: string }) => {
      const { id, username, avatar, color } = userData;
      
      // Store in memory mapping
      activeSockets.set(socket.id, { userId: id, username });

      // Ensure user exists in database, or create them
      let user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        user = await prisma.user.create({
          data: { id, username, avatar, color, score: 0 },
        });
      } else {
        // Update credentials (username, avatar, color) in case they changed
        user = await prisma.user.update({
          where: { id },
          data: { username, avatar, color },
        });
      }

      // Add user to Redis online set and store profile in Redis hash
      await redisClient.sAdd('online:users', id);
      await redisClient.hSet('online:users:data', id, JSON.stringify({
        id,
        username,
        avatar,
        color,
        score: user.score,
        socketId: socket.id,
      }));

      // Broadcast updated presence list
      await broadcastPresence(io);
      console.log(`User joined: ${username} (${id})`);
    });

    // Handle cursor movement
    socket.on('cursor_move', (data: { x: number; y: number }) => {
      const activeUser = activeSockets.get(socket.id);
      if (!activeUser) return;

      // Broadcast cursor coordinates to other users
      socket.broadcast.emit('cursor_update', {
        userId: activeUser.userId,
        username: activeUser.username,
        x: data.x,
        y: data.y,
      });
    });

    // Handle tile capture request
    socket.on('capture', async (data: { tileId: string; userId: string }) => {
      const { tileId, userId } = data;

      // Rate limit per user: max 1 click per 350ms
      const userRateKey = `rate:user:${userId}`;
      const isRateLimited = await redisClient.get(userRateKey);
      if (isRateLimited) {
        socket.emit('capture_failed', { tileId, error: 'Cooldown active: please wait' });
        return;
      }

      // Acquire lock for this tile
      const lockAcquired = await acquireLock(tileId, 1000);
      if (!lockAcquired) {
        socket.emit('capture_failed', { tileId, error: 'Tile conflict: capture in progress' });
        return;
      }

      try {
        // Set user rate limit
        await redisClient.set(userRateKey, '1', { PX: 350 });

        // Get current tile data from Redis
        const tileJson = await redisClient.hGet('grid:tiles', tileId);
        if (!tileJson) {
          socket.emit('capture_failed', { tileId, error: 'Tile not found' });
          return;
        }

        const tile = JSON.parse(tileJson);

        // Check tile cooldown: 5 seconds lock
        const now = Date.now();
        const lastUpdated = new Date(tile.updatedAt).getTime();
        if (tile.ownerId && now - lastUpdated < 5000) {
          socket.emit('capture_failed', { tileId, error: 'Tile is locked in cooldown' });
          return;
        }

        // Fetch user from DB to verify details and score
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          socket.emit('capture_failed', { tileId, error: 'User session expired' });
          return;
        }

        // Calculate Combo System
        const comboKey = `combo:user:${userId}`;
        const lastCaptureKey = `last_capture:user:${userId}`;
        
        let combo = 1;
        const lastCaptureData = await redisClient.get(lastCaptureKey);
        
        if (lastCaptureData) {
          const lastCap = JSON.parse(lastCaptureData);
          const timeSinceLast = now - lastCap.time;
          
          // Check adjacency (horizontal, vertical, or diagonal distance <= 1)
          const [curX, curY] = tileId.split(',').map(Number);
          const [lastX, lastY] = lastCap.tileId.split(',').map(Number);
          const isAdjacent = Math.abs(curX - lastX) <= 1 && Math.abs(curY - lastY) <= 1;

          if (isAdjacent && timeSinceLast < 3000) {
            const currentCombo = await redisClient.incr(comboKey);
            combo = currentCombo;
            // Cap combo multipliers
            if (combo > 10) combo = 10;
          } else {
            await redisClient.set(comboKey, 1);
            combo = 1;
          }
        } else {
          await redisClient.set(comboKey, 1);
          combo = 1;
        }

        // Update last capture record (expires in 4s to clear combos)
        await redisClient.set(lastCaptureKey, JSON.stringify({ tileId, time: now }), { EX: 4 });

        // Update score calculations (1 base point * combo multiplier)
        const scoreGain = combo;
        const oldOwnerId = tile.ownerId;
        const newCaptureCount = tile.captureCount + 1;

        // Perform Database updates synchronously inside a transaction to ensure safety
        const results = await prisma.$transaction([
          prisma.tile.update({
            where: { id: tileId },
            data: { ownerId: userId, captureCount: newCaptureCount },
          }),
          prisma.history.create({
            data: {
              tileId,
              oldOwnerId,
              newOwnerId: userId,
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { score: { increment: scoreGain } },
          }),
          prisma.history.findFirst({
            where: { tileId },
            orderBy: { timestamp: 'desc' },
            include: {
              oldOwner: true,
              newOwner: true,
            },
          }),
        ]);

        const updatedUser = results[2] as any;
        const historyRecord = results[3] as any;

        // If tile had previous owner, reduce their score slightly? Or keep simple score increment
        // Let's keep it simple: scores only go up!

        const tileUpdate = {
          id: tileId,
          ownerId: userId,
          username: user.username,
          avatar: user.avatar,
          color: user.color,
          updatedAt: new Date(now).toISOString(),
          captureCount: newCaptureCount,
        };

        // Cache update in Redis
        await redisClient.hSet('grid:tiles', tileId, JSON.stringify(tileUpdate));

        // Update User info in Redis Cache
        const updatedUserCache = {
          id: userId,
          username: user.username,
          avatar: user.avatar,
          color: user.color,
          score: updatedUser.score,
          socketId: socket.id,
        };
        await redisClient.hSet('online:users:data', userId, JSON.stringify(updatedUserCache));

        // Emit successful capture
        io.emit('capture_success', {
          tile: tileUpdate,
          combo,
          scoreGain,
          history: {
            id: historyRecord?.id,
            tileId,
            timestamp: historyRecord?.timestamp,
            oldOwnerName: historyRecord?.oldOwner?.username || null,
            newOwnerName: historyRecord?.newOwner?.username || null,
          },
        });

        // Check Achievements
        await checkAndTriggerAchievements(io, socket, userId, updatedUser.score, newCaptureCount, combo, tileId);

        // Recalculate 5x5 Region ownership
        await checkTerritoryControl(io, tileId, userId, user.color);

        // Broadcast leaderboard
        await broadcastLeaderboard(io);

      } catch (err) {
        console.error('Error during tile capture:', err);
        socket.emit('capture_failed', { tileId, error: 'Database transaction error' });
      } finally {
        await releaseLock(tileId);
      }
    });

    // Handle manual disconnect or leaving
    socket.on('disconnect', async () => {
      const activeUser = activeSockets.get(socket.id);
      if (activeUser) {
        const { userId, username } = activeUser;
        activeSockets.delete(socket.id);

        // Remove from Redis presence
        await redisClient.sRem('online:users', userId);
        await redisClient.hDel('online:users:data', userId);

        // Broadcast updated presence list
        await broadcastPresence(io);
        console.log(`User left: ${username} (${userId})`);
      }
    });
  });
}

// Presence broadcaster helper
async function broadcastPresence(io: Server) {
  const onlineIds = await redisClient.sMembers('online:users');
  const presenceList = [];
  
  if (onlineIds.length > 0) {
    const usersData = await redisClient.hmGet('online:users:data', onlineIds);
    for (const data of usersData) {
      if (data) {
        presenceList.push(JSON.parse(data));
      }
    }
  }

  io.emit('presence_update', {
    count: presenceList.length,
    users: presenceList,
  });
}

// Leaderboard broadcaster helper
export async function broadcastLeaderboard(io: Server) {
  const topUsers = await prisma.user.findMany({
    orderBy: { score: 'desc' },
    take: 10,
    select: {
      id: true,
      username: true,
      avatar: true,
      color: true,
      score: true,
    },
  });

  io.emit('leaderboard_update', topUsers);
}

// Recalculates ownership of 5x5 block region
async function checkTerritoryControl(io: Server, tileId: string, userId: string, userColor: string) {
  const [tx, ty] = tileId.split(',').map(Number);
  
  // A 5x5 region boundary: 
  const regionX = Math.floor(tx / 5);
  const regionY = Math.floor(ty / 5);
  const regionId = `${regionX},${regionY}`;

  // Fetch all tiles in this region from Redis
  const regionTiles: string[] = [];
  for (let x = regionX * 5; x < (regionX + 1) * 5; x++) {
    for (let y = regionY * 5; y < (regionY + 1) * 5; y++) {
      regionTiles.push(`${x},${y}`);
    }
  }

  const cachedTiles = await redisClient.hmGet('grid:tiles', regionTiles);
  
  // Count owner frequencies
  const ownerCounts: Record<string, number> = {};
  for (const tJson of cachedTiles) {
    if (tJson) {
      const tile = JSON.parse(tJson);
      if (tile.ownerId) {
        ownerCounts[tile.ownerId] = (ownerCounts[tile.ownerId] || 0) + 1;
      }
    }
  }

  // Determine majority (requires >= 13 of 25 tiles)
  let majorityOwnerId: string | null = null;
  for (const [ownerId, count] of Object.entries(ownerCounts)) {
    if (count >= 13) {
      majorityOwnerId = ownerId;
      break;
    }
  }

  // Retrieve current region status from Redis cache
  const regionStatusKey = `region:${regionId}`;
  const currentOwner = await redisClient.get(regionStatusKey);

  if (majorityOwnerId && majorityOwnerId !== currentOwner) {
    // Control has changed!
    await redisClient.set(regionStatusKey, majorityOwnerId);
    
    // Broadcast region control update
    io.emit('territory_update', {
      regionId,
      ownerId: majorityOwnerId,
      color: userColor,
    });
  } else if (!majorityOwnerId && currentOwner) {
    // Control lost (no majority)
    await redisClient.del(regionStatusKey);
    io.emit('territory_update', {
      regionId,
      ownerId: null,
      color: null,
    });
  }
}

// Evaluates and pushes user achievements
async function checkAndTriggerAchievements(
  io: Server,
  socket: Socket,
  userId: string,
  score: number,
  captureCount: number,
  combo: number,
  tileId: string
) {
  const achievements = [];

  // First Blood: first capture overall for this user
  if (captureCount === 1) {
    achievements.push({
      id: 'first_blood',
      title: 'First Blood',
      description: 'Captured your first grid tile!',
    });
  }

  // Explorer: capture a tile with capture count >= 5 (i.e. highly contested)
  if (captureCount >= 5) {
    achievements.push({
      id: 'explorer',
      title: 'Explorer',
      description: 'Captured a tile fought over 5 times!',
    });
  }

  // Dominating: Combo level >= 5
  if (combo >= 5) {
    achievements.push({
      id: 'dominating',
      title: 'Dominating',
      description: 'Reached a 5x capture combo!',
    });
  }

  // Legend: Combo level 10
  if (combo === 10) {
    achievements.push({
      id: 'legend',
      title: 'Legend',
      description: 'Unleashed a legendary 10x combo!',
    });
  }

  // King: High score threshold
  if (score >= 250) {
    achievements.push({
      id: 'king',
      title: 'Grid King',
      description: 'Surpassed 250 control points!',
    });
  }

  // Trigger toasts / achievements events
  for (const ach of achievements) {
    const key = `achievement:${userId}:${ach.id}`;
    const alreadyUnlocked = await redisClient.get(key);
    if (!alreadyUnlocked) {
      await redisClient.set(key, 'unlocked');
      
      // Emit back to socket only
      socket.emit('achievement_unlocked', ach);
      
      // Broadcast toast notification to everyone
      io.emit('system_notification', {
        message: `${activeSockets.get(socket.id)?.username} unlocked achievement: ${ach.title}!`,
        type: 'achievement',
      });
    }
  }
}
