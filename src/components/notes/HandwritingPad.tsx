'use client';

import React, { useRef, useState } from 'react';
import { Eraser, Save, Trash2 } from 'lucide-react';
import { Note } from '@/types';
import { useStore } from '@/store/useStore';

interface Props {
  note: Note;
}

type BrushPreset = 'pen' | 'marker' | 'highlighter' | 'watercolor' | 'brush';
type ShapeTool = 'freehand' | 'line' | 'rectangle' | 'circle';

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((ch) => `${ch}${ch}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function HandwritingPad({ note }: Props) {
  const { addDrawingToNote, removeDrawingFromNote, setHandwritingIndex } = useStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [penSize, setPenSize] = useState(2.5);
  const [penColor, setPenColor] = useState('#111827');
  const [brushPreset, setBrushPreset] = useState<BrushPreset>('pen');
  const [shapeTool, setShapeTool] = useState<ShapeTool>('freehand');
  const [title, setTitle] = useState('Anatomy Diagram');
  const [indexedText, setIndexedText] = useState(note.handwritingIndex ?? '');
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawSnapshotRef = useRef<ImageData | null>(null);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const applyBrushStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;

    if (brushPreset === 'marker') {
      ctx.lineWidth = penSize * 1.8;
      ctx.strokeStyle = hexToRgba(penColor, 0.85);
      return;
    }
    if (brushPreset === 'highlighter') {
      ctx.lineWidth = penSize * 3.1;
      ctx.strokeStyle = hexToRgba(penColor, 0.35);
      ctx.globalCompositeOperation = 'multiply';
      return;
    }
    if (brushPreset === 'watercolor') {
      ctx.lineWidth = penSize * 4;
      ctx.strokeStyle = hexToRgba(penColor, 0.2);
      ctx.shadowBlur = 10 + penSize;
      ctx.shadowColor = hexToRgba(penColor, 0.35);
      return;
    }
    if (brushPreset === 'brush') {
      ctx.lineWidth = penSize * 2.3;
      ctx.strokeStyle = hexToRgba(penColor, 0.7);
    }
  };

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    current: { x: number; y: number }
  ) => {
    applyBrushStyle(ctx);
    if (shapeTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
      return;
    }
    if (shapeTool === 'rectangle') {
      const x = Math.min(start.x, current.x);
      const y = Math.min(start.y, current.y);
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);
      ctx.strokeRect(x, y, width, height);
      return;
    }
    if (shapeTool === 'circle') {
      const radius = Math.hypot(current.x - start.x, current.y - start.y);
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const point = getPoint(e, canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    applyBrushStyle(ctx);
    drawStartRef.current = point;
    if (shapeTool === 'freehand') {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    } else {
      drawSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    setDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getPoint(e, canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (shapeTool === 'freehand') {
      applyBrushStyle(ctx);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      return;
    }
    const start = drawStartRef.current;
    const snapshot = drawSnapshotRef.current;
    if (!start || !snapshot) return;
    ctx.putImageData(snapshot, 0, 0);
    drawShape(ctx, start, point);
  };

  const stop = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    const ctx = canvas.getContext('2d');
    if (drawing && shapeTool !== 'freehand' && ctx && drawStartRef.current && drawSnapshotRef.current) {
      const point = getPoint(e, canvas);
      ctx.putImageData(drawSnapshotRef.current, 0, 0);
      drawShape(ctx, drawStartRef.current, point);
    }
    setDrawing(false);
    ctx?.closePath();
    drawStartRef.current = null;
    drawSnapshotRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    addDrawingToNote(note.id, {
      name: title.trim() || 'Handwriting Diagram',
      dataUrl: canvas.toDataURL('image/png'),
      indexedText: indexedText.trim(),
    });
    setHandwritingIndex(note.id, indexedText.trim());
    clearCanvas();
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Handwriting & Diagram Pad</h3>
        <div className="text-xs text-gray-500">Apple Pencil/stylus friendly via pointer events</div>
      </div>

      <div className="p-4 grid md:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs"
              placeholder="Diagram title"
            />
            <select
              value={brushPreset}
              onChange={(e) => setBrushPreset(e.target.value as BrushPreset)}
              className="border border-gray-200 rounded px-2 py-1 text-xs"
            >
              <option value="pen">Pen</option>
              <option value="marker">Marker</option>
              <option value="highlighter">Highlighter</option>
              <option value="watercolor">Watercolor</option>
              <option value="brush">China brush</option>
            </select>
            <select
              value={shapeTool}
              onChange={(e) => setShapeTool(e.target.value as ShapeTool)}
              className="border border-gray-200 rounded px-2 py-1 text-xs"
            >
              <option value="freehand">Freehand</option>
              <option value="line">Line</option>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
            </select>
            <label className="text-xs text-gray-600 inline-flex items-center gap-2">
              Size
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-gray-600 inline-flex items-center gap-1">
              Color
              <input
                type="color"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                className="h-6 w-8 p-0 border border-gray-200 rounded"
              />
            </label>
            <button onClick={clearCanvas} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-gray-100">
              <Eraser size={12} /> Clear
            </button>
            <button onClick={saveDrawing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
              <Save size={12} /> Save drawing
            </button>
          </div>

          <div className="border rounded-xl bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={1100}
              height={450}
              className="w-full h-[260px] md:h-[330px] touch-none"
              onPointerDown={start}
              onPointerMove={draw}
              onPointerUp={stop}
              onPointerLeave={stop}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Handwriting indexed text (search &quot;nephron&quot; finds this drawing)
            </label>
            <textarea
              value={indexedText}
              onChange={(e) => setIndexedText(e.target.value)}
              onBlur={() => setHandwritingIndex(note.id, indexedText.trim())}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400"
              placeholder="Add searchable terms from your handwriting/diagram..."
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">Saved drawings ({note.drawings.length})</h4>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {note.drawings.map((drawingItem) => (
              <div key={drawingItem.id} className="border border-gray-100 rounded-lg p-2">
                <img src={drawingItem.dataUrl} alt={drawingItem.name} className="w-full h-20 object-cover rounded border border-gray-100" />
                <div className="mt-1 flex items-center justify-between gap-1">
                  <p className="text-[11px] text-gray-600 truncate">{drawingItem.name}</p>
                  <button
                    onClick={() => removeDrawingFromNote(note.id, drawingItem.id)}
                    className="text-red-500 hover:text-red-600"
                    title="Delete drawing"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {note.drawings.length === 0 && <p className="text-xs text-gray-400">No saved drawings yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
