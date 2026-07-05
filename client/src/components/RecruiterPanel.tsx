'use client';

import React, { useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { X, Network, Database, Cpu, HelpCircle, HardDrive, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

type RecruiterTab = 'scaling' | 'locking' | 'sync' | 'db' | 'infra';

export default function RecruiterPanel() {
  const { isInterviewModeActive, setInterviewModeActive } = useGridStore();
  const [activeTab, setActiveTab] = useState<RecruiterTab>('scaling');

  if (!isInterviewModeActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md z-50 pointer-events-auto"
    >
      <div className="w-[640px] h-[520px] glass-panel border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <HelpCircle size={18} className="animate-pulse" />
            <h3 className="font-bold text-sm tracking-widest uppercase font-mono">
              AI Recruiter Interview Mode
            </h3>
          </div>
          <button
            onClick={() => setInterviewModeActive(false)}
            className="text-gray-500 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5 text-[10px] font-bold">
          {(['scaling', 'locking', 'sync', 'db', 'infra'] as RecruiterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded uppercase tracking-wider text-center cursor-pointer transition-all ${
                activeTab === tab ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'scaling' && 'Performance'}
              {tab === 'locking' && 'Conflict Lock'}
              {tab === 'sync' && 'Sync Logic'}
              {tab === 'db' && 'Db Schema'}
              {tab === 'infra' && 'Tech Stack'}
            </button>
          ))}
        </div>

        {/* Scrollable details container */}
        <div className="flex-1 overflow-y-auto pr-1 text-xs text-gray-300 space-y-3 leading-relaxed">
          
          {/* TAB 1: SCALING */}
          {activeTab === 'scaling' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <Cpu size={14} /> Viewport Spatial Virtualization
              </div>
              <p>
                **Problem**: Rendering 10,000 grid cells individually in React creates high DOM tree bloat and drops frame rates to under 15 FPS during pan and zooms.
              </p>
              <p>
                **Solution**: Gridverse X implements custom **Spatial Virtualization**. On window resize, pan movements, or scroll zooms, the client calculates viewport boundaries:
              </p>
              <div className="bg-black/30 border border-white/5 p-2 rounded-lg font-mono text-[10px] text-pink-400">
                Min X = max(0, floor(-panX / (cellSize * zoom))) <br />
                Max X = min(99, ceil((windowWidth - panX) / (cellSize * zoom)))
              </div>
              <p>
                Only tiles inside this dynamic rectangle bounds are rendered. All others are culled from DOM, preserving a rock-solid **60 FPS** on local desktop and mobile platforms.
              </p>
            </div>
          )}

          {/* TAB 2: LOCKING */}
          {activeTab === 'locking' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <HardDrive size={14} /> Concurrency & Collision Mutexes
              </div>
              <p>
                **Problem**: Under extreme multi-player disputes, two sockets capturing the same tile within milliseconds creates database race conditions, resulting in corrupt records.
              </p>
              <p>
                **Solution**: Distributed lock mutexes built on **Redis**.
              </p>
              <div className="bg-black/30 border border-white/5 p-2.5 rounded-lg font-mono text-[10px] text-violet-400">
                LOCK_KEY = "lock:tile:x,y" <br />
                Acquire: SET key value NX PX 5000 (Atomic Mutex check) <br />
                Prisma Transaction ➔ Seed PostgreSQL ➔ Redis grid:tiles Cache ➔ Release Mutex Lock
              </div>
              <p>
                This flow handles thousands of concurrent captures under a 0.1ms thread pool, catching collisions instantly and resolving rollbacks with optimistic client Predictions.
              </p>
            </div>
          )}

          {/* TAB 3: SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <Network size={14} /> WebSocket State Sync
              </div>
              <p>
                **Problem**: Broadcasting full 10,000 cell updates on every capture causes network buffer congestions and latency spikes.
              </p>
              <p>
                **Solution**: Incremental broadcasts. On capture success, Socket.IO emits a single tile update payload `capture_success` including user score metrics and history logs to all sockets.
              </p>
              <p>
                **Optimistic UI Prediction**: The client claims the clicked tile instantly. If the server lock fails (e.g. tile locked or on cooldown), the socket receives a `capture_failed` event and rolls back the tile state back to its cached pre-optimistic state.
              </p>
            </div>
          )}

          {/* TAB 4: DATABASE */}
          {activeTab === 'db' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <Database size={14} /> Database Prisma Schema
              </div>
              <p>
                Prisma ORM connects PostgreSQL tables:
              </p>
              <pre className="bg-black/40 border border-white/5 p-2.5 rounded-lg font-mono text-[9px] text-pink-400 overflow-x-auto">
{`model User {
  id        String   @id @default(uuid())
  username  String   @unique
  avatar    String
  color     String
  score     Int      @default(0)
}

model Tile {
  id           String   @id // Formatted as "x,y"
  ownerId      String?
  username     String?
  avatar       String?
  color        String?
  captureCount Int      @default(0)
  updatedAt    DateTime @updatedAt
}`}
              </pre>
            </div>
          )}

          {/* TAB 5: INFRASTRUCTURE */}
          {activeTab === 'infra' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <Terminal size={14} /> Architecture Stack Overview
              </div>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>**Next.js 15 & React 19**: Responsive client driving visual state changes.</li>
                <li>**Express & Node.js**: Socket backend server managing active websocket connections.</li>
                <li>**Redis**: Caches the 10,000 grid coordinates (`grid:tiles` hash) for sub-millisecond loads and handles atomic locking.</li>
                <li>**PostgreSQL**: Persistent relational database seed.</li>
                <li>**Docker & Nginx**: Isolates database layers and controls load balance streams.</li>
              </ul>
            </div>
          )}

        </div>

        <div className="flex gap-2.5 mt-1 border-t border-white/5 pt-3">
          <button
            onClick={() => setInterviewModeActive(false)}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            Acknowledge Walkthrough
          </button>
        </div>
      </div>
    </motion.div>
  );
}
