'use client';

import React from 'react';
import { useGridStore } from '../store/useGridStore';
import { X, ShieldAlert, Sparkles, Orbit } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FractalZoomSubGrid() {
  const { subGridTileId, setSubGridTileId, subGridTiles, updateSubGridTile, user } = useGridStore();

  if (!subGridTileId) return null;

  // Render 10x10 subgrid coordinates
  const cells = [];
  let claimedCount = 0;

  for (let sx = 0; sx < 10; sx++) {
    for (let sy = 0; sy < 10; sy++) {
      const subId = `${subGridTileId}-${sx},${sy}`;
      const color = subGridTiles[subId] || 'rgba(255, 255, 255, 0.04)';
      if (color !== 'rgba(255, 255, 255, 0.04)') {
        claimedCount++;
      }
      cells.push({ sx, sy, subId, color });
    }
  }

  const handleCellClick = (subId: string) => {
    if (!user) return;
    updateSubGridTile(subId, user.color);
  };

  const energyLevel = claimedCount * 8;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 pointer-events-auto"
    >
      <div className="w-[380px] glass-panel border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-[0_0_50px_rgba(236,72,153,0.15)] relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2 text-cyan-400">
            <Orbit size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
            <h3 className="font-bold text-sm font-mono tracking-widest uppercase">
              Fractal Universe
            </h3>
          </div>
          <button
            onClick={() => setSubGridTileId(null)}
            className="text-gray-500 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <span className="text-[10px] text-gray-400 leading-normal">
          Zoomed into Tile <span className="text-pink-400 font-bold font-mono">#{subGridTileId}</span>. Inside lies a nested 10x10 microcosm. Click cells to build micro-territories.
        </span>

        {/* 10x10 Grid View */}
        <div className="grid grid-cols-10 gap-1 bg-black/40 border border-white/5 p-2 rounded-xl">
          {cells.map(({ subId, color }) => (
            <div
              key={subId}
              onClick={() => handleCellClick(subId)}
              className="aspect-square rounded border border-white/[0.02] cursor-pointer hover:border-pink-500 hover:scale-110 transition-all"
              style={{ background: color }}
            />
          ))}
        </div>

        {/* Stats footer */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase font-semibold">Micro-Cells Claimed</span>
            <span className="font-black text-cyan-400 font-mono text-sm mt-0.5">
              {claimedCount} / 100
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase font-semibold">Quantum Energy</span>
            <span className="font-black text-pink-400 font-mono text-sm mt-0.5 flex items-center gap-1">
              <Sparkles size={11} className="animate-pulse" /> {energyLevel} GW
            </span>
          </div>
        </div>

        <button
          onClick={() => setSubGridTileId(null)}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 rounded-lg text-xs cursor-pointer transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
        >
          Exit Micro-Universe
        </button>
      </div>
    </motion.div>
  );
}
