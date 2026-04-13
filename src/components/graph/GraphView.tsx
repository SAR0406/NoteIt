'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Link2, ZoomIn, ZoomOut } from 'lucide-react';

interface NodePos {
  x: number;
  y: number;
}

export function GraphView() {
  const { notes, selectNote, setActiveView } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [positions, setPositions] = useState<Record<string, NodePos>>({});
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  // Initialize positions
  useEffect(() => {
    if (notes.length === 0) return;
    const newPos: Record<string, NodePos> = {};
    const cx = 400, cy = 300, radius = 200;
    notes.forEach((note, i) => {
      if (!positions[note.id]) {
        const angle = (i / notes.length) * 2 * Math.PI;
        newPos[note.id] = {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        };
      } else {
        newPos[note.id] = positions[note.id];
      }
    });
    setPositions(newPos);
  }, [notes.length]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw edges
    notes.forEach((note) => {
      note.linkedNoteIds.forEach((linkedId) => {
        const from = positions[note.id];
        const to = positions[linkedId];
        if (!from || !to) return;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // Draw nodes
    notes.forEach((note) => {
      const pos = positions[note.id];
      if (!pos) return;

      const isHovered = hoveredNote === note.id;
      const nodeRadius = note.isPinned ? 24 : 18;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? '#3b82f6' : note.isFavorite ? '#f59e0b' : '#60a5fa';
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1e3a5f';
      ctx.font = `${isHovered ? 'bold ' : ''}12px sans-serif`;
      ctx.textAlign = 'center';
      const maxLen = 14;
      const label = note.title.length > maxLen ? note.title.slice(0, maxLen) + '…' : note.title;
      ctx.fillText(label, pos.x, pos.y + nodeRadius + 14);
    });

    ctx.restore();
  }, [positions, notes, scale, offset, hoveredNote]);

  const getNodeAt = (x: number, y: number): string | null => {
    const cx = (x - offset.x) / scale;
    const cy = (y - offset.y) / scale;
    for (const note of notes) {
      const pos = positions[note.id];
      if (!pos) continue;
      const dist = Math.hypot(pos.x - cx, pos.y - cy);
      if (dist < 24) return note.id;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nodeId = getNodeAt(x, y);
    if (nodeId) {
      setDragging(nodeId);
    } else {
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragging) {
      const cx = (x - offset.x) / scale;
      const cy = (y - offset.y) / scale;
      setPositions((prev) => ({ ...prev, [dragging]: { x: cx, y: cy } }));
    } else if (panStart) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else {
      const nodeId = getNodeAt(x, y);
      setHoveredNote(nodeId);
      canvasRef.current!.style.cursor = nodeId ? 'pointer' : 'default';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nodeId = getNodeAt(x, y);
      if (nodeId) {
        selectNote(nodeId);
        setActiveView('note-editor');
      }
    }
    setDragging(null);
    setPanStart(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Link2 className="text-blue-500" size={22} /> Note Graph
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{notes.length} notes</span>
          <span>·</span>
          <span>{notes.reduce((acc, n) => acc + n.linkedNoteIds.length, 0) / 2} connections</span>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => setScale((s) => Math.min(s + 0.2, 3))} className="p-1.5 rounded hover:bg-gray-100">
              <ZoomIn size={16} />
            </button>
            <button onClick={() => setScale((s) => Math.max(s - 0.2, 0.3))} className="p-1.5 rounded hover:bg-gray-100">
              <ZoomOut size={16} />
            </button>
            <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              Reset
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Link2 size={48} className="mx-auto mb-3 opacity-30" />
              <p>No notes to display. Create some notes and link them!</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs text-gray-500 space-y-1">
          <p>🔵 Normal note</p>
          <p>🟡 Favorite</p>
          <p>⭕ Pinned (larger)</p>
          <p className="text-gray-400">Drag to move · Click to open · Scroll to zoom</p>
        </div>
      </div>
    </div>
  );
}
