'use client';

import React from 'react';
import { useGridStore } from '../store/useGridStore';
import { Compass, ShieldAlert, Star, Flame, History, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TileDnaDrawer() {
  const { selectedTileId, setSelectedTileId, tiles, history, setSubGridTileId } = useGridStore();

  if (!selectedTileId) return null;

  const tile = tiles[selectedTileId] || {
    id: selectedTileId,
    ownerId: null,
    username: null,
    avatar: null,
    color: null,
    captureCount: 0,
  };

  // Compute Digital Archaeology statistics from history logs
  const tileHistory = history.filter((h) => h.tileId === selectedTileId);
  const battleCount = tile.captureCount || tileHistory.length;
  
  const firstOwner = tileHistory.length > 0 ? tileHistory[0].newOwnerName : 'None';
  
  // Calculate unique owners list
  const uniqueOwners = new Set(tileHistory.map((h) => h.newOwnerName));
  const uniqueOwnersCount = uniqueOwners.size;

  // Popularity stars system
  let stars = 1;
  if (battleCount > 30) stars = 5;
  else if (battleCount > 15) stars = 4;
  else if (battleCount > 7) stars = 3;
  else if (battleCount > 2) stars = 2;

  // Heat computation
  const heatLevel = Math.min(100, battleCount * 8);

  // Civilization Evolution Levels
  let civEvolution = '🌱 Grasslands';
  if (battleCount >= 20) civEvolution = '🌌 Cyber City';
  else if (battleCount >= 10) civEvolution = '🏙️ Mega City';
  else if (battleCount >= 5) civEvolution = '🏢 Modern City';
  else if (battleCount >= 2) civEvolution = '🏡 Rural Village';

  // Stability calculations (based on owner ratio over battles)
  let stability = 100;
  let stabilityStatus = 'Loyal Citizens 🤝';
  let stabilityColor = 'text-green-400';

  if (battleCount > 0) {
    const ownerVolatility = uniqueOwnersCount / battleCount;
    if (ownerVolatility >= 0.75) {
      stability = 8;
      stabilityStatus = 'Rebellious Anarchy ⚔️';
      stabilityColor = 'text-red-500 animate-pulse';
    } else if (ownerVolatility >= 0.5) {
      stability = 32;
      stabilityStatus = 'Hostile Strikes 🛡️';
      stabilityColor = 'text-orange-500';
    } else if (ownerVolatility >= 0.25) {
      stability = 68;
      stabilityStatus = 'Minor Rioting 📢';
      stabilityColor = 'text-yellow-500';
    }
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-20 right-70 w-80 glass-panel border border-white/5 rounded-xl p-4 flex flex-col gap-4 shadow-2xl z-30"
    >
      {/* Title Drawer Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2 text-pink-400">
          <Compass size={16} />
          <h3 className="font-bold text-sm font-mono tracking-widest uppercase">
            Tile DNA #{selectedTileId}
          </h3>
        </div>
        <button
          onClick={() => setSelectedTileId(null)}
          className="text-gray-500 hover:text-white transition-all cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* DNA parameters grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[9px] text-gray-500 uppercase font-semibold">Total Battles</span>
          <span className="font-black text-pink-400 font-mono text-sm mt-0.5">
            {battleCount}
          </span>
        </div>
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[9px] text-gray-500 uppercase font-semibold">Unique Owners</span>
          <span className="font-black text-cyan-400 font-mono text-sm mt-0.5">
            {uniqueOwnersCount}
          </span>
        </div>
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[9px] text-gray-500 uppercase font-semibold">First Owner</span>
          <span className="font-semibold text-gray-300 truncate mt-0.5">
            {firstOwner}
          </span>
        </div>
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[9px] text-gray-500 uppercase font-semibold">Popularity</span>
          <span className="font-bold text-yellow-500 flex items-center gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={10}
                fill={i < stars ? '#eab308' : 'none'}
                className={i < stars ? 'text-yellow-500' : 'text-gray-600'}
              />
            ))}
          </span>
        </div>
        
        {/* Civ Evolution Stage */}
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col col-span-2">
          <span className="text-[9px] text-gray-500 uppercase font-semibold">AI Civilization tier</span>
          <span className="font-bold text-gray-200 mt-0.5">
            {civEvolution}
          </span>
        </div>

        {/* Civ Rebellion Stability */}
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col col-span-2">
          <span className="text-[9px] text-gray-500 uppercase font-semibold">Civilization Stability</span>
          <span className={`font-bold text-[11px] mt-0.5 ${stabilityColor}`}>
            {stability}% - {stabilityStatus}
          </span>
        </div>
      </div>

      {/* Heat Bar gauge */}
      <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-2.5 rounded">
        <div className="flex justify-between text-xs items-center">
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <Flame size={12} className="text-orange-500" /> Heat Status
          </span>
          <span className="font-bold font-mono text-orange-500">{heatLevel}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
            style={{ width: `${heatLevel}%` }}
          />
        </div>
      </div>

      {/* Fractal Zoom Button */}
      <button
        onClick={() => setSubGridTileId(selectedTileId)}
        className="w-full bg-cyan-600/90 hover:bg-cyan-500 hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] text-white text-[10px] font-black uppercase tracking-wider py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-cyan-500/20"
      >
        🔍 Zoom Fractal Sub-Grid
      </button>

      {/* Dig Archaeology timeline tree */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 border-b border-white/5 pb-1">
          <History size={12} />
          <span className="font-bold">Dig Chronological Path</span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 flex flex-col">
          {tileHistory.map((log, index) => (
            <div
              key={log.id}
              className="flex items-center gap-2 text-[10px] text-gray-400 group"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold flex items-center justify-center font-mono">
                {index + 1}
              </div>
              <div className="flex-1 truncate">
                <span className="font-semibold text-gray-200">{log.newOwnerName}</span>
                {log.oldOwnerName && (
                  <span className="text-gray-500">
                    {' '}
                    took from <span className="line-through">{log.oldOwnerName}</span>
                  </span>
                )}
              </div>
            </div>
          ))}

          {tileHistory.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-[10px]">
              No digital trace registered on database.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
