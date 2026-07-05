'use client';

import React, { useRef, useState, useEffect, MouseEvent } from 'react';
import { useGridStore, GridTile } from '../store/useGridStore';
import { useSocket } from '../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherEngine from './WeatherEngine';
import FractalZoomSubGrid from './FractalZoomSubGrid';

const TILE_SIZE = 40; // Size of each tile in px
const GRID_SIZE = 100; // 100 x 100 grid

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
}

export default function GridViewport() {
  const {
    tiles,
    getReplayTiles,
    isReplayActive,
    user,
    cursors,
    cooldownTiles,
    regionControl,
    viewportX: panX,
    viewportY: panY,
    viewportZoom: zoom,
    setViewport,
    setViewportSize,
    isHeatmapMode,
    clashingTiles,
    setSelectedTileId,
    serverEvent,
    currentUniverse,
    timeOfDay,
    subGridTileId,
  } = useGridStore();

  const { emitCursorMove, emitCapture } = useSocket();

  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Viewport transformation states
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Click particles emitter
  const [particles, setParticles] = useState<Particle[]>([]);

  // Cursor Trails state for multiplayer glowing tails
  const [cursorTrails, setCursorTrails] = useState<Record<string, Array<{ x: number; y: number; id: string }>>>({});

  // Background gravity flow particles ref
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Gravitational particle animation loop
  useEffect(() => {
    const canvas = backgroundCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animId: number;

    interface FlowParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }

    const flowParticles: FlowParticle[] = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.8,
      color: Math.random() > 0.6 ? 'rgba(0, 240, 255, 0.25)' : 'rgba(139, 92, 246, 0.2)',
    }));

    const renderLoop = () => {
      ctx.clearRect(0, 0, width, height);

      const targetX = mousePosRef.current.x;
      const targetY = mousePosRef.current.y;

      for (const p of flowParticles) {
        // Apply magnetic gravity vector towards mouse if close
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 220) {
          const force = (220 - dist) * 0.00035;
          p.vx += dx * force;
          p.vy += dy * force;
        }

        // Apply friction
        p.vx *= 0.98;
        p.vy *= 0.98;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setCursorTrails((prev) => {
      const nextTrails = { ...prev };
      let changed = false;

      for (const [userId, pos] of Object.entries(cursors)) {
        const existing = nextTrails[userId] || [];
        if (existing.length === 0 || existing[0].x !== pos.x || existing[0].y !== pos.y) {
          const updated = [
            { x: pos.x, y: pos.y, id: `${userId}-${Date.now()}-${Math.random()}` },
            ...existing,
          ].slice(0, 4);
          nextTrails[userId] = updated;
          changed = true;
        }
      }

      return changed ? nextTrails : prev;
    });
  }, [cursors]);

  // Update viewport size tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      const w = containerRef.current?.clientWidth || 800;
      const h = containerRef.current?.clientHeight || 600;
      setViewportSize(w, h);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [setViewportSize]);

  // Spatial Virtualization Calculations
  const getVisibleTiles = () => {
    const W = useGridStore.getState().viewportW;
    const H = useGridStore.getState().viewportH;

    // Calculate grid indexes intersecting the viewport
    const scaleSize = TILE_SIZE * zoom;
    
    const minX = Math.max(0, Math.floor(-panX / scaleSize));
    const maxX = Math.min(GRID_SIZE - 1, Math.ceil((W - panX) / scaleSize));
    
    const minY = Math.max(0, Math.floor(-panY / scaleSize));
    const maxY = Math.min(GRID_SIZE - 1, Math.ceil((H - panY) / scaleSize));

    const visibleList: { x: number; y: number }[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        visibleList.push({ x, y });
      }
    }
    return visibleList;
  };

  // Zoom handling (centered zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = 1.1;
    const nextZoom = e.deltaY < 0 ? Math.min(zoom * zoomFactor, 3.0) : Math.max(zoom / zoomFactor, 0.2);

    // Zoom relative to cursor position
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const currentMouseGridX = (mouseX - panX) / zoom;
    const currentMouseGridY = (mouseY - panY) / zoom;

    setViewport(
      mouseX - currentMouseGridX * nextZoom,
      mouseY - currentMouseGridY * nextZoom,
      nextZoom
    );
  };

  // Pan actions
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Left click on cell captures it, right click / middle click or left click with Space/Alt pans.
    // Also, clicking directly on empty space pans.
    const isTileClick = (e.target as HTMLElement).closest('.grid-tile');
    
    if (e.button === 1 || e.button === 2 || !isTileClick || e.shiftKey) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setViewport(e.clientX - dragStart.x, e.clientY - dragStart.y, zoom);
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Track for background canvas gravity pull
    mousePosRef.current = { x: mouseX, y: mouseY };
    
    // Convert to grid-scaled coordinates for broadcasting
    const gridX = (mouseX - panX) / zoom;
    const gridY = (mouseY - panY) / zoom;
    
    emitCursorMove(gridX, gridY);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'crosshair';
    }
  };

  const handleTileClick = (x: number, y: number, e: MouseEvent) => {
    if (isPanning || isReplayActive) return;
    
    const tileId = `${x},${y}`;
    setSelectedTileId(tileId);
    const now = Date.now();
    
    // Verify tile cooldown
    const cooldownEnd = cooldownTiles[tileId];
    if (cooldownEnd && now < cooldownEnd) return;

    // Trigger click ripple particle burst
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const colors = user ? [user.color, '#FFFFFF'] : ['#00F0FF', '#7B2CBF'];
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: `${tileId}-${now}-${i}`,
      x: clickX,
      y: clickY,
      color: colors[i % colors.length],
    }));

    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      // Cleanup particles
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
    }, 800);

    // Play real-time synthesized audio tone
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        // Scale pitch based on geometric coordinates (x,y)
        const frequencyVal = 180 + x * 4.5 + y * 4.5;
        osc.frequency.setValueAtTime(frequencyVal, audioCtx.currentTime);
        osc.type = 'triangle'; // sweet bell-like triangle wave

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.65);
      }
    } catch (err) {
      console.warn('AudioContext synth initialization failed:', err);
    }

    // Emit Socket capture event
    emitCapture(tileId);
  };

  // Replay mapping override
  const activeTilesSource = isReplayActive ? getReplayTiles() : tiles;

  // Render 5x5 Region Territory Overlays
  const renderRegionBorders = () => {
    const borders = [];
    const size = TILE_SIZE * 5; // 200px per region

    for (let rx = 0; rx < 20; rx++) {
      for (let ry = 0; ry < 20; ry++) {
        const regionId = `${rx},${ry}`;
        const ctrl = regionControl[regionId];
        
        if (ctrl && ctrl.ownerId) {
          borders.push(
            <div
              key={`region-${regionId}`}
              style={{
                position: 'absolute',
                left: rx * size,
                top: ry * size,
                width: size,
                height: size,
                border: `3px solid ${ctrl.color}`,
                boxShadow: `0 0 20px ${ctrl.color}, inset 0 0 15px ${ctrl.color}`,
                pointerEvents: 'none',
                borderRadius: '8px',
                zIndex: 5,
                transition: 'all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)',
              }}
            />
          );
        }
      }
    }
    return borders;
  };

  // Render neural connection lines between adjacent owned cells
  const renderNeuralNetwork = () => {
    const lines: React.ReactNode[] = [];
    visibleTiles.forEach(({ x, y }) => {
      const currentId = `${x},${y}`;
      const currentTile = activeTilesSource[currentId];
      if (!currentTile || !currentTile.color) return;

      // Check right neighbor (x+1, y)
      const rightId = `${x+1},${y}`;
      const rightTile = activeTilesSource[rightId];
      if (rightTile && rightTile.color === currentTile.color) {
        lines.push(
          <div
            key={`neuron-h-${x}-${y}`}
            style={{
              position: 'absolute',
              left: x * TILE_SIZE + TILE_SIZE / 2,
              top: y * TILE_SIZE + TILE_SIZE / 2 - 1,
              width: TILE_SIZE,
              height: 2,
              background: currentTile.color,
              boxShadow: `0 0 8px ${currentTile.color}`,
              opacity: 0.6,
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        );
      }

      // Check bottom neighbor (x, y+1)
      const bottomId = `${x},${y+1}`;
      const bottomTile = activeTilesSource[bottomId];
      if (bottomTile && bottomTile.color === currentTile.color) {
        lines.push(
          <div
            key={`neuron-v-${x}-${y}`}
            style={{
              position: 'absolute',
              left: x * TILE_SIZE + TILE_SIZE / 2 - 1,
              top: y * TILE_SIZE + TILE_SIZE / 2,
              width: 2,
              height: TILE_SIZE,
              background: currentTile.color,
              boxShadow: `0 0 8px ${currentTile.color}`,
              opacity: 0.6,
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        );
      }
    });
    return lines;
  };

  const visibleTiles = getVisibleTiles();

  let timeFilterClass = '';
  if (timeOfDay === 'morning') timeFilterClass = 'brightness-90 sepia-[15%] saturate-[110%]';
  else if (timeOfDay === 'evening') timeFilterClass = 'brightness-[72%] saturate-[130%] sepia-[10%] hue-rotate-[330deg]';
  else if (timeOfDay === 'night') timeFilterClass = 'brightness-[42%] saturate-[70%] hue-rotate-[245deg]';

  // Board transforms
  let boardTransform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  if (currentUniverse === 'gamma') {
    boardTransform += ' rotateX(10deg) rotateY(-5deg)';
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-full bg-grid-cyber select-none cursor-crosshair overflow-hidden transition-all duration-1000 ${
        serverEvent === 'eclipse' ? 'brightness-50 saturate-150' : timeFilterClass
      }`}
      style={{
        backgroundPosition: `${panX}px ${panY}px`,
        perspective: currentUniverse === 'gamma' ? '1200px' : 'none',
      }}
    >
      {/* Gravity particles background canvas */}
      <canvas ref={backgroundCanvasRef} className="absolute inset-0 block pointer-events-none z-0" />

      {/* Weather canvas particles */}
      <WeatherEngine />

      {/* Solar Eclipse starry night space particles */}
      {serverEvent === 'eclipse' && (
        <div className="absolute inset-0 bg-[#000518]/70 pointer-events-none z-20 overflow-hidden mix-blend-color-dodge">
          <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-pink-500/10 blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-[130px] animate-pulse" />
        </div>
      )}

      {/* Radial neon glow behind grid */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Grid Canvas Board Container */}
      <div
        ref={boardRef}
        className={serverEvent === 'earthquake' ? 'tile-clash-shake' : ''}
        style={{
          transform: boardTransform,
          transformOrigin: '0 0',
          width: GRID_SIZE * TILE_SIZE,
          height: GRID_SIZE * TILE_SIZE,
          position: 'absolute',
          style: currentUniverse === 'gamma' ? { transformStyle: 'preserve-3d' } : undefined,
        } as any}
      >
        {/* Black Hole cosmic visual at center of grid */}
        {serverEvent === 'blackhole' && (
          <div
            className="absolute z-20 pointer-events-none rounded-full border-4 border-dashed border-pink-500/40 animate-spin"
            style={{
              left: (GRID_SIZE * TILE_SIZE) / 2 - 200,
              top: (GRID_SIZE * TILE_SIZE) / 2 - 200,
              width: 400,
              height: 400,
              background: 'radial-gradient(circle, #000000 35%, transparent 75%)',
              boxShadow: '0 0 50px #ff007a, inset 0 0 40px #7b2cbf',
              animationDuration: '10s',
            }}
          />
        )}
        {/* Neural Network connectors */}
        {renderNeuralNetwork()}

        {/* Render visible virtualized tiles */}
        {visibleTiles.map(({ x, y }) => {
          const tileId = `${x},${y}`;
          const tile: Partial<GridTile> = activeTilesSource[tileId] || {
            id: tileId,
            ownerId: null,
            username: null,
            avatar: null,
            color: null,
            captureCount: 0,
          };

          const isCooldown = cooldownTiles[tileId] && Date.now() < cooldownTiles[tileId];
          const isClashing = clashingTiles[tileId];
          const hasOwner = !isHeatmapMode && !!tile.color;

          // Heatmap view vs normal owner color
          let backgroundStyle = tile.color || 'rgba(12, 10, 25, 0.4)';
          if (isHeatmapMode) {
            const count = tile.captureCount || 0;
            if (count === 0) {
              backgroundStyle = 'rgba(12, 10, 25, 0.2)';
            } else {
              // Hue ranges 240 (blue/cold) down to 0 (red/hot)
              const hue = Math.max(0, 240 - count * 15);
              backgroundStyle = `hsl(${hue}, 100%, 48%)`;
            }
          }

          const isDistortionZone = (x % 6 === 0 && y % 6 === 0);

          return (
            <div
              key={tileId}
              onClick={(e) => handleTileClick(x, y, e)}
              className={`grid-tile absolute border border-[rgba(255,255,255,0.03)] flex items-center justify-center transition-all duration-300 hover:border-pink-500 hover:scale-105 hover:z-10 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] ${
                isClashing ? 'tile-clash-shake' : ''
              } ${currentUniverse === 'beta' ? 'hue-rotate-[120deg] saturate-150' : ''}`}
              style={{
                left: x * TILE_SIZE,
                top: y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                background: backgroundStyle,
                cursor: isCooldown || isReplayActive ? 'not-allowed' : 'pointer',
              }}
            >
              {/* Reality Distortion Zone overlay */}
              {isDistortionZone && (
                <div className="absolute inset-0 border border-dashed border-pink-500/60 pointer-events-none animate-pulse z-10" />
              )}
              {/* Clash clash indicator overlay */}
              {isClashing && (
                <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center text-xs font-black z-20 animate-ping">
                  ⚔️
                </div>
              )}

              {/* Tile Owner Avatar indicator */}
              {hasOwner && (
                <span className="text-xs pointer-events-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  {tile.avatar}
                </span>
              )}

              {/* Cooldown Lock overlay */}
              {isCooldown && (
                <div className="absolute inset-0 tile-cooldown-overlay flex items-center justify-center bg-[rgba(255,0,0,0.15)] text-[9px] text-pink-400 font-bold border border-red-500 pointer-events-none">
                  🔒
                </div>
              )}
            </div>
          );
        })}

        {/* 5x5 Regions Borders */}
        {renderRegionBorders()}

        {/* Cursor Trails Renderer */}
        {Object.entries(cursorTrails).map(([userId, points]) => {
          const profile = useGridStore.getState().presenceList.find((p) => p.id === userId);
          const color = profile ? (profile.color.includes('gradient') ? '#FF007A' : profile.color) : '#00F0FF';
          return points.slice(1).map((pt, idx) => {
            const opacity = (4 - idx) * 0.15;
            const scale = (4 - idx) * 0.2 + 0.2;
            return (
              <div
                key={pt.id}
                className="absolute pointer-events-none rounded-full blur-[1px] z-30"
                style={{
                  left: pt.x,
                  top: pt.y,
                  width: 8,
                  height: 8,
                  background: color,
                  opacity,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
                }}
              />
            );
          });
        })}

        {/* Render multiplayers live cursors */}
        {Object.entries(cursors).map(([userId, data]) => {
          // Verify presence mapping to color
          const profile = useGridStore.getState().presenceList.find(p => p.id === userId);
          const cursorColor = profile ? profile.color : 'linear-gradient(135deg, #00F0FF, #0072FF)';

          return (
            <div
              key={`cursor-${userId}`}
              className="cursor-interpolate pointer-events-none absolute z-40 flex items-center"
              style={{
                left: data.x,
                top: data.y,
              }}
            >
              {/* Cursor Arrow icon */}
              <svg
                width="14"
                height="19"
                viewBox="0 0 14 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
              >
                <path
                  d="M0 0V18.1724L4.85821 13.061L11.194 13.061L0 0Z"
                  fill={profile?.color.includes('gradient') ? '#FF007A' : profile?.color || '#00F0FF'}
                />
              </svg>
              {/* Player Label */}
              <div
                className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-[rgba(255,255,255,0.15)]"
                style={{
                  background: cursorColor,
                }}
              >
                {data.username}
              </div>
            </div>
          );
        })}
      </div>

      {/* Render local click ripple particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ scale: 1, opacity: 1, x: p.x, y: p.y }}
            animate={{
              scale: 0.2,
              opacity: 0,
              x: p.x + (Math.random() - 0.5) * 80,
              y: p.y + (Math.random() - 0.5) * 80,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full w-2.5 h-2.5 z-50 pointer-events-none"
            style={{ background: p.color }}
          />
        ))}
      </AnimatePresence>

      {/* Nested Fractal Zoom Universe Modal */}
      <AnimatePresence>
        {subGridTileId && <FractalZoomSubGrid />}
      </AnimatePresence>

      {/* Floating coordinates indicator in bottom bar */}
      <div className="absolute bottom-4 left-4 z-20 px-2 py-1 glass-panel text-[10px] text-pink-400/80 font-mono tracking-wide rounded">
        Zoom: {Math.round(zoom * 100)}% | X: {Math.round(panX)} Y: {Math.round(panY)}
      </div>
    </div>
  );
}
