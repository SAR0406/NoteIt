'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Link2, ZoomIn, ZoomOut } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/primitives';

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
  const [mode, setMode] = useState<'graph' | 'mind-map'>('graph');

  const nodePositions = useMemo(() => {
    const mapped: Record<string, NodePos> = {};
    const cx = 400;
    const cy = 300;
    const radius = 200;
    notes.forEach((note, i) => {
      if (positions[note.id]) {
        mapped[note.id] = positions[note.id];
        return;
      }
      const angle = (i / Math.max(notes.length, 1)) * 2 * Math.PI;
      mapped[note.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
    return mapped;
  }, [notes, positions]);

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
          const from = nodePositions[note.id];
          const to = nodePositions[linkedId];
          if (!from || !to) return;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          const isPharma = note.tags.some((tag) => tag.toLowerCase().includes('pharma'));
          ctx.strokeStyle = isPharma ? '#c4b5fd' : '#93c5fd';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
    });

    // Draw nodes
      notes.forEach((note) => {
        const pos = nodePositions[note.id];
        if (!pos) return;

      const isHovered = hoveredNote === note.id;
      const nodeRadius = note.isPinned ? 24 : 18;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
        const isPharma = note.tags.some((tag) => tag.toLowerCase().includes('pharma'));
        ctx.fillStyle = isHovered ? '#3b82f6' : note.isFavorite ? '#f59e0b' : isPharma ? '#a78bfa' : '#60a5fa';
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
  }, [nodePositions, notes, scale, offset, hoveredNote]);

  const getNodeAt = (x: number, y: number): string | null => {
    const cx = (x - offset.x) / scale;
    const cy = (y - offset.y) / scale;
    for (const note of notes) {
      const pos = nodePositions[note.id];
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

  const root = notes.length > 0 ? notes[0] : undefined;

  return (
    <div className="flex-1 flex flex-col app-bg">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-white">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Link2 className="text-[var(--primary-600)]" size={22} /> Knowledge View
        </h1>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <SegmentedControl
            value={mode}
            options={[
              { label: 'Graph', value: 'graph' },
              { label: 'Mind map', value: 'mind-map' },
            ]}
            onChange={(next) => setMode(next as 'graph' | 'mind-map')}
          />
          {mode === 'graph' && (
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => setScale((s) => Math.min(s + 0.2, 3))} className="p-1.5 rounded hover:bg-[var(--surface-muted)]">
                <ZoomIn size={16} />
              </button>
              <button onClick={() => setScale((s) => Math.max(s - 0.2, 0.3))} className="p-1.5 rounded hover:bg-[var(--surface-muted)]">
                <ZoomOut size={16} />
              </button>
              <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="pill-button">
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative p-4">
        {mode === 'graph' ? (
          <>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full h-full rounded-2xl border border-[var(--border)] bg-white"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {notes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                  <Link2 size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No notes to display. Create some notes and link them!</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-8 left-8 surface-card rounded-lg p-3 text-xs text-[var(--text-secondary)] space-y-1">
              <p>🔵 Core topic</p>
              <p>🟣 Pharmacology</p>
              <p>🟡 Favorite</p>
              <p className="text-[var(--text-muted)]">Drag to move · Click to open · Pan to explore</p>
            </div>
          </>
        ) : (
          <div className="surface-card h-full rounded-2xl p-6 overflow-y-auto">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Mind Map</h2>
            {root ? (
              <div className="space-y-2">
                <div className="rounded-xl bg-[var(--primary-100)] px-3 py-2 text-sm font-semibold text-[var(--primary-600)] inline-block">
                  {root.title}
                </div>
                <div className="pl-5 space-y-2">
                  {root.linkedNoteIds.map((id) => {
                    const linked = notes.find((n) => n.id === id);
                    if (!linked) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          selectNote(id);
                          setActiveView('note-editor');
                        }}
                        className="block rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                      >
                        {linked.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No notes available yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
