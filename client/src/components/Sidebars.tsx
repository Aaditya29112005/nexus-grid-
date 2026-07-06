'use client';

import React from 'react';
import { useGridStore, HistoryEvent } from '../store/useGridStore';
import { ChevronLeft, ChevronRight, Award, History, Clock } from 'lucide-react';

const TILE_SIZE = 40;

export function LeftSidebar() {
  const {
    presenceList,
    user,
    leftSidebarOpen,
    setLeftSidebarOpen,
  } = useGridStore();

  const rankedPlayers = [...presenceList].sort((a, b) => b.score - a.score);

  // Render closed micro sidebar
  if (!leftSidebarOpen) {
    return (
      <div className="w-12 h-full glass-panel border-r border-white/5 flex flex-col items-center py-4 z-20 transition-all duration-300">
        <button
          onClick={() => setLeftSidebarOpen(true)}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:text-white cursor-pointer hover:bg-cyan-500/20"
          title="Open Leaderboard"
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-gray-500 text-[9px] font-bold tracking-[0.3em] uppercase font-mono mt-8 [writing-mode:vertical-lr] text-center select-none">
          Leaderboard
        </span>
      </div>
    );
  }

  return (
    <div className="w-64 h-full glass-panel border-r border-white/5 flex flex-col p-4 shadow-xl z-20 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h2 className="text-sm font-bold bg-gradient-to-r from-pink-500 to-violet-400 bg-clip-text text-transparent tracking-wide">
            LEADERBOARD
          </h2>
        </div>
        <button
          onClick={() => setLeftSidebarOpen(false)}
          className="p-1 rounded bg-white/5 border border-white/10 text-gray-500 hover:text-cyan-400 hover:bg-white/10 cursor-pointer"
          title="Collapse Panel"
        >
          <ChevronLeft size={14} />
        </button>
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
              className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-300 ${
                isMe
                  ? 'bg-pink-500/10 border-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.1)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 text-xs font-bold text-gray-400 flex items-center justify-center">
                  {medal ? medal : rank}
                </div>
                {player.picture ? (
                  <img
                    src={player.picture}
                    alt={player.username}
                    className="w-7 h-7 rounded-full object-cover border border-white/10 shadow"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs border border-white/10 shadow"
                    style={{ background: player.color }}
                  >
                    {player.avatar}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-semibold truncate max-w-[80px] ${isMe ? 'text-pink-400' : 'text-gray-200'}`}>
                    {player.username}
                  </span>
                  <span className="text-[8px] text-gray-500">
                    {isMe ? 'You' : 'Online'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-pink-400 font-mono">
                  {player.score}
                </span>
                <span className="block text-[7px] text-gray-500 uppercase tracking-widest">
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
  const {
    history,
    setViewport,
    viewportZoom,
    viewportW,
    viewportH,
    rightSidebarOpen,
    setRightSidebarOpen,
  } = useGridStore();

  const displayHistory = [...history].reverse();

  const handleLogClick = (tileId: string) => {
    const [x, y] = tileId.split(',').map(Number);
    if (isNaN(x) || isNaN(y)) return;

    const targetX = viewportW / 2 - x * TILE_SIZE * viewportZoom;
    const targetY = viewportH / 2 - y * TILE_SIZE * viewportZoom;
    setViewport(targetX, targetY, viewportZoom);
  };

  // Render closed micro sidebar
  if (!rightSidebarOpen) {
    return (
      <div className="w-12 h-full glass-panel border-l border-white/5 flex flex-col items-center py-4 z-20 transition-all duration-300">
        <button
          onClick={() => setRightSidebarOpen(true)}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:text-white cursor-pointer hover:bg-cyan-500/20"
          title="Open History"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-gray-500 text-[9px] font-bold tracking-[0.3em] uppercase font-mono mt-8 [writing-mode:vertical-rl] text-center select-none">
          Live History
        </span>
      </div>
    );
  }

  return (
    <div className="w-64 h-full glass-panel border-l border-white/5 flex flex-col p-4 shadow-xl z-20 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <h2 className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent tracking-wide">
            LIVE HISTORY
          </h2>
        </div>
        <button
          onClick={() => setRightSidebarOpen(false)}
          className="p-1 rounded bg-white/5 border border-white/10 text-gray-500 hover:text-cyan-400 hover:bg-white/10 cursor-pointer"
          title="Collapse Panel"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {displayHistory.map((event) => {
          const timestamp = new Date(event.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <div
              key={event.id}
              onClick={() => handleLogClick(event.tileId)}
              className="p-2 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/20 cursor-pointer transition-all flex flex-col gap-1 text-[11px] leading-snug"
            >
              <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono">
                <span className="flex items-center gap-0.5">
                  <Clock size={10} /> {timestamp}
                </span>
                <span className="bg-white/5 px-1 py-0.5 rounded text-gray-400">
                  {event.tileId}
                </span>
              </div>
              <div className="text-gray-300">
                <span
                  className="font-bold mr-1"
                  style={{
                    color: event.color,
                    textShadow: `0 0 5px ${event.color}50`,
                  }}
                >
                  {event.username}
                </span>
                claimed territory.
              </div>
            </div>
          );
        })}

        {displayHistory.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">
            No events recorded yet...
          </div>
        )}
      </div>
    </div>
  );
}
