'use client';

import React, { useRef, useEffect, MouseEvent } from 'react';
import { useGridStore } from '../store/useGridStore';

const GRID_SIZE = 100;
const CANVAS_SIZE = 200; // Minimap is 200px x 200px
const PIXEL_SCALE = CANVAS_SIZE / GRID_SIZE; // 2px per cell
const TILE_SIZE = 40;

export default function MiniMap() {
  const {
    tiles,
    getReplayTiles,
    isReplayActive,
    viewportX,
    viewportY,
    viewportZoom,
    viewportW,
    viewportH,
    setViewport,
  } = useGridStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  // Redraw minimap canvas whenever tiles or viewport states change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background texture
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const activeTiles = isReplayActive ? getReplayTiles() : tiles;

    // Draw cells
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const tile = activeTiles[`${x},${y}`];
        if (tile && tile.color) {
          // Extract colors from CSS gradient string if possible, or parse gradient, or default fallback
          // Since colors are stored as gradients (e.g. "linear-gradient(135deg, #FF007A, #7B2CBF)")
          // Let's resolve the primary hex using a simple match or default color.
          const hexMatch = tile.color.match(/#[0-9A-Fa-f]{6}/);
          ctx.fillStyle = hexMatch ? hexMatch[0] : '#FF007A';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        }
        ctx.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
      }
    }

    // Draw grid lines on minimap (optional, let's keep it clean, maybe region lines!)
    ctx.strokeStyle = 'rgba(123, 44, 191, 0.1)';
    ctx.lineWidth = 1;
    // Draw 5x5 region lines
    for (let r = 0; r <= GRID_SIZE; r += 5) {
      ctx.beginPath();
      ctx.moveTo(r * PIXEL_SCALE, 0);
      ctx.lineTo(r * PIXEL_SCALE, CANVAS_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, r * PIXEL_SCALE);
      ctx.lineTo(CANVAS_SIZE, r * PIXEL_SCALE);
      ctx.stroke();
    }

    // Draw viewport bounding box
    // Viewport box coordinates in grid coordinates:
    const gridLeft = -viewportX / (TILE_SIZE * viewportZoom);
    const gridTop = -viewportY / (TILE_SIZE * viewportZoom);
    const gridW = viewportW / (TILE_SIZE * viewportZoom);
    const gridH = viewportH / (TILE_SIZE * viewportZoom);

    // Convert to canvas scale
    const bx = gridLeft * PIXEL_SCALE;
    const by = gridTop * PIXEL_SCALE;
    const bw = gridW * PIXEL_SCALE;
    const bh = gridH * PIXEL_SCALE;

    // Draw neon glowing box
    ctx.shadowColor = '#FF007A';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#FF007A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [tiles, isReplayActive, viewportX, viewportY, viewportZoom, viewportW, viewportH, getReplayTiles]);

  // Handle click / drag coordination
  const handleMapMovement = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate grid coordinates corresponding to map click (representing center of viewport)
    const targetGridX = clickX / PIXEL_SCALE;
    const targetGridY = clickY / PIXEL_SCALE;

    // Pan viewport to center on target cell
    const newPanX = viewportW / 2 - targetGridX * TILE_SIZE * viewportZoom;
    const newPanY = viewportH / 2 - targetGridY * TILE_SIZE * viewportZoom;

    // Clamp or set directly
    setViewport(newPanX, newPanY, viewportZoom);
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    handleMapMovement(e);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      handleMapMovement(e);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative glass-panel rounded-lg p-1 w-[208px] h-[208px] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="rounded cursor-pointer"
      />
    </div>
  );
}
