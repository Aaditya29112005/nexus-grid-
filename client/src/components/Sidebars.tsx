'use client';

import React from 'react';
import { useGridStore, HistoryEvent } from '../store/useGridStore';

const TILE_SIZE = 40;

export function LeftSidebar() {
  const { presenceList, user } = useGridStore();

  // Sort presence list by score descending for ranking
  const rankedPlayers = [...presenceList].sort((a, b) => b.score - a.score);

  return (
    <div className="w-64 h-full glass-panel border-r border-white/5 flex flex-col p-4 shadow-xl z-20">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">🏆</span>
        <h2 className="text-lg font-bold bg-gradient-to-r from-pink-500 to-violet-400 bg-clip-text text-transparent tracking-wide">
          LEADERBOARD
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {rankedPlayers.map((player, index) => {
          const isMe = player.id === user?.id;
          const rank = index + 1;
          
          let medal = '';
          if (rank === 1) medal = '🥇';
          else if (rank === 2) medal = '🥈';
          else if (rank === 3) medal = '🥉';

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-300 ${
                isMe
                  ? 'bg-pink-500/10 border-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.1)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 text-sm font-bold text-gray-400 flex items-center justify-center">
                  {medal ? medal : rank}
                </div>
                {/* Avatar with player's color gradient */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base border border-white/10 shadow"
                  style={{ background: player.color }}
                >
                  {player.avatar}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold truncate max-w-[100px] ${isMe ? 'text-pink-400' : 'text-gray-200'}`}>
                    {player.username}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {isMe ? 'You' : 'Online'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-pink-400 font-mono">
                  {player.score}
                </span>
                <span className="block text-[8px] text-gray-500 uppercase tracking-widest">
                  pts
                </span>
              </div>
            </div>
          );
        })}

        {rankedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">
            Waiting for players...
          </div>
        )}
      </div>
    </div>
  );
}

export function RightSidebar() {
  const { history, setViewport, viewportZoom, viewportW, viewportH } = useGridStore();

  // Reverse list to show recent captures first in logs
  const displayHistory = [...history].reverse();

  const handleLogClick = (tileId: string) => {
    // Parse grid coordinates
    const [x, y] = tileId.split(',').map(Number);
    if (isNaN(x) || isNaN(y)) return;

    // Pan viewport to center on selected tile
    const targetX = viewportW / 2 - x * TILE_SIZE * viewportZoom;
    const targetY = viewportH / 2 - y * TILE_SIZE * viewportZoom;

    setViewport(targetX, targetY, viewportZoom);

    // Briefly pulse the target cell using global event dispatcher or simple styling
    // GridViewport handles coordinate focus natively.
  };

  return (
    <div className="w-64 h-full glass-panel border-l border-white/5 flex flex-col p-4 shadow-xl z-20">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">⏱️</span>
        <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-wide">
          TILE HISTORY
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {displayHistory.slice(0, 50).map((event) => {
          const timeString = new Date(event.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <div
              key={event.id}
              onClick={() => handleLogClick(event.tileId)}
              className="group p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/30 hover:shadow-[0_0_12px_rgba(236,72,153,0.05)] cursor-pointer transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-pink-400 font-mono px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                  Tile {event.tileId}
                </span>
                <span className="text-[9px] text-gray-500 font-mono">
                  {timeString}
                </span>
              </div>
              <div className="text-xs text-gray-300">
                Captured by <span className="font-semibold text-gray-100">{event.newOwnerName}</span>
              </div>
              {event.oldOwnerName && (
                <div className="text-[10px] text-gray-500 mt-1 truncate">
                  Was owned by: <span className="line-through">{event.oldOwnerName}</span>
                </div>
              )}
            </div>
          );
        })}

        {displayHistory.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">
            No captures recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
