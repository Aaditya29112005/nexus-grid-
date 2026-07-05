'use client';

import React, { useEffect, useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { Play, Pause, RotateCcw, MonitorPlay, Eye } from 'lucide-react';

export default function HistoryReplay() {
  const {
    history,
    isReplayActive,
    replayIndex,
    setReplayActive,
    setReplayIndex,
  } = useGridStore();

  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play interval handler
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && isReplayActive) {
      interval = setInterval(() => {
        if (replayIndex < history.length) {
          setReplayIndex(replayIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, replayIndex, history.length, isReplayActive, setReplayIndex]);

  const toggleReplayMode = () => {
    if (isReplayActive) {
      // Exit Replay Mode
      setReplayActive(false);
      setIsPlaying(false);
    } else {
      // Enter Replay Mode
      setReplayActive(true);
      setReplayIndex(history.length); // Start at latest event
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setReplayIndex(value);
  };

  if (history.length === 0) return null;

  return (
    <div className="glass-panel p-4 rounded-xl flex items-center gap-4 w-full max-w-2xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Replay trigger button */}
      <button
        onClick={toggleReplayMode}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
          isReplayActive
            ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]'
            : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-pink-500/50'
        }`}
      >
        {isReplayActive ? <MonitorPlay size={14} /> : <Eye size={14} />}
        {isReplayActive ? 'Live Board' : 'Replay Board'}
      </button>

      {isReplayActive && (
        <>
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-pink-500/30 cursor-pointer"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => {
                setReplayIndex(0);
                setIsPlaying(false);
              }}
              className="p-1.5 rounded bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-pink-500/30 cursor-pointer"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Timeline Slider */}
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              type="range"
              min={0}
              max={history.length}
              value={replayIndex}
              onChange={handleSliderChange}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-[9px] text-gray-400 font-mono">
              <span>Beginning</span>
              <span className="text-pink-400 font-bold">
                Step {replayIndex} of {history.length}
              </span>
              <span>Present</span>
            </div>
          </div>
        </>
      )}

      {!isReplayActive && (
        <span className="text-xs text-gray-400 font-medium tracking-wide">
          🟢 Multi-player is live. Click replay to see board evolution history.
        </span>
      )}
    </div>
  );
}
