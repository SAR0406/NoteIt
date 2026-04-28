'use client';

/**
 * AnnotateOverlay
 * ─────────────────────────────────────────────────────────────────────────────
 * A full-screen canvas annotation overlay, inspired by iOS/iPadOS Markup.
 * Supports Apple Pencil (pressure-sensitive via PointerEvent.pressure),
 * stylus, touch, and mouse input.
 *
 * Features:
 *   • Pen / Highlighter / Eraser tools
 *   • 8 colors + opacity control
 *   • Stroke width control
 *   • Undo / Redo
 *   • Clear all
 *   • Export drawing as PNG (inserts into note)
 *   • Background snapshot of the note for overlay context
 */

import React, {
  useRef, useState, useCallback, useEffect, useLayoutEffect,
} from 'react';
import {
  X, Pencil, Highlighter, Eraser, Undo2, Redo2,
  Trash2, Download, Check, Minus, Plus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tool = 'pen' | 'highlighter' | 'eraser';

interface Stroke {
  tool: Tool;
  color: string;
  width: number;
  opacity: number;
  points: Array<{ x: number; y: number; pressure: number }>;
}

interface Props {
  /** Optional background image (data URL or URL) to annotate over */
  backgroundSrc?: string;
  onSave: (annotatedDataUrl: string) => void;
  onClose: () => void;
}

const COLORS = [
  '#ffffff', '#000000', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#a855f7',
];

const TOOL_STYLES: Record<Tool, { globalCompositeOperation: GlobalCompositeOperation; opacity: (o: number) => number }> = {
  pen:         { globalCompositeOperation: 'source-over', opacity: (o) => o },
  highlighter: { globalCompositeOperation: 'source-over', opacity: (_o) => 0.38 },
  eraser:      { globalCompositeOperation: 'destination-out', opacity: (_o) => 1 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export function AnnotateOverlay({ backgroundSrc, onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);

  // Undo/Redo stacks stored as ImageData snapshots
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const currentStroke = useRef<Stroke | null>(null);
  const isDrawing = useRef(false);

  // ── Resize canvas to window ──
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const bg = bgRef.current;
    if (!canvas || !bg) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Save current drawing
    const ctx = canvas.getContext('2d');
    const saved = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    canvas.width = w;
    canvas.height = h;
    bg.width = w;
    bg.height = h;
    if (saved && ctx) {
      ctx.putImageData(saved, 0, 0);
    }
    // Draw background
    if (backgroundSrc) {
      const img = new Image();
      img.onload = () => {
        const bgCtx = bg.getContext('2d');
        if (!bgCtx) return;
        bgCtx.drawImage(img, 0, 0, w, h);
      };
      img.src = backgroundSrc;
    }
  }, [backgroundSrc]);

  useLayoutEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // ── Save snapshot for undo ──
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    // Keep max 30 undo states
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || undoStack.current.length === 0) return;
    redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const prev = undoStack.current.pop()!;
    ctx.putImageData(prev, 0, 0);
  }, []);

  const redo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || redoStack.current.length === 0) return;
    undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const next = redoStack.current.pop()!;
    ctx.putImageData(next, 0, 0);
  }, []);

  const clearAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    saveSnapshot();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [saveSnapshot]);

  // ── Drawing helpers ──
  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const beginStroke = useCallback((x: number, y: number, pressure: number) => {
    const ctx = getCtx();
    if (!ctx) return;
    saveSnapshot();
    isDrawing.current = true;
    const ts = TOOL_STYLES[tool];
    const w = tool === 'highlighter' ? strokeWidth * 6 : strokeWidth;
    currentStroke.current = { tool, color, width: w, opacity, points: [{ x, y, pressure }] };
    ctx.globalCompositeOperation = ts.globalCompositeOperation;
    ctx.globalAlpha = ts.opacity(opacity);
    ctx.strokeStyle = color;
    ctx.lineWidth = w * (0.7 + pressure * 0.8); // pressure sensitivity
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [color, opacity, saveSnapshot, strokeWidth, tool]);

  const continueStroke = useCallback((x: number, y: number, pressure: number) => {
    if (!isDrawing.current) return;
    const ctx = getCtx();
    if (!ctx || !currentStroke.current) return;
    const pts = currentStroke.current.points;
    pts.push({ x, y, pressure });
    // Smooth with mid-point algorithm
    if (pts.length >= 3) {
      const prev = pts[pts.length - 2];
      const midX = (prev.x + x) / 2;
      const midY = (prev.y + y) / 2;
      const w = currentStroke.current.width * (0.7 + pressure * 0.8);
      ctx.lineWidth = w;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX, midY);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    currentStroke.current = null;
    const ctx = getCtx();
    if (ctx) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }, []);

  // ── Pointer event handlers (works for mouse, touch, Apple Pencil) ──
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    beginStroke(e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5);
  }, [beginStroke]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    continueStroke(e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5);
  }, [continueStroke]);

  const onPointerUp = useCallback(() => endStroke(), [endStroke]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { undo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { redo(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, redo, undo]);

  // ── Save / export ──
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    const bg = bgRef.current;
    if (!canvas) return;
    // Merge bg + annotations
    const merged = document.createElement('canvas');
    merged.width = canvas.width;
    merged.height = canvas.height;
    const mCtx = merged.getContext('2d');
    if (mCtx) {
      if (bg) mCtx.drawImage(bg, 0, 0);
      mCtx.drawImage(canvas, 0, 0);
    }
    onSave(merged.toDataURL('image/png'));
  }, [onSave]);

  const toolMeta: Array<{ id: Tool; Icon: typeof Pencil; label: string; color: string }> = [
    { id: 'pen',         Icon: Pencil,      label: 'Pen',         color: 'text-indigo-400' },
    { id: 'highlighter', Icon: Highlighter, label: 'Marker',      color: 'text-yellow-400' },
    { id: 'eraser',      Icon: Eraser,      label: 'Eraser',      color: 'text-rose-400'   },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Background canvas (note screenshot / blank) */}
      <canvas
        ref={bgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.35 }}
      />

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 annotate-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* ── Top toolbar ── */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 px-4 py-3 z-10 pointer-events-auto"
        style={{
          background: 'rgba(15,15,20,0.82)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`,
        }}
      >
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Pencil size={12} className="text-white" />
          </div>
          <span className="text-sm font-black text-white/90">Annotate</span>
          <span className="text-[10px] text-white/30 font-medium hidden sm:inline">· Press Esc to exit</span>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.06] border border-white/[0.08]">
          {toolMeta.map(({ id, Icon, label, color }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={label}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                tool === id
                  ? 'bg-white/15 text-white scale-[0.97]'
                  : `${color} hover:bg-white/8`
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button onClick={undo} title="Undo (⌘Z)" className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all">
            <Undo2 size={15} />
          </button>
          <button onClick={redo} title="Redo (⌘⇧Z)" className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all">
            <Redo2 size={15} />
          </button>
          <button onClick={clearAll} title="Clear all" className="p-2 rounded-xl text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
            <Trash2 size={15} />
          </button>
          <button
            onClick={handleSave}
            title="Save & insert into note"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-black shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all"
          >
            <Check size={14} /> Done
          </button>
          <button onClick={onClose} title="Discard" className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Bottom toolbar (palette + stroke width) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 px-4 py-3 z-10 pointer-events-auto"
        style={{
          background: 'rgba(15,15,20,0.82)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        {/* Color swatches */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/40'
              }`}
              style={{ background: c, boxShadow: color === c ? `0 0 12px ${c}80` : undefined }}
            />
          ))}
          {/* Custom color picker */}
          <label className="relative w-7 h-7 rounded-full border-2 border-dashed border-white/30 hover:border-white/60 cursor-pointer transition-all overflow-hidden"
            title="Custom color">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div className="w-full h-full rounded-full" style={{ background: color }} />
          </label>
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStrokeWidth(w => Math.max(1, w - 1))}
            className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <Minus size={12} />
          </button>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">
            <div
              className="rounded-full bg-current"
              style={{
                width: Math.max(4, strokeWidth * 2),
                height: Math.max(4, strokeWidth * 2),
                color,
                maxWidth: 24,
                maxHeight: 24,
              }}
            />
            <span className="text-xs font-mono text-white/50 ml-1 w-4 text-center">{strokeWidth}</span>
          </div>
          <button
            onClick={() => setStrokeWidth(w => Math.min(24, w + 1))}
            className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Opacity slider (hidden for eraser/highlighter) */}
        {tool === 'pen' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 accent-violet-500"
            />
            <span className="text-[10px] font-mono text-white/40">{Math.round(opacity * 100)}%</span>
          </div>
        )}
      </div>

      {/* Hint overlay — shown only briefly */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
        <p className="text-white/8 text-8xl font-black select-none tracking-tighter">ANNOTATE</p>
      </div>
    </div>
  );
}
