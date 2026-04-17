'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Bold,
  Brain,
  Grid,
  Highlighter,
  Italic,
  Link2,
  List,
  Magnet,
  MousePointer2,
  Pin,
  PlayCircle,
  Quote,
  Sparkles,
  Star,
  Target,
  Type,
  Wand2,
} from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useStore } from '@/store/useStore';
import { CanvasNode, Note } from '@/types';
import { formatDate, generateId } from '@/lib/utils';
import { FloatingToolbar, PillButton, SectionCard, SegmentedControl, Chip } from '@/components/ui/primitives';
import { NoteCanvasBoard } from './NoteCanvasBoard';
import { HandwritingPad } from './HandwritingPad';

type WorkspaceMode = 'hybrid' | 'canvas' | 'document';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function NoteEditor() {
  const {
    notes,
    selectedNoteId,
    selectNote,
    addNote,
    updateNote,
    toggleFavorite,
    togglePin,
    summarizeNote,
    generateQuizFromNote,
    setActiveView,
    addCanvasNode,
    updateCanvasNode,
    linkCanvasNodes,
  } = useStore();
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('hybrid');
  const [pulse, setPulse] = useState(0);

  const activeNote = useMemo<Note | null>(() => {
    const selected = notes.find((n) => n.id === selectedNoteId && !n.isTrashed);
    if (selected) return selected;
    return notes.find((n) => !n.isTrashed) ?? null;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    const interval = window.setInterval(() => setPulse((p) => p + 1), 4200);
    return () => window.clearInterval(interval);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
    ],
    content: activeNote?.content ?? '',
    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none min-h-[320px] text-[var(--text-primary)] focus:outline-none',
      },
    },
    onUpdate({ editor: ed }) {
      if (activeNote) updateNote(activeNote.id, { content: ed.getHTML() });
    },
  });

  useEffect(() => {
    if (editor && activeNote) {
      editor.commands.setContent(activeNote.content || '', { emitUpdate: false });
    }
  }, [activeNote, editor]);

  if (!activeNote) {
    return (
      <div className="flex-1 app-bg flex items-center justify-center p-8">
        <SectionCard title="No note selected" subtitle="Spin up a new creative surface and start thinking.">
          <div className="flex items-center gap-3">
            <PillButton
              className="pill-button-active"
              onClick={() => {
                const note = addNote({});
                selectNote(note.id);
                setActiveView('note-editor');
              }}
            >
              <Sparkles size={14} /> Create note
            </PillButton>
            <PillButton onClick={() => setActiveView('notes')}>Open list</PillButton>
          </div>
        </SectionCard>
      </div>
    );
  }

  const handleTitleChange = (value: string) => {
    updateNote(activeNote.id, { title: value || 'Untitled note' });
  };

  const handleAddNode = () => {
    const baseX = 180 + Math.random() * 140;
    const baseY = 140 + Math.random() * 120;
    addCanvasNode(activeNote.id, {
      id: generateId(),
      title: 'Idea block',
      body: 'Capture a hypothesis, evidence, or diagram label.',
      x: baseX,
      y: baseY,
      width: 240,
      height: 150,
      color: '#38bdf8',
      connections: [],
      icon: '✨',
      energy: 0.66,
    });
  };

  const quickLinks = [
    { label: 'Graph', action: () => setActiveView('graph') },
    { label: 'Flashcards', action: () => setActiveView('flashcards') },
    { label: 'Documents', action: () => setActiveView('documents') },
  ];

  return (
    <div className="flex-1 overflow-y-auto app-bg">
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white/70 shadow-[0_20px_70px_rgba(59,91,219,0.08)] backdrop-blur-xl"
        >
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-[240px] space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-indigo-600 font-semibold">
                <Sparkles size={14} /> Spatial Note Engine
              </div>
              <input
                value={activeNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full border-none bg-transparent text-2xl md:text-3xl font-semibold text-[var(--text-primary)] outline-none"
                placeholder="Title your thought space"
              />
              <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                <Chip className="bg-white/70 border-[var(--border)]">
                  <Brain size={12} /> {activeNote.templateType || 'blank template'}
                </Chip>
                <Chip className="bg-white/70 border-[var(--border)]">
                  Updated {formatDate(activeNote.updatedAt)}
                </Chip>
                <Chip className="bg-white/70 border-[var(--border)]">
                  {activeNote.canvasNodes.length} spatial cards · {activeNote.attachments.length} attachments
                </Chip>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PillButton className="pill-button-active" onClick={() => summarizeNote(activeNote.id)}>
                <Wand2 size={14} /> Summarize
              </PillButton>
              <PillButton onClick={() => generateQuizFromNote(activeNote.id)}>
                <Target size={14} /> Quiz me
              </PillButton>
              <PillButton onClick={() => toggleFavorite(activeNote.id)} active={activeNote.isFavorite}>
                <Star size={14} /> Favorite
              </PillButton>
              <PillButton onClick={() => togglePin(activeNote.id)} active={activeNote.isPinned}>
                <Pin size={14} /> Pin
              </PillButton>
            </div>
          </div>

          <div className="relative flex flex-wrap gap-3 border-t border-[var(--border)] px-4 py-3">
            <SegmentedControl
              value={workspaceMode}
              options={[
                { label: 'Hybrid', value: 'hybrid' },
                { label: 'Spatial', value: 'canvas' },
                { label: 'Document', value: 'document' },
              ]}
              onChange={(value) => setWorkspaceMode(value as WorkspaceMode)}
            />
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                >
                  {item.label} <ArrowRight size={12} />
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Activity size={14} className="text-[var(--primary-600)]" />
              Live focus · {workspaceMode === 'canvas' ? 'Spatial flow' : workspaceMode === 'document' ? 'Deep writing' : 'Multi-modal'}
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <motion.div
            key="left-pane"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {workspaceMode !== 'document' && (
              <SectionCard
                title="Spatial canvas"
                subtitle="Place ideas, link them, and glide across the knowledge graph."
                action={(
                  <div className="flex items-center gap-2">
                    <PillButton onClick={handleAddNode}><Sparkles size={13} /> Add node</PillButton>
                    <PillButton onClick={() => setActiveView('graph')}><Link2 size={13} /> Open graph</PillButton>
                  </div>
                )}
              >
                <SpatialCanvas
                  note={activeNote}
                  onAddNode={handleAddNode}
                  onUpdateNode={(nodeId, patch) => updateCanvasNode(activeNote.id, nodeId, patch)}
                  onLinkNode={(sourceId, targetId) => linkCanvasNodes(activeNote.id, sourceId, targetId)}
                  pulse={pulse}
                />
              </SectionCard>
            )}

            {workspaceMode !== 'canvas' && (
              <SectionCard
                title="Document engine"
                subtitle="Crisp rich-text with inline AI, smart formatting, and command palette shortcuts."
                action={<MiniToolbar editorReady={!!editor} onNodeInsert={handleAddNode} />}
              >
                <div className="rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
                  <EditorToolbar editor={editor} />
                  <div className="border-t border-[var(--border)] bg-gradient-to-br from-white via-white to-[var(--surface-muted)] p-4">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </SectionCard>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <SectionCard title="Handwriting lab" subtitle="Tablet-ready canvas with indexing.">
                <HandwritingPad note={activeNote} />
              </SectionCard>
              <SectionCard title="Sticker board" subtitle="Drop media, annotate, and rearrange.">
                <NoteCanvasBoard note={activeNote} />
              </SectionCard>
            </div>
          </motion.div>

          <motion.div
            key="insight-pane"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="space-y-3"
          >
            <SectionCard
              title="Note pulse"
              subtitle="Engagement, linkage, and surface health in one glance."
              tone="accent"
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InsightTile
                  icon={<Sparkles size={16} />}
                  label="Links"
                  value={activeNote.linkedNoteIds.length}
                  detail="Connections mapped"
                />
                <InsightTile
                  icon={<Magnet size={16} />}
                  label="Canvas energy"
                  value={`${Math.round(
                    (activeNote.canvasNodes.reduce((acc, node) => acc + (node.energy ?? 0.6), 0) /
                      Math.max(activeNote.canvasNodes.length || 1, 1)) *
                      100,
                  )}%`}
                  detail="Flow strength"
                />
                <InsightTile
                  icon={<MousePointer2 size={16} />}
                  label="Blocks"
                  value={activeNote.canvasNodes.length}
                  detail="Spatial cards"
                />
                <InsightTile
                  icon={<Grid size={16} />}
                  label="Artifacts"
                  value={activeNote.attachments.length + activeNote.drawings.length}
                  detail="Media & drawings"
                />
              </div>
            </SectionCard>

            <SectionCard title="Momentum" subtitle="Keep a steady cadence with micro goals.">
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <ProgressRow label="Writing streak" value={72} />
                <ProgressRow label="Spatial linking" value={58} />
                <ProgressRow label="Review readiness" value={66} />
              </div>
            </SectionCard>

            <SectionCard title="Tagged context" subtitle="Active tags keep retrieval sharp.">
              <div className="flex flex-wrap gap-2">
                {activeNote.tags.length === 0 && (
                  <span className="text-xs text-[var(--text-muted)]">No tags yet. Add some to boost retrieval.</span>
                )}
                {activeNote.tags.map((tag) => (
                  <Chip key={tag} className="chip-active bg-[var(--surface-muted)]">
                    {tag}
                  </Chip>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Quick jumps" subtitle="Navigate without losing flow.">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveView('flashcard-review')}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  <PlayCircle size={16} className="inline mr-1 text-[var(--primary-600)]" />
                  Review session
                </button>
                <button
                  onClick={() => setActiveView('templates')}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  <Wand2 size={16} className="inline mr-1 text-[var(--primary-600)]" />
                  Templates
                </button>
                <button
                  onClick={() => setActiveView('audio')}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  <Brain size={16} className="inline mr-1 text-[var(--primary-600)]" />
                  Audio index
                </button>
                <button
                  onClick={() => setActiveView('graph')}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  <Link2 size={16} className="inline mr-1 text-[var(--primary-600)]" />
                  Graph view
                </button>
              </div>
            </SectionCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SpatialCanvas({
  note,
  onAddNode,
  onUpdateNode,
  onLinkNode,
  pulse,
}: {
  note: Note;
  onAddNode: () => void;
  onUpdateNode: (nodeId: string, patch: Partial<CanvasNode>) => void;
  onLinkNode: (sourceId: string, targetId: string) => void;
  pulse: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ x: 140, y: 120, scale: 1 });
  const [panning, setPanning] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 640 });

  useEffect(() => {
    return () => {
      setPanning(false);
      setDragging(null);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  };

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    const nextScale = clamp(view.scale * factor, 0.5, 1.8);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      setView((v) => ({ ...v, scale: nextScale }));
      return;
    }
    const worldPoint = toWorld(event.clientX, event.clientY);
    setView((prev) => ({
      scale: nextScale,
      x: prev.x - (worldPoint.x * nextScale - worldPoint.x * prev.scale),
      y: prev.y - (worldPoint.y * nextScale - worldPoint.y * prev.scale),
    }));
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return;
    setPanning(true);
    panStartRef.current = { x: event.clientX, y: event.clientY };
    velocityRef.current = { x: 0, y: 0 };
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (dragging) {
      const world = toWorld(event.clientX, event.clientY);
      const nextX = Math.round((world.x - dragging.offsetX) / 12) * 12;
      const nextY = Math.round((world.y - dragging.offsetY) / 12) * 12;
      onUpdateNode(dragging.id, { x: nextX, y: nextY });
      return;
    }
    if (!panning || !panStartRef.current) return;
    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;
    panStartRef.current = { x: event.clientX, y: event.clientY };
    velocityRef.current = { x: dx, y: dy };
    setView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    if (dragging) {
      setDragging(null);
    }
    if (panning) {
      setPanning(false);
      const decay = () => {
        velocityRef.current = { x: velocityRef.current.x * 0.9, y: velocityRef.current.y * 0.9 };
        if (Math.abs(velocityRef.current.x) < 0.2 && Math.abs(velocityRef.current.y) < 0.2) return;
        setView((prev) => ({
          ...prev,
          x: prev.x + velocityRef.current.x,
          y: prev.y + velocityRef.current.y,
        }));
        requestAnimationFrame(decay);
      };
      requestAnimationFrame(decay);
    }
  };

  const handleNodePointerDown = (event: React.PointerEvent<HTMLDivElement>, node: CanvasNode) => {
    event.stopPropagation();
    const world = toWorld(event.clientX, event.clientY);
    setDragging({
      id: node.id,
      offsetX: world.x - node.x,
      offsetY: world.y - node.y,
    });
    setSelectedNode(node.id);
  };

  const handleNodeClick = (nodeId: string) => {
    if (selectedNode && selectedNode !== nodeId) {
      onLinkNode(selectedNode, nodeId);
    }
    setSelectedNode(nodeId);
  };

  const viewport = viewportSize;
  const buffer = 280;
  const worldLeft = (-view.x - buffer) / view.scale;
  const worldTop = (-view.y - buffer) / view.scale;
  const worldRight = worldLeft + (viewport.width + buffer * 2) / view.scale;
  const worldBottom = worldTop + (viewport.height + buffer * 2) / view.scale;

  const visibleNodes = note.canvasNodes.filter(
    (node) =>
      node.x + node.width > worldLeft &&
      node.x < worldRight &&
      node.y + node.height > worldTop &&
      node.y < worldBottom,
  );

  const maxX = Math.max(...note.canvasNodes.map((n) => n.x + n.width), 1400);
  const maxY = Math.max(...note.canvasNodes.map((n) => n.y + n.height), 900);

  return (
    <div
      ref={containerRef}
      className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#0b122b] via-[#0c1536] to-[#0f172a]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(76,110,245,0.14), transparent 32%), radial-gradient(circle at 80% 0%, rgba(124,58,237,0.12), transparent 28%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: `${Math.round(36 * view.scale)}px ${Math.round(36 * view.scale)}px, ${Math.round(
            36 * view.scale,
          )}px ${Math.round(36 * view.scale)}px, ${Math.round(140 * view.scale)}px ${Math.round(
            140 * view.scale,
          )}px, ${Math.round(140 * view.scale)}px ${Math.round(140 * view.scale)}px`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <svg className="absolute inset-0 pointer-events-none" width={maxX + 400} height={maxY + 400}>
          {note.canvasNodes.flatMap((node) =>
            node.connections.map((targetId) => {
              const target = note.canvasNodes.find((n) => n.id === targetId);
              if (!target) return null;
              const start = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
              const end = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="url(#linkGradient)"
                  strokeWidth={selectedNode === node.id || selectedNode === targetId ? 3 : 2}
                  strokeOpacity={0.75}
                  strokeLinecap="round"
                />
              );
            }),
          )}
          <defs>
            <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>

        {visibleNodes.map((node) => (
          <motion.div
            key={node.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute rounded-2xl border shadow-lg backdrop-blur-md ${
              selectedNode === node.id ? 'ring-2 ring-indigo-400' : ''
            }`}
            style={{
              left: node.x,
              top: node.y,
              width: node.width,
              height: node.height,
              background: 'rgba(255,255,255,0.92)',
              borderColor: 'rgba(255,255,255,0.45)',
            }}
            onPointerDown={(e) => handleNodePointerDown(e, node)}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(node.id);
            }}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{node.icon ?? '💡'}</span>
                <p className="text-sm font-semibold text-slate-800">{node.title}</p>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                style={{ color: node.color }}
              >
                <Target size={12} /> {Math.round((node.energy ?? 0.6) * 100)}%
              </span>
            </div>
            <p className="px-3 text-xs leading-relaxed text-slate-600">{node.body}</p>
            <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Link2 size={11} /> {node.connections.length} links
              </span>
              <span
                className="h-1.5 w-16 rounded-full bg-slate-100"
                style={{
                  background: `linear-gradient(90deg, ${node.color} ${(node.energy ?? 0.6) * 100}%, #e2e8f0 ${(node.energy ?? 0.6) * 100}%)`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 text-xs text-white/80">
        <MousePointer2 size={14} />
        Drag to pan · Scroll to zoom · Click a card twice to link
      </div>
      <div className="pointer-events-none absolute right-4 top-4 text-xs text-white/70">
        {visibleNodes.length} / {note.canvasNodes.length} nodes visible
      </div>
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-2">
        <PillButton className="pill-button-active" onClick={(e) => { e.stopPropagation(); onAddNode(); }}>
          <Sparkles size={13} /> Drop idea
        </PillButton>
        <PillButton onClick={(e) => { e.stopPropagation(); setView({ x: 140, y: 120, scale: 1 }); }}>
          <Grid size={13} /> Reset view
        </PillButton>
        <span className="text-[11px] text-white/70">Pulse {pulse}</span>
      </div>
    </div>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const actions = [
    { label: 'Bold', icon: <Bold size={13} />, onClick: () => editor?.chain().focus().toggleBold().run(), active: () => editor?.isActive('bold') },
    { label: 'Italic', icon: <Italic size={13} />, onClick: () => editor?.chain().focus().toggleItalic().run(), active: () => editor?.isActive('italic') },
    { label: 'Underline', icon: <Type size={13} />, onClick: () => editor?.chain().focus().toggleUnderline().run(), active: () => editor?.isActive('underline') },
    { label: 'Highlight', icon: <Highlighter size={13} />, onClick: () => editor?.chain().focus().toggleHighlight().run(), active: () => editor?.isActive('highlight') },
    { label: 'Bullet', icon: <List size={13} />, onClick: () => editor?.chain().focus().toggleBulletList().run(), active: () => editor?.isActive('bulletList') },
    { label: 'Quote', icon: <Quote size={13} />, onClick: () => editor?.chain().focus().toggleBlockquote().run(), active: () => editor?.isActive('blockquote') },
  ];

  return (
    <FloatingToolbar className="w-full overflow-x-auto">
      <div className="inline-flex items-center gap-1">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              action.active?.() ? 'bg-[var(--primary-600)] text-white' : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
            title={action.label}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </FloatingToolbar>
  );
}

function MiniToolbar({ editorReady, onNodeInsert }: { editorReady: boolean; onNodeInsert: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold">
        <Wand2 size={12} /> AI-ready
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold">
        <Link2 size={12} /> Cmd/Ctrl + K
      </span>
      <button
        onClick={onNodeInsert}
        className="rounded-full bg-[var(--primary-600)] px-3 py-1 font-semibold text-white hover:bg-[var(--primary-500)]"
      >
        Drop spatial node
      </button>
      {!editorReady && <span className="text-[var(--text-muted)]">Loading editor…</span>}
    </div>
  );
}

function InsightTile({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--primary-600)]">{icon}</span>
      </div>
      <p className="text-xl font-semibold text-[var(--text-primary)] leading-tight">{value}</p>
      <p className="text-[11px] text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold text-[var(--text-primary)]">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[var(--primary-500)] to-[var(--accent-600)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
