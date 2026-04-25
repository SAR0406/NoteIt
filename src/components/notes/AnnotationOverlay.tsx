'use client';

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  Check, ChevronRight, Circle, Eraser, Minus, PenTool, RotateCcw, Square, Type,
  X,
} from 'lucide-react';

type AnnotationTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text';

interface Props {
  /** The element to overlay — its bounding box is used to size the canvas */
  targetRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSave?: (dataUrl: string) => void;
  isDark?: boolean;
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000',
];

const TOOL_CONFIG: { id: AnnotationTool; icon: React.ComponentType<{ size?: number; className?: string }> ; label: string; hint?: string }[] = [
  { id: 'pen',         icon: PenTool,   label: 'Pen',         hint: 'Free draw' },
  { id: 'highlighter', icon: Minus,     label: 'Highlighter', hint: 'Semi-transparent strokes' },
  { id: 'eraser',      icon: Eraser,    label: 'Eraser',      hint: 'Erase strokes' },
  { id: 'line',        icon: Minus,     label: 'Line',        hint: 'Straight line' },
  { id: 'rect',        icon: Square,    label: 'Rect',        hint: 'Rectangle' },
  { id: 'circle',      icon: Circle,    label: 'Circle',      hint: 'Oval' },
  { id: 'arrow',       icon: ChevronRight, label: 'Arrow',    hint: 'Arrow' },
  { id: 'text',        icon: Type,      label: 'Text',        hint: 'Add label' },
];

export function AnnotationOverlay({ targetRef, onClose, onSave, isDark = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [tool, setTool]       = useState<AnnotationTool>('pen');
  const [color, setColor]     = useState('#ef4444');
  const [size, setSize]       = useState(4);
  const [opacity, setOpacity] = useState(1);

  // History for undo
  const historyRef = useRef<ImageData[]>([]);

  // Pointer tracking
  const pointerRef = useRef<{
    down: boolean;
    start: { x: number; y: number };
    snapshot: ImageData | null;
  }>({ down: false, start: { x: 0, y: 0 }, snapshot: null });

  // Text label state
  const [textPos,   setTextPos]   = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  // ── resize canvas to fill target or full screen ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      if (targetRef?.current) {
        const rect = targetRef.current.getBoundingClientRect();
        canvas.width  = rect.width;
        canvas.height = rect.height;
      } else {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [targetRef]);

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }, []);

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = historyRef.current.pop();
    if (snap) ctx.putImageData(snap, 0, 0);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const setupCtx = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.lineCap    = 'round';
    ctx.lineJoin   = 'round';
    ctx.lineWidth  = size;
    ctx.strokeStyle = tool === 'eraser'
      ? 'rgba(0,0,0,1)'
      : tool === 'highlighter'
        ? `${color}80`
        : color;
    ctx.globalAlpha        = tool === 'eraser' ? 1 : opacity;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    if (tool === 'highlighter') ctx.lineWidth = size * 6;
  }, [tool, color, size, opacity]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'text') {
      const pt = getPoint(e);
      setTextPos(pt);
      setTextInput('');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const pt = getPoint(e);
    saveSnapshot();
    setupCtx(ctx);

    pointerRef.current = {
      down: true,
      start: pt,
      snapshot: ['line','rect','circle','arrow'].includes(tool)
        ? ctx.getImageData(0, 0, canvas.width, canvas.height)
        : null,
    };

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  }, [tool, getPoint, saveSnapshot, setupCtx]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current.down) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt  = getPoint(e);
    const st  = pointerRef.current.start;
    const snp = pointerRef.current.snapshot;

    setupCtx(ctx);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    } else if (snp) {
      ctx.putImageData(snp, 0, 0);
      setupCtx(ctx);

      if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(st.x, st.y, pt.x - st.x, pt.y - st.y);
      } else if (tool === 'circle') {
        const rx = Math.abs(pt.x - st.x) / 2;
        const ry = Math.abs(pt.y - st.y) / 2;
        const cx = st.x + (pt.x - st.x) / 2;
        const cy = st.y + (pt.y - st.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === 'arrow') {
        // line
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        // arrowhead
        const angle = Math.atan2(pt.y - st.y, pt.x - st.x);
        const hs = size * 4;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - hs * Math.cos(angle - Math.PI / 6), pt.y - hs * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - hs * Math.cos(angle + Math.PI / 6), pt.y - hs * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  }, [tool, getPoint, setupCtx, size]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    pointerRef.current.down = false;
    pointerRef.current.snapshot = null;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  }, []);

  // Commit text annotation
  const commitText = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !textPos || !textInput.trim()) { setTextPos(null); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveSnapshot();
    ctx.font         = `bold ${size * 4}px system-ui, sans-serif`;
    ctx.fillStyle    = color;
    ctx.globalAlpha  = opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextPos(null);
    setTextInput('');
  }, [textPos, textInput, size, color, opacity, saveSnapshot]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave?.(canvas.toDataURL('image/png'));
    onClose();
  }, [onSave, onClose]);

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[700] flex flex-col ${isDark ? 'bg-black/30' : 'bg-black/15'}`}
      style={{ backdropFilter: 'blur(2px)' }}
    >
      {/* ── CANVAS ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* ── Floating text input ── */}
      {textPos && (
        <input
          ref={textInputRef}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setTextPos(null); }}
          onBlur={commitText}
          placeholder="Type label…"
          className="absolute bg-transparent border-0 outline-none font-bold placeholder-white/40 text-white"
          style={{
            left: textPos.x,
            top:  textPos.y - size * 4,
            fontSize: size * 4,
            color,
            caretColor: color,
          }}
        />
      )}

      {/* ── TOOLBAR (iOS Markup-style pill) ── */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 pointer-events-none"
        style={{ pointerEvents: 'none' }}
      >
        {/* Tool row */}
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-[36px] border shadow-[0_20px_60px_rgba(0,0,0,0.5)] pointer-events-auto"
          style={{
            background: isDark ? 'rgba(15,15,20,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(60px)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          }}
        >
          {TOOL_CONFIG.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              title={label}
              onClick={() => setTool(id)}
              className={`relative p-3 rounded-[22px] transition-all duration-300 flex items-center justify-center ${
                tool === id
                  ? 'scale-110 shadow-lg'
                  : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-black/5'
              }`}
              style={tool === id ? { background: color, color: '#fff', boxShadow: `0 4px 16px ${color}60` } : {}}
            >
              <Icon size={18} />
            </button>
          ))}

          <div className={`w-px h-8 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

          {/* Undo */}
          <button
            title="Undo"
            onClick={undo}
            className={`p-3 rounded-[22px] transition-all hover:scale-110 ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-black/5'}`}
          >
            <RotateCcw size={18} />
          </button>

          <div className={`w-px h-8 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

          {/* Close */}
          <button
            title="Cancel"
            onClick={onClose}
            className="p-3 rounded-[22px] transition-all hover:scale-110 bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300"
          >
            <X size={18} />
          </button>

          {/* Done */}
          <button
            title="Done"
            onClick={handleSave}
            className="p-3 rounded-[22px] transition-all hover:scale-110 bg-green-500/15 text-green-400 hover:bg-green-500/25 hover:text-green-300"
          >
            <Check size={18} />
          </button>
        </div>

        {/* Color + size row */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-[28px] border shadow-[0_12px_40px_rgba(0,0,0,0.3)] pointer-events-auto"
          style={{
            background: isDark ? 'rgba(15,15,20,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(60px)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          }}
        >
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-all hover:scale-125 flex-shrink-0"
              style={{
                background: c,
                border: color === c ? '3px solid white' : '2px solid transparent',
                boxShadow: color === c ? `0 0 0 2px ${c}80, 0 4px 12px ${c}60` : undefined,
                transform: color === c ? 'scale(1.25)' : undefined,
              }}
            />
          ))}

          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

          {/* Brush size */}
          <input
            type="range"
            min={1}
            max={16}
            step={0.5}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-20 accent-violet-500"
            title="Brush size"
          />

          {/* Opacity */}
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-16 accent-pink-500"
            title="Opacity"
          />
        </div>
      </div>

      {/* Top label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase text-white/60 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
        Markup — draw or annotate
      </div>
    </div>
  );
}
