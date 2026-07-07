'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface PreloaderProps {
  onComplete: () => void;
}

export default function HatomPreloader({ onComplete }: PreloaderProps) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const loaded = progress >= 100;
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const portalCanvasRef = useRef<HTMLCanvasElement>(null);

  const phases = [
    'Initializing GridVerse Core OS...',
    'Establishing secure WebSocket channel...',
    'Seeding 10,000 coordinate mutex maps...',
    'Parsing neural connectivity arrays...',
    'Calibrating atmosphere orbital parameters...',
  ];
  const currentPhase = phases[Math.floor((progress / 100) * (phases.length - 0.1))];

  // Set mounted status on client load
  useEffect(() => {
    setMounted(true);
  }, []);

  // Smooth counter counting up
  useEffect(() => {
    if (!mounted) return;
    let start = 0;
    const interval = setInterval(() => {
      start += Math.floor(Math.random() * 4) + 1;
      if (start >= 100) {
        start = 100;
        clearInterval(interval);
      }
      setProgress(start);
    }, 120);

    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) {
    return <div className="fixed inset-0 bg-[#020008] z-60" />;
  }

  // Web Audio opt-in chord synthesis
  const initializeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        // Play soft ambient sub-bass drone
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gainNode = audioCtx.createGain();

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.frequency.setValueAtTime(65, audioCtx.currentTime); // Low C sub-bass
        osc.type = 'sawtooth';

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 3);

        setSoundEnabled(true);
      }
    } catch (err) {
      console.warn('Web Audio opt-in failed:', err);
    }
  };

  // Portal cosmic transition animation
  const handleEnterClick = () => {
    setIsEntering(true);
    initializeSound();

    const canvas = portalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let radius = 10;
    let animId: number;

    const expandPortal = () => {
      ctx.fillStyle = 'rgba(2, 0, 8, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Radial shockwave ripples
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        radius * 0.1,
        width / 2,
        height / 2,
        radius
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.2, 'rgba(0, 240, 255, 0.85)');
      grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
      grad.addColorStop(0.8, 'rgba(236, 72, 153, 0.15)');
      grad.addColorStop(1, 'rgba(2, 0, 8, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      radius += 45;

      if (radius < width * 1.5) {
        animId = requestAnimationFrame(expandPortal);
      } else {
        cancelAnimationFrame(animId);
        onComplete();
      }
    };

    expandPortal();
  };

  return (
    <div className="fixed inset-0 bg-[#020008] z-60 pointer-events-auto flex flex-col items-center justify-between py-12 select-none overflow-hidden font-mono">
      {/* Liquid Shockwave Portal Canvas */}
      {isEntering && (
        <canvas ref={portalCanvasRef} className="absolute inset-0 block z-70" />
      )}

      {/* Top Banner */}
      <div className="text-center z-10 flex flex-col gap-1 items-center">
        <span className="text-[10px] tracking-[0.4em] uppercase text-gray-500 font-bold">
          LOADING 5 PHASES
        </span>
        <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-semibold min-h-[14px]">
          {currentPhase}
        </span>
      </div>

      {/* Center Morphing Logo & Counter */}
      <div className="relative flex flex-col items-center justify-center z-10 w-96 h-96">
        {/* Animated Rotating Egg Frame */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute w-60 h-60 border border-white/5 rounded-[45%_55%_50%_50%_/_50%_50%_50%_50%] pointer-events-none"
        />

        <motion.div
          onClick={loaded ? handleEnterClick : undefined}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className={`w-44 h-44 rounded-full bg-[#020008] border border-cyan-500/10 flex flex-col items-center justify-center relative shadow-[0_0_40px_rgba(0,240,255,0.03)] transition-all duration-300 ${
            loaded ? 'cursor-pointer hover:border-cyan-400/35 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]' : ''
          }`}
          title={loaded ? 'Click to Enter' : undefined}
        >
          {/* Inner Hatom egg-line visual shape */}
          <svg className="w-16 h-16 stroke-white fill-none stroke-[1.5px]" viewBox="0 0 100 100">
            {/* Morphing Egg Outline */}
            <path d="M50,15 C28,45 28,85 50,85 C72,85 72,45 50,15 Z" className="stroke-white/80" />
            {/* Center dividers */}
            <circle cx="50" cy="62" r="16" className="stroke-cyan-400/60" />
            <line x1="30" x2="70" y1="62" y2="62" className="stroke-violet-500/50" />
          </svg>

          {/* Progress Percent Counter */}
          <span className="absolute bottom-6 font-mono text-[11px] font-bold text-gray-400 tracking-[0.25em]">
            {progress}%
          </span>
        </motion.div>

        {/* Sound toggle opt-in circle on the side */}
        {loaded && !isEntering && (
          <div
            className="absolute left-[-110px] flex flex-col items-center gap-1.5 cursor-pointer group animate-fade-in"
            onClick={initializeSound}
          >
            <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-xs text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all font-bold duration-300">
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </div>
            <span className="text-[7px] text-gray-500 uppercase tracking-widest text-center">
              {soundEnabled ? 'Sound Active' : 'Click for sound'}
            </span>
          </div>
        )}
      </div>

      {/* Enter Game CTA Button */}
      <div className="text-center z-10 min-h-[60px] flex flex-col items-center justify-center">
        {loaded ? (
          <button
            onClick={handleEnterClick}
            className="px-8 py-3 rounded-full border border-cyan-400/20 bg-cyan-400/5 hover:bg-cyan-400/15 text-white hover:text-cyan-300 font-bold text-xs tracking-[0.35em] uppercase cursor-pointer hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-300 font-mono animate-pulse"
          >
            CLICK TO ENTER
          </button>
        ) : (
          <span className="text-[9px] text-gray-500 tracking-[0.3em] uppercase animate-pulse">
            ESTABLISHING ORBIT
          </span>
        )}
      </div>

      {/* Bottom headphones recommended badge */}
      <div className="text-center z-10 flex flex-col gap-1.5 items-center">
        <span className="text-[9px] tracking-[0.25em] text-gray-600 uppercase">
          HEADPHONES RECOMMENDED
        </span>
      </div>
    </div>
  );
}
