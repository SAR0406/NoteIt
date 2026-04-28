'use client';

/**
 * Model3DViewer
 * ─────────────────────────────────────────────────────────────────────────────
 * A floating, transparent, draggable, and resizable overlay panel that renders
 * AI-generated 3D models (GLB/GLTF via <model-viewer>) or falls back to a
 * preview image with a 3D-style glass presentation.
 *
 * Usage:
 *   <Model3DViewer
 *     src="https://..."       // GLB, GLTF, or image URL
 *     title="My 3D Asset"
 *     onClose={() => ...}
 *   />
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  X, Maximize2, Minimize2, RotateCcw, Move, Box, Image as ImageIcon,
} from 'lucide-react';

// ─── Declare model-viewer as a valid JSX element ─────────────────────────────
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          'auto-rotate'?: boolean | string;
          'camera-controls'?: boolean | string;
          'shadow-intensity'?: string;
          'environment-image'?: string;
          exposure?: string;
          ar?: boolean | string;
          'ar-modes'?: string;
          poster?: string;
          loading?: string;
          reveal?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  src: string;
  title?: string;
  onClose: () => void;
  onInsert?: () => void;
  initialX?: number;
  initialY?: number;
}

const MIN_W = 280;
const MIN_H = 240;
const DEFAULT_W = 420;
const DEFAULT_H = 380;

function is3DModel(url: string) {
  return /\.(glb|gltf)(\?|$)/i.test(url);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Model3DViewer({ src, title = '3D Asset', onClose, onInsert, initialX, initialY }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const [pos, setPos] = useState(() => ({
    x: initialX ?? Math.max(20, (typeof window !== 'undefined' ? window.innerWidth / 2 - DEFAULT_W / 2 : 100)),
    y: initialY ?? Math.max(20, (typeof window !== 'undefined' ? window.innerHeight / 2 - DEFAULT_H / 2 : 80)),
  }));
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [maximized, setMaximized] = useState(false);
  const [is3D] = useState(() => is3DModel(src));
  const [autoRotate, setAutoRotate] = useState(true);

  // ── Drag (pointer events → works on mouse, touch, Apple Pencil) ──
  const startDrag = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origLeft: pos.x, origTop: pos.y };
  }, [pos]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxX = window.innerWidth - size.w - 8;
    const maxY = window.innerHeight - size.h - 8;
    setPos({
      x: Math.max(0, Math.min(maxX, dragRef.current.origLeft + dx)),
      y: Math.max(0, Math.min(maxY, dragRef.current.origTop + dy)),
    });
  }, [size]);

  const endDrag = useCallback(() => { dragRef.current = null; }, []);

  // ── Resize ──
  const startResize = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
  }, [size]);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setSize({
      w: Math.max(MIN_W, resizeRef.current.origW + dx),
      h: Math.max(MIN_H, resizeRef.current.origH + dy),
    });
  }, []);

  const endResize = useCallback(() => { resizeRef.current = null; }, []);

  // ── Keyboard close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const panelStyle: React.CSSProperties = maximized
    ? { position: 'fixed', inset: 0, borderRadius: 0, zIndex: 310, width: '100%', height: '100%' }
    : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: 310 };

  return (
    <>
      {/* Subtle backdrop hint */}
      {maximized && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[305]" onClick={onClose} />
      )}

      <div
        ref={panelRef}
        className="resizable-panel glass-panel select-none"
        style={{
          ...panelStyle,
          borderRadius: maximized ? 0 : 24,
          display: 'flex',
          flexDirection: 'column',
        }}
        onPointerMove={(e) => {
          if (dragRef.current) onDragMove(e);
          if (resizeRef.current) onResizeMove(e);
        }}
        onPointerUp={() => { endDrag(); endResize(); }}
        onPointerLeave={() => { endDrag(); endResize(); }}
      >
        {/* ── Top gradient bar ── */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-500 rounded-t-[24px]" />

        {/* ── Title bar / drag handle ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing shrink-0"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrag}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/40 shrink-0">
            <Box size={14} className="text-white" />
          </div>

          <span className="flex-1 text-sm font-black text-white/90 truncate">{title}</span>

          {/* Controls — no-drag so clicks don't initiate drag */}
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={() => setAutoRotate(v => !v)}
              title="Toggle auto-rotate"
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${autoRotate ? 'bg-violet-500/30 text-violet-300' : 'text-white/40 hover:text-white/70'}`}
            >
              <RotateCcw size={13} />
            </button>

            <button
              onClick={() => setMaximized(v => !v)}
              title={maximized ? 'Restore' : 'Maximize'}
              className="p-1.5 rounded-lg text-white/50 hover:text-white/80 transition-all hover:scale-110"
            >
              {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {onInsert && (
              <button
                onClick={onInsert}
                title="Embed into note"
                className="no-drag px-3 py-1 rounded-lg bg-violet-500/30 hover:bg-violet-500/50 text-violet-200 text-xs font-bold transition-all hover:scale-105"
              >
                Embed
              </button>
            )}

            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-red-500/20 transition-all hover:scale-110"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── 3D / Image content ── */}
        <div className="flex-1 relative overflow-hidden mx-3 mb-3 rounded-[18px] bg-black/30">
          {is3D ? (
            <model-viewer
              src={src}
              alt={title}
              auto-rotate={autoRotate ? '' : undefined}
              camera-controls=""
              shadow-intensity="1"
              exposure="0.8"
              ar=""
              ar-modes="webxr scene-viewer quick-look"
              loading="lazy"
              reveal="auto"
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
              <img
                src={src}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-xl"
                draggable={false}
              />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30">
                <ImageIcon size={11} className="text-violet-300" />
                <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">AI Preview</span>
              </div>
            </div>
          )}

          {/* AR badge for 3D models on iOS/Android */}
          {is3D && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
              <Box size={10} className="text-cyan-400" />
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">3D · AR</span>
            </div>
          )}
        </div>

        {/* ── Resize handle (bottom-right corner) ── */}
        {!maximized && (
          <div
            className="resize-handle no-drag"
            style={{ bottom: 8, right: 8, cursor: 'nwse-resize', touchAction: 'none' }}
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={endResize}
          />
        )}

        {/* ── Move indicator ── */}
        {!maximized && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none">
            <Move size={9} className="text-white/20" />
          </div>
        )}
      </div>
    </>
  );
}
