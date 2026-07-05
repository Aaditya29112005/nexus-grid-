'use client';

import React, { useEffect, useRef } from 'react';
import { useGridStore } from '../store/useGridStore';

export default function WeatherEngine() {
  const { weather, viewportW, viewportH } = useGridStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (weather === 'clear' || weather === 'glitch') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas sizes
    canvas.width = viewportW;
    canvas.height = viewportH;

    let animationId: number;

    // Particle models
    interface RainDrop {
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
    }

    interface SnowFlake {
      x: number;
      y: number;
      radius: number;
      density: number;
      opacity: number;
      swaySpeed: number;
      swayRange: number;
    }

    // Seed structures
    const rainDrops: RainDrop[] = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * viewportW,
      y: Math.random() * viewportH - viewportH,
      length: Math.random() * 20 + 15,
      speed: Math.random() * 8 + 12,
      opacity: Math.random() * 0.3 + 0.1,
    }));

    const snowFlakes: SnowFlake[] = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * viewportW,
      y: Math.random() * viewportH - viewportH,
      radius: Math.random() * 3 + 1.5,
      density: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      swaySpeed: Math.random() * 0.02 + 0.01,
      swayRange: Math.random() * 15 + 5,
    }));

    let time = 0;

    const renderLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 1;

      if (weather === 'rain') {
        ctx.strokeStyle = 'rgba(174, 219, 255, 0.4)';
        ctx.lineWidth = 1.2;

        for (const drop of rainDrops) {
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + 2, drop.y + drop.length); // slight drift angle
          ctx.stroke();

          // Move down
          drop.y += drop.speed;
          drop.x += 0.5;

          // Wrap around
          if (drop.y > viewportH) {
            drop.y = -drop.length;
            drop.x = Math.random() * viewportW;
          }
        }
      } else if (weather === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

        for (const flake of snowFlakes) {
          ctx.beginPath();
          // Adding sway offset via sin function
          const swayX = flake.x + Math.sin(time * flake.swaySpeed) * flake.swayRange;
          ctx.arc(swayX, flake.y, flake.radius, 0, Math.PI * 2, true);
          ctx.fill();

          // Move down
          flake.y += flake.density;

          // Wrap around
          if (flake.y > viewportH) {
            flake.y = -10;
            flake.x = Math.random() * viewportW;
          }
        }
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [weather, viewportW, viewportH]);

  if (weather === 'clear') return null;

  if (weather === 'glitch') {
    return (
      <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none bg-[rgba(255,0,123,0.015)]">
        {/* CRT Scanline Filter overlay */}
        <div className="absolute inset-0 bg-scanlines opacity-[0.09]" />
        
        {/* Glitch flash indicator */}
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-transparent to-cyan-500/5 mix-blend-color-dodge animate-pulse" />

        {/* CSS styles injected locally for scanline glitch visual overlays */}
        <style jsx>{`
          .bg-scanlines {
            background: linear-gradient(
              rgba(18, 16, 16, 0) 50%, 
              rgba(0, 0, 0, 0.25) 50%
            ), 
            linear-gradient(
              90deg, 
              rgba(255, 0, 0, 0.06), 
              rgba(0, 255, 0, 0.02), 
              rgba(0, 0, 255, 0.06)
            );
            background-size: 100% 4px, 6px 100%;
          }
        `}</style>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-40"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
