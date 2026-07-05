'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function CinematicIntro() {
  const { isIntroActive, setIntroActive } = useGridStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isLanding, setIsLanding] = useState(false);

  // Scroll listener tracking deltas
  useEffect(() => {
    if (!isIntroActive) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScrollProgress((prev) => {
        const next = Math.min(100, Math.max(0, prev + Math.abs(e.deltaY) * 0.08));
        if (next >= 100 && !isLanding) {
          setIsLanding(true);
          setTimeout(() => {
            setIntroActive(false);
          }, 1200);
        }
        return next;
      });
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isIntroActive, isLanding, setIntroActive]);

  // WebGL/Canvas Starfield + 3D Rotating Globe rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Stars
    interface Star {
      x: number;
      y: number;
      z: number;
      size: number;
    }
    const stars: Star[] = Array.from({ length: 250 }).map(() => ({
      x: (Math.random() - 0.5) * 1000,
      y: (Math.random() - 0.5) * 1000,
      z: Math.random() * 1000,
      size: Math.random() * 1.5 + 0.5,
    }));

    let rotationAngleY = 0;
    let rotationAngleX = 0.3; // fixed slant angle

    const render = () => {
      ctx.fillStyle = '#020008';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Starfield
      for (const star of stars) {
        // move stars closer
        star.z -= 1.5;
        if (star.z <= 0) {
          star.z = 1000;
          star.x = (Math.random() - 0.5) * 1000;
          star.y = (Math.random() - 0.5) * 1000;
        }

        const px = (star.x / star.z) * width + width / 2;
        const py = (star.y / star.z) * height + height / 2;
        const opacity = Math.min(1, (1000 - star.z) / 400);

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
          ctx.fillRect(px, py, star.size, star.size);
        }
      }

      // 2. Draw 3D Rotating Globe
      // Globe size scales up based on scroll progress
      const baseRadius = 180;
      const zoomScale = 1 + (scrollProgress / 100) * 12; // massive zoom out to fill screen
      const radius = baseRadius * zoomScale;

      rotationAngleY += 0.005 + (scrollProgress / 100) * 0.02; // spin faster as it approaches

      // Draw Grid Lines (Latitudes and Longitudes) in 3D
      const numLines = 15;
      const points: { x: number; y: number; z: number }[] = [];

      ctx.strokeStyle = `rgba(236, 72, 153, ${Math.max(0.1, 0.45 - scrollProgress / 100)})`; // fade out wireframe on entry
      ctx.lineWidth = 1;

      // Projecting spherical to cartesian coords, rotating, then projection to 2D
      for (let i = 0; i < numLines; i++) {
        const lat = (Math.PI / numLines) * i - Math.PI / 2;
        for (let j = 0; j < numLines * 2; j++) {
          const lon = (Math.PI / numLines) * j;

          // Cartesian
          const x = radius * Math.cos(lat) * Math.cos(lon);
          const y = radius * Math.sin(lat);
          const z = radius * Math.cos(lat) * Math.sin(lon);

          // Rotate Y
          const cosY = Math.cos(rotationAngleY);
          const sinY = Math.sin(rotationAngleY);
          let rx = x * cosY - z * sinY;
          let rz = x * sinY + z * cosY;

          // Rotate X (slant tilt)
          const cosX = Math.cos(rotationAngleX);
          const sinX = Math.sin(rotationAngleX);
          let ry = y * cosX - rz * sinX;
          rz = y * sinX + rz * cosX;

          // Perspective scaling
          const fov = 800;
          const scale = fov / (fov + rz);

          // Orthographic / perspective 2D screen coordinates
          const screenX = rx * scale + width / 2;
          const screenY = ry * scale + height / 2;

          // Only draw points facing forward (z-index >= 0) to look 3D spherical
          if (rz > -120) {
            points.push({ x: screenX, y: screenY, z: rz });
          }
        }
      }

      // Draw wireframe nodes connections
      ctx.beginPath();
      for (let k = 0; k < points.length; k++) {
        const p = points[k];
        if (k % numLines !== 0) {
          ctx.lineTo(p.x, p.y);
        } else {
          ctx.moveTo(p.x, p.y);
        }
      }
      ctx.stroke();

      // Atmospheric glow border aura
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        radius * 0.85,
        width / 2,
        height / 2,
        radius * 1.15
      );
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
      grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.25)');
      grad.addColorStop(1, 'rgba(2, 0, 8, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw glowing core target city dot representing our landing site (e.g. India center)
      // Project central target coord
      const tx = radius * Math.cos(0.2) * Math.cos(rotationAngleY);
      const ty = radius * Math.sin(0.2);
      const tz = radius * Math.cos(0.2) * Math.sin(rotationAngleY);
      // Perspective check
      if (tz > -50) {
        const scale = 800 / (800 + tz);
        const dotX = tx * scale + width / 2;
        const dotY = ty * scale + height / 2;
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [scrollProgress]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex flex-col select-none overflow-hidden bg-[#020008]">
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* Cinematic Titles Overlay */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col gap-3 pointer-events-none">
        <h1 className="font-black text-4xl tracking-[0.45em] uppercase text-white drop-shadow-[0_4px_12px_rgba(236,72,153,0.3)] bg-gradient-to-r from-cyan-400 via-white to-pink-500 bg-clip-text text-transparent">
          Gridverse X
        </h1>
        <span className="text-[10px] tracking-[0.3em] uppercase text-pink-400 font-mono">
          Collaborative AI Territory
        </span>
      </div>

      {/* Scroll indicator overlay */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-cyan-400 font-mono animate-pulse">
          Scroll Down to Enter Atmosphere
        </div>
        <div className="w-1 h-14 bg-white/10 rounded-full overflow-hidden">
          <div
            className="w-full bg-cyan-400 transition-all duration-300"
            style={{ height: `${scrollProgress}%` }}
          />
        </div>
      </div>

      {/* Clouds separating overlay curtain */}
      <AnimatePresence>
        {isLanding && (
          <>
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#0d091a] to-[#25123d] border-r border-pink-500/20 shadow-2xl z-55"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-[#0d091a] to-[#25123d] border-l border-cyan-500/20 shadow-2xl z-55"
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
