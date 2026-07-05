import { create } from 'zustand';

export interface GridTile {
  id: string; // "x,y"
  ownerId: string | null;
  username: string | null;
  avatar: string | null;
  color: string | null;
  updatedAt: string;
  captureCount: number;
}

export interface PlayerProfile {
  id: string;
  username: string;
  avatar: string;
  color: string;
  score: number;
}

export interface CursorPosition {
  userId: string;
  username: string;
  x: number;
  y: number;
}

export interface HistoryEvent {
  id: string;
  tileId: string;
  timestamp: string;
  oldOwnerName: string | null;
  newOwnerName: string;
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'achievement' | 'alert' | 'info';
}

interface GridStore {
  // Session details
  user: PlayerProfile | null;
  setUser: (profile: PlayerProfile) => void;
  updateUserScore: (score: number) => void;
  
  // Board state
  tiles: Record<string, GridTile>;
  loading: boolean;
  setTiles: (tilesList: GridTile[]) => void;
  updateTile: (tile: GridTile) => void;
  setLoading: (loading: boolean) => void;

  // Active multiplayers
  presenceList: PlayerProfile[];
  setPresenceList: (list: PlayerProfile[]) => void;
  cursors: Record<string, { username: string; x: number; y: number; lastActive: number }>;
  updateCursor: (userId: string, data: { username: string; x: number; y: number }) => void;
  removeCursor: (userId: string) => void;

  // Combos & Cooldowns
  combo: number;
  setCombo: (val: number) => void;
  cooldownTiles: Record<string, number>; // tileId -> timestamp of lock release
  addCooldownTile: (tileId: string, durationMs?: number) => void;
  cleanCooldownTiles: () => void;

  // History & Replays
  history: HistoryEvent[];
  setHistory: (events: HistoryEvent[]) => void;
  addHistoryEvent: (event: HistoryEvent) => void;
  
  // Replay timeline
  isReplayActive: boolean;
  replayIndex: number;
  setReplayActive: (active: boolean) => void;
  setReplayIndex: (index: number) => void;
  getReplayTiles: () => Record<string, Partial<GridTile>>;

  // Network stats
  latency: number;
  setLatency: (lat: number) => void;
  latencySimulatedDelay: number;
  setLatencySimulatedDelay: (delay: number) => void;
  connected: boolean;
  setConnected: (status: boolean) => void;

  // System alerts / notifications
  notifications: SystemNotification[];
  addNotification: (message: string, type: 'achievement' | 'alert' | 'info') => void;
  removeNotification: (id: string) => void;
  
  // Area Control Regions
  regionControl: Record<string, { ownerId: string | null; color: string | null }>;
  updateRegionControl: (regionId: string, ownerId: string | null, color: string | null) => void;

  // Viewport tracking for MiniMap alignment
  viewportX: number;
  viewportY: number;
  viewportZoom: number;
  viewportW: number;
  viewportH: number;
  setViewport: (x: number, y: number, zoom: number) => void;
  setViewportSize: (w: number, h: number) => void;
}

const GRADIENT_POOL = [
  'linear-gradient(135deg, #FF007A, #7B2CBF)', // Pink-Purple
  'linear-gradient(135deg, #00F0FF, #0072FF)', // Cyan-Blue
  'linear-gradient(135deg, #00FF87, #60EFFF)', // Mint-Teal
  'linear-gradient(135deg, #FF416C, #FF4B2B)', // Red-Orange
  'linear-gradient(135deg, #F9D423, #FF4E50)', // Gold-Coral
  'linear-gradient(135deg, #8A2387, #E94057, #F27121)', // Sunset
  'linear-gradient(135deg, #11998e, #38ef7d)', // Emerald
  'linear-gradient(135deg, #3F5EFB, #FC466B)', // Indigo-Rose
  'linear-gradient(135deg, #8E2DE2, #4A00E0)', // Royal Blue
  'linear-gradient(135deg, #00b4db, #0083b0)'  // Ocean Blue
];

const AVATAR_POOL = ['🚀', '👽', '👾', '🤖', '👑', '🔥', '⚡', '🌈', '🔮', '🐱', '🦊', '🦄', '🦁', '🐼', '🐉', '👻'];

export function generateGuestProfile(): PlayerProfile {
  const randomId = Math.random().toString(36).substring(2, 11);
  const randomNum = Math.floor(Math.random() * 1000);
  const name = `GridPilot_${randomNum}`;
  const color = GRADIENT_POOL[Math.floor(Math.random() * GRADIENT_POOL.length)];
  const avatar = AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
  
  return {
    id: randomId,
    username: name,
    avatar,
    color,
    score: 0,
  };
}

export const useGridStore = create<GridStore>((set, get) => ({
  user: null,
  setUser: (profile) => set({ user: profile }),
  updateUserScore: (score) => set((state) => ({
    user: state.user ? { ...state.user, score } : null
  })),

  tiles: {},
  loading: true,
  setTiles: (tilesList) => {
    const tilesMap: Record<string, GridTile> = {};
    for (const t of tilesList) {
      tilesMap[t.id] = t;
    }
    set({ tiles: tilesMap, loading: false });
  },
  updateTile: (tile) => set((state) => ({
    tiles: { ...state.tiles, [tile.id]: tile }
  })),
  setLoading: (loading) => set({ loading }),

  presenceList: [],
  setPresenceList: (list) => set({ presenceList: list }),
  cursors: {},
  updateCursor: (userId, data) => set((state) => ({
    cursors: {
      ...state.cursors,
      [userId]: { ...data, lastActive: Date.now() }
    }
  })),
  removeCursor: (userId) => set((state) => {
    const nextCursors = { ...state.cursors };
    delete nextCursors[userId];
    return { cursors: nextCursors };
  }),

  combo: 1,
  setCombo: (val) => set({ combo: val }),
  cooldownTiles: {},
  addCooldownTile: (tileId, durationMs = 5000) => set((state) => ({
    cooldownTiles: {
      ...state.cooldownTiles,
      [tileId]: Date.now() + durationMs,
    }
  })),
  cleanCooldownTiles: () => set((state) => {
    const now = Date.now();
    const activeCooldowns: Record<string, number> = {};
    for (const [id, until] of Object.entries(state.cooldownTiles)) {
      if (until > now) {
        activeCooldowns[id] = until;
      }
    }
    return { cooldownTiles: activeCooldowns };
  }),

  history: [],
  setHistory: (events) => set({ history: events }),
  addHistoryEvent: (event) => set((state) => {
    // Keep max 500 items in layout history to save memory
    const newHistory = [...state.history, event];
    if (newHistory.length > 500) {
      newHistory.shift();
    }
    return { history: newHistory };
  }),

  isReplayActive: false,
  replayIndex: 0,
  setReplayActive: (active) => set({ isReplayActive: active }),
  setReplayIndex: (index) => set({ replayIndex: index }),
  getReplayTiles: () => {
    const { history, replayIndex, tiles } = get();
    const replayTilesMap: Record<string, Partial<GridTile>> = {};
    
    // Create empty layout
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        const id = `${x},${y}`;
        replayTilesMap[id] = {
          id,
          ownerId: null,
          username: null,
          avatar: null,
          color: null,
          captureCount: 0,
        };
      }
    }

    // Apply history events up to current index
    const eventsToApply = history.slice(0, replayIndex);
    
    // Fetch unique colors/avatars map from database history cache
    // Since history has username details, we mock the color/avatar maps dynamically based on owner names
    const nameColorMap: Record<string, string> = {};
    
    // Fallback coloring map for replay visual variety
    for (const event of eventsToApply) {
      const tileId = event.tileId;
      if (!nameColorMap[event.newOwnerName]) {
        // Deterministic gradient from username code
        let sum = 0;
        for (let i = 0; i < event.newOwnerName.length; i++) {
          sum += event.newOwnerName.charCodeAt(i);
        }
        nameColorMap[event.newOwnerName] = GRADIENT_POOL[sum % GRADIENT_POOL.length];
      }

      const prev = replayTilesMap[tileId];
      replayTilesMap[tileId] = {
        ...prev,
        ownerId: 'replay-user',
        username: event.newOwnerName,
        avatar: '👤',
        color: nameColorMap[event.newOwnerName],
        captureCount: (prev.captureCount || 0) + 1,
      };
    }

    return replayTilesMap;
  },

  latency: 0,
  setLatency: (lat) => set({ latency: lat }),
  latencySimulatedDelay: 0,
  setLatencySimulatedDelay: (delay) => set({ latencySimulatedDelay: delay }),
  connected: false,
  setConnected: (status) => set({ connected: status }),

  notifications: [],
  addNotification: (message, type) => set((state) => {
    const newAlert: SystemNotification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
    };
    return { notifications: [...state.notifications, newAlert] };
  }),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),
  
  regionControl: {},
  updateRegionControl: (regionId, ownerId, color) => set((state) => ({
    regionControl: {
      ...state.regionControl,
      [regionId]: { ownerId, color },
    }
  })),

  // Viewport tracking defaults
  viewportX: 100,
  viewportY: 100,
  viewportZoom: 0.8,
  viewportW: 800,
  viewportH: 600,
  setViewport: (x, y, zoom) => set({ viewportX: x, viewportY: y, viewportZoom: zoom }),
  setViewportSize: (w, h) => set({ viewportW: w, viewportH: h }),
}));
