'use client';

import React, { useEffect, useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { Play, Pause, RotateCcw, MonitorPlay, Eye, Radio } from 'lucide-react';

export default function HistoryReplay() {
  const {
    history,
    isReplayActive,
    replayIndex,
    setReplayActive,
    setReplayIndex,
    docModeActive,
    setDocModeActive,
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
      }, docModeActive ? 1500 : 200); // Slower updates during documentary narration to read text
    }
    return () => clearInterval(interval);
  }, [isPlaying, replayIndex, history.length, isReplayActive, setReplayIndex, docModeActive]);

  const toggleReplayMode = () => {
    if (isReplayActive) {
      setReplayActive(false);
      setIsPlaying(false);
      setDocModeActive(false);
    } else {
      setReplayActive(true);
      setReplayIndex(history.length); // Start at latest event
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setReplayIndex(value);
  };

  // Generate documentary subtitle narrative
  const getDocSubtitle = () => {
    if (replayIndex === 0) return 'Before time, the board was clear, waiting for the first explorers...';
    const currentEvent = history[Math.min(replayIndex - 1, history.length - 1)];
    if (!currentEvent) return '';
    
    const sectorX = Math.floor(parseInt(currentEvent.tileId.split(',')[0], 10) / 10);
    const sectorY = Math.floor(parseInt(currentEvent.tileId.split(',')[1], 10) / 10);
    const sectorChar = String.fromCharCode(65 + (sectorX % 26));

    return `At ${new Date(currentEvent.timestamp).toLocaleTimeString()}, the frontiers changed. ${
      currentEvent.newOwnerName
    } successfully claimed sector coordinates ${currentEvent.tileId} (Sector ${sectorChar}${sectorY}). ${
      currentEvent.oldOwnerName
        ? `The reign of ${currentEvent.oldOwnerName} came to an end.`
        : 'This marks their initial conquest.'
    }`;
  };

  if (history.length === 0) return null;

  return (
    <div className="relative flex flex-col gap-3.5 items-center pointer-events-auto">
      
      {/* Narrative Subtitle Layer */}
      {docModeActive && isReplayActive && (
        <div className="w-[450px] bg-black/90 border border-cyan-500/20 rounded-xl p-3 text-center text-xs text-cyan-200/90 font-mono shadow-[0_0_25px_rgba(6,182,212,0.15)] leading-relaxed transition-all duration-300">
          <div className="flex items-center gap-1.5 justify-center text-[9px] text-cyan-400 uppercase tracking-widest font-black mb-1">
            <Radio size={10} className="animate-pulse" />
            AI Historical Narrator
          </div>
          "{getDocSubtitle()}"
        </div>
      )}

      {/* Main Control Panel */}
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

              {/* AI Documentary Mode button */}
              <button
                onClick={() => setDocModeActive(!docModeActive)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-300 ${
                  docModeActive
                    ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
                title="AI Documentary narrations"
              >
                🎙️ AI Doc Mode
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
    </div>
  );
}
