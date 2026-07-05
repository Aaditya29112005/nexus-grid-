'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGridStore } from '../store/useGridStore';
import { Wifi, Users, LayoutGrid, Award, Activity } from 'lucide-react';

export default function TopBar() {
  const {
    user,
    tiles,
    presenceList,
    latency,
    connected,
    isHeatmapMode,
    setHeatmapMode,
    weather,
    setWeather,
    currentUniverse,
    setUniverse,
    timeOfDay,
    setTimeOfDay,
  } = useGridStore();

  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(Date.now());

  // Real-time FPS Tracker
  useEffect(() => {
    let animationFrameId: number;

    const calculateFps = () => {
      frameCount.current += 1;
      const now = Date.now();
      const delta = now - lastFpsUpdate.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastFpsUpdate.current = now;
      }
      animationFrameId = requestAnimationFrame(calculateFps);
    };

    animationFrameId = requestAnimationFrame(calculateFps);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Compute stats reactively
  const activeUsersCount = presenceList.length;

  const capturedCount = Object.values(tiles).filter(
    (tile) => tile.ownerId === user?.id
  ).length;

  // Compute Rank based on presence list scores
  const getRank = () => {
    if (!user) return '-';
    const sorted = [...presenceList].sort((a, b) => b.score - a.score);
    const myIndex = sorted.findIndex((p) => p.id === user.id);
    return myIndex === -1 ? sorted.length + 1 : myIndex + 1;
  };

  return (
    <header className="h-16 w-full glass-panel border-b border-white/5 flex items-center justify-between px-6 shadow-md z-30">
      {/* Brand logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-sm tracking-widest shadow-[0_0_12px_rgba(236,72,153,0.3)]">
          N
        </div>
        <span className="font-black text-sm tracking-[0.2em] bg-gradient-to-r from-white via-white to-pink-400 bg-clip-text text-transparent">
          NEXUS GRID
        </span>
      </div>

      {/* Info status items */}
      <div className="flex items-center gap-6 text-xs font-semibold">
        {/* Latency */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <Wifi size={14} className={connected ? 'text-green-400' : 'text-red-500'} />
          <span className="text-gray-400">Ping:</span>
          <span className="font-mono text-white">{connected ? `${latency}ms` : 'offline'}</span>
        </div>

        {/* Players Online */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <Users size={14} className="text-cyan-400" />
          <span className="text-gray-400">Online:</span>
          <span className="font-mono text-white">{activeUsersCount}</span>
        </div>

        {/* Captured Tiles */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <LayoutGrid size={14} className="text-pink-400" />
          <span className="text-gray-400">Captured:</span>
          <span className="font-mono text-pink-400 font-bold">{capturedCount}</span>
        </div>

        {/* Rank */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <Award size={14} className="text-yellow-500" />
          <span className="text-gray-400">Rank:</span>
          <span className="font-mono text-yellow-500 font-bold">#{getRank()}</span>
        </div>

        {/* FPS */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <Activity size={14} className="text-green-400 animate-pulse" />
          <span className="text-gray-400">FPS:</span>
          <span className="font-mono text-white">{fps}</span>
        </div>
      </div>

      {/* Right-aligned Section: Controls & User Profile */}
      <div className="flex items-center gap-6">
        {/* Heatmap & Weather controls */}
        <div className="flex items-center gap-3">
          {/* Heatmap button */}
          <button
            onClick={() => setHeatmapMode(!isHeatmapMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              isHeatmapMode
                ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-pink-500/30'
            }`}
          >
            🔥 Heatmap View
          </button>

          {/* Weather Selector */}
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value as any)}
            className="bg-[#0b0814]/80 border border-white/10 text-gray-300 px-2 py-1.5 rounded-lg text-xs font-bold focus:outline-none cursor-pointer hover:bg-white/5 hover:border-pink-500/30 transition-all"
          >
            <option value="clear">☀️ Clear Sky</option>
            <option value="rain">🌧️ Cyber Rain</option>
            <option value="snow">❄️ Neon Snow</option>
            <option value="glitch">⛈️ Solar Storm</option>
          </select>

          {/* Universe Selector */}
          <select
            value={currentUniverse}
            onChange={(e) => setUniverse(e.target.value as any)}
            className="bg-[#0b0814]/80 border border-white/10 text-gray-300 px-2 py-1.5 rounded-lg text-xs font-bold focus:outline-none cursor-pointer hover:bg-white/5 hover:border-pink-500/30 transition-all font-mono"
            title="Switch Parallel Universes"
          >
            <option value="alpha">🌌 Univ Alpha</option>
            <option value="beta">🔮 Univ Beta</option>
            <option value="gamma">🌀 Univ Gamma</option>
          </select>

          {/* Day / Night cycle */}
          <select
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value as any)}
            className="bg-[#0b0814]/80 border border-white/10 text-gray-300 px-2 py-1.5 rounded-lg text-xs font-bold focus:outline-none cursor-pointer hover:bg-white/5 hover:border-pink-500/30 transition-all"
            title="Set Cycle Time"
          >
            <option value="morning">🌅 Morning</option>
            <option value="noon">☀️ Noon</option>
            <option value="evening">🌇 Evening</option>
            <option value="night">🌃 Night</option>
          </select>
        </div>

        {/* User profile dropdown indicator */}
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="block text-xs font-bold text-gray-200 truncate max-w-[120px]">
                {user.username}
              </span>
              <span className="text-[10px] text-pink-400 font-bold font-mono">
                {user.score} pts
              </span>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border border-white/10 shadow"
              style={{ background: user.color }}
            >
              {user.avatar}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
