'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Eraser, Pencil, Save, Shapes, Trash2 } from 'lucide-react';
import { Note, CanvasSticker } from '@/types';
import { useStore } from '@/store/useStore';
import { generateId } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
  note: Note;
}

const BOARD_WIDTH = 980;
const BOARD_HEIGHT = 620;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
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

type BrushPreset = 'pen' | 'marker' | 'highlighter' | 'watercolor' | 'brush';
type ShapeTool = 'freehand' | 'line' | 'rectangle' | 'circle';

export function NoteCanvasBoard({ note }: Props) {
  const { updateNote } = useStore();
  const [drawMode, setDrawMode] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [brushPreset, setBrushPreset] = useState<BrushPreset>('pen');
  const [brushColor, setBrushColor] = useState('#1f2937');
  const [brushSize, setBrushSize] = useState(2.5);
  const [shapeTool, setShapeTool] = useState<ShapeTool>('freehand');
  const boardRef = useRef<HTMLDivElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawSnapshotRef = useRef<ImageData | null>(null);
  const dragStateRef = useRef<{
    stickerId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const stickers = useMemo(() => note.canvasStickers ?? [], [note.canvasStickers]);

  const saveStickers = (next: CanvasSticker[]) => {
    updateNote(note.id, { canvasStickers: next });
  };

  const addSticker = (sticker: CanvasSticker) => {
    saveStickers([...stickers, sticker]);
  };

  const updateSticker = (stickerId: string, patch: Partial<CanvasSticker>) => {
    saveStickers(stickers.map((item) => (item.id === stickerId ? { ...item, ...patch } : item)));
  };

  const removeSticker = (stickerId: string) => {
    saveStickers(stickers.filter((item) => item.id !== stickerId));
  };

  const onDropFiles: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const dropX = clamp(event.clientX - rect.left - 80, 0, BOARD_WIDTH - 40);
    const dropY = clamp(event.clientY - rect.top - 50, 0, BOARD_HEIGHT - 40);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;

    files.forEach((file, index) => {
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      if (!isImage && !isAudio) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) return;
        addSticker({
          id: generateId(),
          type: isAudio ? 'audio' : 'image',
          name: file.name,
          dataUrl,
          x: clamp(dropX + index * 24, 0, BOARD_WIDTH - 40),
          y: clamp(dropY + index * 24, 0, BOARD_HEIGHT - 40),
          width: isAudio ? 260 : 220,
          height: isAudio ? 84 : 180,
          createdAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const clearDrawLayer = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applyBrushStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;

    if (brushPreset === 'marker') {
      ctx.lineWidth = brushSize * 1.8;
      ctx.strokeStyle = hexToRgba(brushColor, 0.85);
      return;
    }
    if (brushPreset === 'highlighter') {
      ctx.lineWidth = brushSize * 3.2;
      ctx.strokeStyle = hexToRgba(brushColor, 0.35);
      ctx.globalCompositeOperation = 'multiply';
      return;
    }
    if (brushPreset === 'watercolor') {
      ctx.lineWidth = brushSize * 4;
      ctx.strokeStyle = hexToRgba(brushColor, 0.2);
      ctx.shadowBlur = 10 + brushSize;
      ctx.shadowColor = hexToRgba(brushColor, 0.35);
      return;
    }
    if (brushPreset === 'brush') {
      ctx.lineWidth = brushSize * 2.3;
      ctx.strokeStyle = hexToRgba(brushColor, 0.7);
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

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const saveDrawLayerAsSticker = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addSticker({
      id: generateId(),
      type: 'image',
      name: `Handwriting ${timeLabel}`,
      dataUrl,
      x: 24,
      y: 24,
      width: 420,
      height: 240,
      createdAt: new Date().toISOString(),
    });
    clearDrawLayer();
    toast.success('Handwriting saved as movable sticker.');
  };

  const startDrawing: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    if (!drawMode) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event, canvas);
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

  const draw: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    if (!drawMode || !drawing) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = getCanvasPoint(event, canvas);
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

  const stopDrawing: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const canvas = drawCanvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    const ctx = canvas?.getContext('2d');
    if (drawing && shapeTool !== 'freehand' && canvas && ctx && drawStartRef.current && drawSnapshotRef.current) {
      const point = getCanvasPoint(event, canvas);
      ctx.putImageData(drawSnapshotRef.current, 0, 0);
      drawShape(ctx, drawStartRef.current, point);
    }
    setDrawing(false);
    ctx?.closePath();
    drawStartRef.current = null;
    drawSnapshotRef.current = null;
  };

  const onStickerPointerDown = (event: React.PointerEvent<HTMLDivElement>, sticker: CanvasSticker) => {
    if (drawMode) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    dragStateRef.current = {
      stickerId: sticker.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left - sticker.x,
      offsetY: event.clientY - rect.top - sticker.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onStickerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    const board = boardRef.current;
    if (!state || !board || state.pointerId !== event.pointerId) return;
    const sticker = stickers.find((item) => item.id === state.stickerId);
    if (!sticker) return;
    const rect = board.getBoundingClientRect();
    const nextX = clamp(event.clientX - rect.left - state.offsetX, 0, BOARD_WIDTH - sticker.width);
    const nextY = clamp(event.clientY - rect.top - state.offsetY, 0, BOARD_HEIGHT - sticker.height);
    updateSticker(sticker.id, { x: nextX, y: nextY });
  };

  const onStickerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  };

  return (
    <div className="mt-6 border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-gray-700 mr-auto">Canvas Board (drag-drop stickers + handwriting)</h4>
        <button
          onClick={() => setDrawMode((value) => !value)}
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${
            drawMode ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-100'
          }`}
        >
          <Pencil size={12} /> {drawMode ? 'Drawing mode ON' : 'Drawing mode OFF'}
        </button>
        <button onClick={clearDrawLayer} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-gray-100">
          <Eraser size={12} /> Clear draw layer
        </button>
        <button onClick={saveDrawLayerAsSticker} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
          <Save size={12} /> Save drawing sticker
        </button>
        <div className="inline-flex items-center gap-1 border rounded px-1.5 py-1 bg-white">
          <Pencil size={12} className="text-gray-500" />
          <select
            value={brushPreset}
            onChange={(event) => setBrushPreset(event.target.value as BrushPreset)}
            className="text-xs bg-transparent outline-none"
          >
            <option value="pen">Pen</option>
            <option value="marker">Marker</option>
            <option value="highlighter">Highlighter</option>
            <option value="watercolor">Watercolor</option>
            <option value="brush">China brush</option>
          </select>
        </div>
        <div className="inline-flex items-center gap-1 border rounded px-1.5 py-1 bg-white">
          <Shapes size={12} className="text-gray-500" />
          <select
            value={shapeTool}
            onChange={(event) => setShapeTool(event.target.value as ShapeTool)}
            className="text-xs bg-transparent outline-none"
          >
            <option value="freehand">Freehand</option>
            <option value="line">Line</option>
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
          </select>
        </div>
        <label className="text-xs inline-flex items-center gap-1 border rounded px-1.5 py-1 bg-white">
          Size
          <input
            type="range"
            min={1}
            max={14}
            step={0.5}
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />
        </label>
        <label className="text-xs inline-flex items-center gap-1 border rounded px-1.5 py-1 bg-white">
          Color
          <input
            type="color"
            value={brushColor}
            onChange={(event) => setBrushColor(event.target.value)}
            className="h-5 w-8 p-0 border-0 bg-transparent"
          />
        </label>
      </div>

      <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
        Drag and drop image/audio files directly into this board. Stickers can be moved anywhere. Turn on drawing mode for tablet handwriting.
      </div>

      <div className="p-3 bg-gray-100">
        <div
          ref={boardRef}
          className="relative mx-auto bg-white border border-dashed border-gray-300 overflow-hidden"
          style={{ width: `${BOARD_WIDTH}px`, height: `${BOARD_HEIGHT}px`, maxWidth: '100%' }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropFiles}
        >
          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className="absolute border border-gray-200 rounded-lg bg-white shadow-sm select-none"
              style={{ left: `${sticker.x}px`, top: `${sticker.y}px`, width: `${sticker.width}px`, height: `${sticker.height}px` }}
            >
              <div
                className="h-6 px-2 flex items-center justify-between border-b border-gray-100 bg-gray-50 cursor-grab"
                onPointerDown={(event) => onStickerPointerDown(event, sticker)}
                onPointerMove={onStickerPointerMove}
                onPointerUp={onStickerPointerUp}
              >
                <span className="text-[10px] text-gray-600 truncate">{sticker.name}</span>
                <button onClick={() => removeSticker(sticker.id)} className="text-red-500 hover:text-red-600" title="Remove sticker">
                  <Trash2 size={11} />
                </button>
              </div>
              {sticker.type === 'audio' ? (
                <div className="p-2">
                  <audio controls src={sticker.dataUrl} className="w-full" />
                </div>
              ) : (
                <img src={sticker.dataUrl} alt={sticker.name} className="w-full h-[calc(100%-24px)] object-contain pointer-events-none" />
              )}
            </div>
          ))}

          <canvas
            ref={drawCanvasRef}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            className={`absolute inset-0 w-full h-full touch-none ${drawMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
}
