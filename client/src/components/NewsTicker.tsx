'use client';

import React, { useEffect, useState } from 'react';
import { useGridStore } from '../store/useGridStore';

const DEFAULT_NEWS = [
  '🌐 Welcome to NexusGrid: multiplayer strategy board. Capture territory and coordinate with your squad.',
  '🛰️ Satellites report peaceful expansion in the southern sectors. No conflicts registered.',
  '🔮 Digital archaeologist excavations are now live! Click any tile to inspect its ancestral owner DNA tree.',
  '⛈️ Warning: Solar storm alerts active. High electromagnetic radiation might trigger chromatic screen glitches.'
];

export default function NewsTicker() {
  const { history } = useGridStore();
  const [headline, setHeadline] = useState(DEFAULT_NEWS[0]);
  const [newsIndex, setNewsIndex] = useState(0);

  // Dynamically compile headlines from history captures
  useEffect(() => {
    const compileHeadline = () => {
      if (history.length === 0) {
        // Fallback default headlines
        setHeadline(DEFAULT_NEWS[newsIndex % DEFAULT_NEWS.length]);
        setNewsIndex((prev) => prev + 1);
        return;
      }

      // Pick a random recent history item
      const index = Math.floor(Math.random() * history.length);
      const event = history[index];
      const sectorX = Math.floor(parseInt(event.tileId.split(',')[0], 10) / 10);
      const sectorY = Math.floor(parseInt(event.tileId.split(',')[1], 10) / 10);
      const sectorChar = String.fromCharCode(65 + (sectorX % 26)); // A-Z sectors

      const templates = [
        `📰 BREAKING: ${event.newOwnerName} captured tile ${event.tileId} in Sector ${sectorChar}${sectorY}!`,
        `⚔️ SECTOR WAR: Contest detected in Sector ${sectorChar}${sectorY} between players!`,
        `👑 TERRITORY GAIN: Civilization expanding rapidly in the Sector ${sectorChar} domains.`,
        `✨ NEWS: First owners database updated. archaeological artifacts discovered on tile ${event.tileId}.`
      ];

      // Blend templates with default static news for variety
      const roll = Math.random();
      if (roll < 0.6) {
        setHeadline(templates[Math.floor(Math.random() * templates.length)]);
      } else {
        setHeadline(DEFAULT_NEWS[Math.floor(Math.random() * DEFAULT_NEWS.length)]);
      }
    };

    // Cycle news every 5.5 seconds
    compileHeadline();
    const interval = setInterval(compileHeadline, 5500);
    return () => clearInterval(interval);
  }, [history, newsIndex]);

  return (
    <div className="h-8 w-full bg-red-950/20 border-b border-red-500/10 backdrop-blur-md flex items-center px-4 overflow-hidden z-30 select-none">
      {/* Breaking badge */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse mr-4 shadow-[0_0_10px_rgba(220,38,38,0.4)]">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        Breaking
      </div>

      {/* Marquee text container */}
      <div className="flex-1 overflow-hidden relative w-full h-full flex items-center">
        <span className="absolute whitespace-nowrap text-[10px] text-red-200/90 font-mono tracking-wide animate-marquee">
          {headline}
        </span>
      </div>

      {/* Injected CSS for smooth marquee scrolling across viewport */}
      <style jsx>{`
        .animate-marquee {
          animation: marquee-scroll 24s linear infinite;
        }

        @keyframes marquee-scroll {
          0% {
            transform: translate3d(100%, 0, 0);
          }
          100% {
            transform: translate3d(-100%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
