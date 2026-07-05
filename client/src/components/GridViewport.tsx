'use client';

import React, { useRef, useState, useEffect, MouseEvent } from 'react';
import { useGridStore, GridTile } from '../store/useGridStore';
import { useSocket } from '../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';

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
  } = useGridStore();

  const { emitCursorMove, emitCapture } = useSocket();

  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Viewport transformation states
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Click particles emitter
  const [particles, setParticles] = useState<Particle[]>([]);

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

    // Capture cursor move in local grid coordinates
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
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

  const visibleTiles = getVisibleTiles();

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-full bg-grid-cyber select-none cursor-crosshair overflow-hidden"
      style={{ backgroundPosition: `${panX}px ${panY}px` }}
    >
      {/* Radial neon glow behind grid */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Grid Canvas Board Container */}
      <div
        ref={boardRef}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: GRID_SIZE * TILE_SIZE,
          height: GRID_SIZE * TILE_SIZE,
          position: 'absolute',
        }}
      >
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
          const hasOwner = !!tile.color;

          return (
            <div
              key={tileId}
              onClick={(e) => handleTileClick(x, y, e)}
              className="grid-tile absolute border border-[rgba(255,255,255,0.03)] flex items-center justify-center transition-all duration-300 hover:border-pink-500 hover:scale-105 hover:z-10 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]"
              style={{
                left: x * TILE_SIZE,
                top: y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                background: tile.color || 'rgba(12, 10, 25, 0.4)',
                cursor: isCooldown || isReplayActive ? 'not-allowed' : 'pointer',
              }}
            >
              {/* Tile Owner Avatar indicator */}
              {hasOwner && (
                <span className="text-xs pointer-events-none select-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
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

      {/* Floating coordinates indicator in bottom bar */}
      <div className="absolute bottom-4 left-4 z-20 px-2 py-1 glass-panel text-[10px] text-pink-400/80 font-mono tracking-wide rounded">
        Zoom: {Math.round(zoom * 100)}% | X: {Math.round(panX)} Y: {Math.round(panY)}
      </div>
    </div>
  );
}
