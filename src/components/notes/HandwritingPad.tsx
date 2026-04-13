'use client';

import React, { useRef, useState } from 'react';
import { Eraser, Save, Trash2 } from 'lucide-react';
import { Note } from '@/types';
import { useStore } from '@/store/useStore';

interface Props {
  note: Note;
}

export function HandwritingPad({ note }: Props) {
  const { addDrawingToNote, removeDrawingFromNote, setHandwritingIndex } = useStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [penSize, setPenSize] = useState(2.5);
  const [penColor, setPenColor] = useState('#111827');
  const [title, setTitle] = useState('Anatomy Diagram');
  const [indexedText, setIndexedText] = useState(note.handwritingIndex ?? '');

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stop = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setDrawing(false);
    const ctx = canvas.getContext('2d');
    ctx?.closePath();
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
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs"
            >
              <option value="#111827">Black</option>
              <option value="#dc2626">Red</option>
              <option value="#1d4ed8">Blue</option>
              <option value="#059669">Green</option>
              <option value="#7c3aed">Purple</option>
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
