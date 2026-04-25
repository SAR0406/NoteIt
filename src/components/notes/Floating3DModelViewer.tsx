'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Download, Maximize2, Minimize2, Move, RotateCw, X, ZoomIn, ZoomOut,
} from 'lucide-react';

interface Props {
  assetUrl: string;
  prompt: string;
  onClose: () => void;
  isDark?: boolean;
}

// ─── Rotating‑cube 3‑D placeholder ──────────────────────────────────────────
function RotatingCubeCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;

    const vertices3D: [number, number, number][] = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1],
    ];
    const edges: [number, number][] = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ];

    const project = (x: number, y: number, z: number, fov: number): [number, number] => {
      const scale = fov / (fov + z);
      const cx = canvas.width  / 2;
      const cy = canvas.height / 2;
      return [cx + x * scale * 60, cy + y * scale * 60];
    };

    const rotate = (
      x: number, y: number, z: number, ax: number, ay: number,
    ): [number, number, number] => {
      // rotate Y
      const cosY = Math.cos(ay); const sinY = Math.sin(ay);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      // rotate X
      const cosX = Math.cos(ax); const sinX = Math.sin(ax);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      return [x1, y2, z2];
    };

    const frame = () => {
      angle += 0.012;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const projected = vertices3D.map(([x, y, z]) => {
        const [rx, ry, rz] = rotate(x, y, z, angle * 0.6, angle);
        return project(rx, ry, rz, 5);
      });

      ctx.strokeStyle = 'rgba(139,92,246,0.8)';
      ctx.lineWidth   = 1.5;
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur  = 12;

      for (const [a, b] of edges) {
        ctx.beginPath();
        ctx.moveTo(projected[a][0], projected[a][1]);
        ctx.lineTo(projected[b][0], projected[b][1]);
        ctx.stroke();
      }

      // vertices glow
      ctx.fillStyle = '#c084fc';
      ctx.shadowBlur = 16;
      for (const [px, py] of projected) {
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} width={220} height={220} className={className} />;
}

// ─── Main component ──────────────────────────────────────────────────────────
export function Floating3DModelViewer({ assetUrl, prompt, onClose, isDark = true }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // position & size
  const [pos,  setPos]  = useState({ x: 40, y: 80 });
  const [size, setSize] = useState({ w: 360, h: 440 });
  const [minimized, setMinimized] = useState(false);

  // drag
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
  }, [pos]);

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.ox;
    const dy = e.clientY - dragRef.current.oy;
    setPos({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
  }, []);

  const onDragEnd = useCallback(() => { dragRef.current = null; }, []);

  // resize
  const resizeRef = useRef<{ ox: number; oy: number; ow: number; oh: number } | null>(null);

  const onResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { ox: e.clientX, oy: e.clientY, ow: size.w, oh: size.h };
  }, [size]);

  const onResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.ox;
    const dy = e.clientY - resizeRef.current.oy;
    setSize({
      w: Math.max(280, resizeRef.current.ow + dx),
      h: Math.max(300, resizeRef.current.oh + dy),
    });
  }, []);

  const onResizeEnd = useCallback(() => { resizeRef.current = null; }, []);

  const isGlb = /\.(glb|gltf)(\?|$)/i.test(assetUrl);

  return (
    <div
      ref={panelRef}
      className="fixed z-[600] select-none"
      style={{ left: pos.x, top: pos.y, width: size.w }}
    >
      {/* Glass panel */}
      <div
        className={`relative rounded-[32px] overflow-hidden border shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] flex flex-col ${
          isDark ? 'border-white/10 bg-[#0f0f14]/80' : 'border-black/10 bg-white/80'
        }`}
        style={{ backdropFilter: 'blur(60px)', height: minimized ? 'auto' : size.h }}
      >
        {/* Gradient top stripe */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-purple-400 to-pink-500 pointer-events-none" />

        {/* Header — drag zone */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-grab active:cursor-grabbing shrink-0"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
              <Box size={16} className="text-white" />
            </div>
            <div>
              <p className={`text-sm font-black leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                3D Asset Viewer
              </p>
              <p className={`text-[11px] font-medium mt-0.5 truncate max-w-[180px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {prompt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMinimized(!minimized)}
              className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-500'}`}
            >
              {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'bg-black/5 hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        {!minimized && (
          <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4 gap-3 min-h-0">
            {/* 3D viewport */}
            <div
              className={`relative flex-1 rounded-[20px] flex items-center justify-center overflow-hidden ${
                isDark ? 'bg-black/50 border border-white/[0.06]' : 'bg-gray-50 border border-black/[0.06]'
              }`}
            >
              {isGlb ? (
                /* model-viewer web component for GLB/GLTF */
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                React.createElement('model-viewer' as any, {
                  src: assetUrl,
                  'auto-rotate': true,
                  'camera-controls': true,
                  'shadow-intensity': '1',
                  style: { width: '100%', height: '100%' },
                })
              ) : (
                <RotatingCubeCanvas className="opacity-80" />
              )}

              {/* Floating controls overlay */}
              <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
                {[RotateCw, ZoomIn, ZoomOut, Move].map((Icon, i) => (
                  <button
                    key={i}
                    className={`p-2 rounded-xl transition-all hover:scale-110 ${
                      isDark ? 'bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white' : 'bg-white/80 hover:bg-white text-gray-500'
                    } backdrop-blur-md border ${isDark ? 'border-white/10' : 'border-black/10'} shadow-lg`}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>

              {/* GLB label */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-violet-500/80 backdrop-blur-md text-white text-[10px] font-bold shadow-lg">
                {isGlb ? 'GLB/GLTF' : '3D Preview'}
              </div>
            </div>

            {/* Download button */}
            <a
              href={assetUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-purple-500/30 hover:-translate-y-0.5 hover:shadow-purple-500/50 transition-all"
            >
              <Download size={15} /> Download Model
            </a>
          </div>
        )}

        {/* Resize handle — bottom right corner */}
        {!minimized && (
          <div
            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-10 flex items-end justify-end pb-1.5 pr-1.5"
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400 opacity-60">
              <path d="M10 0L0 10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 4L4 10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 8L8 10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
