'use client';

import React, {
  useState, useEffect, useMemo, useRef, useCallback,
} from 'react';
import {
  useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer,
} from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { useStore } from '@/store/useStore';
import {
  Bold, Italic, Underline as UnderlineIcon, Highlighter, List, Heading1, Heading2,
  Sparkles, X, AlignLeft, LayoutGrid, FileText, Clock, Hash, Maximize2, ImagePlus,
  Settings2, Undo2, Redo2, Maximize, Orbit, Shapes, Wand2, Layers, MousePointer2,
  PenTool, Eraser, Minimize2, Image as ImageIcon, Type, Palette, Brain, Upload,
  Cpu, Zap, ScanLine, ChevronRight, Box, Loader2, GripHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DocumentWorkspace } from '@/components/documents/DocumentWorkspace';
import { HandwritingPad } from './HandwritingPad';
import { NoteCanvasBoard } from './NoteCanvasBoard';
import { AI_FLASHCARD_CARD_LIMIT, AI_SUMMARY_POINT_LIMIT } from '@/lib/ai/constants';
import { escapeHtml } from '@/lib/ai/text';

// ─── Types ────────────────────────────────────────────────────────────────────
type EditorTab = 'write' | 'canvas' | 'ocr';
type AIAction = 'summarize' | 'flashcards' | 'diagram' | '3d';
type PageBackground = 'blank' | 'dots' | 'grid' | 'lines' | 'blueprint';

// ─── Constants ────────────────────────────────────────────────────────────────
const EMOJI_LIST = ['🌌', '🧠', '🫀', '🧬', '🔮', '⚡', '🔥', '💎', '⚕️', '📝', '✨', '🚀', '💡', '🎨', '🧊'];
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=2560&auto=format&fit=crop',
  'none',
];

const THEMES = {
  light: 'bg-[#FCFCFC] text-gray-900',
  dim:   'bg-[#0d0d0d] text-gray-100',
  sepia: 'bg-[#FBF0D9] text-[#5C4B37]',
};

const TAB_CONFIG = [
  {
    id: 'write'  as EditorTab, label: 'Write',          icon: PenTool,
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    glow: 'shadow-violet-500/50', dot: 'bg-violet-400',
    accent: '#8b5cf6',
  },
  {
    id: 'canvas' as EditorTab, label: 'Freeform Board', icon: Shapes,
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
    glow: 'shadow-pink-500/50', dot: 'bg-pink-400',
    accent: '#ec4899',
  },
  {
    id: 'ocr'    as EditorTab, label: 'Cognitive OCR',  icon: Brain,
    gradient: 'from-sky-500 via-blue-500 to-cyan-500',
    glow: 'shadow-sky-500/50', dot: 'bg-sky-400',
    accent: '#0ea5e9',
  },
];

const AI_OPERATIONS = [
  { action: 'summarize' as AIAction, label: 'Executive Synthesis',   desc: 'Distill key insights', icon: AlignLeft, color: 'from-blue-500 to-cyan-500',   glow: 'shadow-blue-500/30' },
  { action: 'flashcards' as AIAction, label: 'Extract Flashcards',   desc: 'Build cognitive blocks', icon: Brain,     color: 'from-pink-500 to-rose-500',   glow: 'shadow-pink-500/30' },
  { action: 'diagram'   as AIAction, label: 'Flux.2 Image Gen',      desc: 'Neural visual render',  icon: Cpu,       color: 'from-emerald-500 to-teal-500',  glow: 'shadow-emerald-500/30' },
  { action: '3d'        as AIAction, label: 'Trellis 3D Object',     desc: 'Spatial 3D synthesis',  icon: Box,       color: 'from-purple-500 to-violet-500',  glow: 'shadow-purple-500/30' },
];

// ─── ResizableImage TipTap Extension ─────────────────────────────────────────
function ResizableImageNodeView({ node, updateAttributes, selected }: any) {
  const [width, setWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const w = node.attrs.width;
      if (typeof w === 'number') setWidth(w);
    }
  }, [node.attrs.width]);

  const startResize = useCallback((e: React.MouseEvent, dir: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    const currentW = containerRef.current?.offsetWidth ?? 400;
    startRef.current = { x: e.clientX, w: currentW };

    const onMove = (mv: MouseEvent) => {
      if (!startRef.current || !containerRef.current) return;
      const delta = mv.clientX - startRef.current.x;
      const newW = Math.max(80, startRef.current.w + (dir === 'right' ? delta : -delta));
      setWidth(newW);
    };

    const onUp = () => {
      if (containerRef.current) updateAttributes({ width: containerRef.current.offsetWidth });
      startRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper as="div" className="relative inline-block my-8 group/img" style={{ width: width ? `${width}px` : node.attrs.width ?? '100%' }}>
      <div ref={containerRef} className="relative">
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          className={`w-full block rounded-3xl transition-all duration-300 shadow-[0_24px_60px_rgba(0,0,0,0.25)] ${selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent' : ''}`}
          draggable={false}
        />

        {/* Selection overlay */}
        {selected && (
          <div className="absolute inset-0 rounded-3xl border-2 border-indigo-500/80 pointer-events-none" />
        )}

        {/* Resize handle — LEFT */}
        <div
          onMouseDown={(e) => startResize(e, 'left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-12 rounded-full bg-white/90 backdrop-blur-md border border-white/40 shadow-xl cursor-ew-resize z-20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center"
        >
          <GripHorizontal size={12} className="text-gray-500 rotate-90" />
        </div>

        {/* Resize handle — RIGHT */}
        <div
          onMouseDown={(e) => startResize(e, 'right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-12 rounded-full bg-white/90 backdrop-blur-md border border-white/40 shadow-xl cursor-ew-resize z-20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center"
        >
          <GripHorizontal size={12} className="text-gray-500 rotate-90" />
        </div>

        {/* Corner resize handle — bottom right */}
        <div
          onMouseDown={(e) => startResize(e, 'right')}
          className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-indigo-500 border-2 border-white shadow-lg cursor-nwse-resize z-20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200"
        />

        {/* Width badge */}
        {selected && width && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-mono font-bold border border-white/10 shadow-xl">
            {width}px
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImageExtension = Node.create({
  name: 'resizableImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: '' },
      title: { default: null },
      width: { default: '100%' },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});

// ─── AI Prompt Modal ──────────────────────────────────────────────────────────
interface AiModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (action: AIAction, prompt: string) => void;
  generating: boolean;
  isDark: boolean;
}

function AiPromptModal({ open, onClose, onSubmit, generating, isDark }: AiModalProps) {
  const [selected, setSelected] = useState<AIAction>('summarize');
  const [prompt, setPrompt] = useState('');
  const needsPrompt = selected === 'diagram' || selected === '3d';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
        style={{ animation: 'fadeIn 0.3s ease' }}
        onClick={onClose}
      />

      {/* Animated gradient mesh behind modal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-violet-500/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-pink-500/25 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
      </div>

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-2xl rounded-[48px] border shadow-[0_80px_160px_-40px_rgba(0,0,0,0.8)] overflow-hidden`}
        style={{ animation: 'scaleIn 0.4s cubic-bezier(0.23,1,0.32,1)' }}
      >
        {/* Glass surface */}
        <div className={`absolute inset-0 ${isDark ? 'bg-[#0f0f14]/85' : 'bg-white/85'} backdrop-blur-[80px]`} />
        <div className={`absolute inset-0 border rounded-[48px] ${isDark ? 'border-white/8' : 'border-black/8'}`} />

        {/* Top gradient stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500" />

        <div className="relative z-10 p-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/40">
                <Wand2 size={24} className="text-white" />
              </div>
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Neural Operations</h2>
                <p className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Choose your synthesis mode</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-3 rounded-2xl transition-all hover:scale-110 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-500'}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Operation cards */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {AI_OPERATIONS.map((op) => (
              <button
                key={op.action}
                onClick={() => setSelected(op.action)}
                className={`group relative p-5 rounded-[28px] text-left transition-all duration-300 overflow-hidden ${
                  selected === op.action
                    ? 'scale-[0.97]'
                    : 'hover:-translate-y-1'
                } ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.07]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
              >
                {/* Active glow */}
                {selected === op.action && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${op.color} opacity-15 rounded-[28px]`} />
                )}
                {/* Border */}
                <div className={`absolute inset-0 rounded-[28px] border transition-all ${
                  selected === op.action
                    ? `border-transparent ring-2 ring-${op.action === 'summarize' ? 'blue' : op.action === 'flashcards' ? 'pink' : op.action === 'diagram' ? 'emerald' : 'purple'}-500/70`
                    : isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
                }`} />

                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${op.color} flex items-center justify-center shadow-lg ${op.glow} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <op.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-black leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{op.label}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{op.desc}</p>
                  </div>
                </div>

                {/* Selected indicator */}
                {selected === op.action && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-white to-white/60 shadow-lg" />
                )}
              </button>
            ))}
          </div>

          {/* Prompt input (only for diagram/3d) */}
          {needsPrompt && (
            <div className="mb-6" style={{ animation: 'slideDown 0.3s cubic-bezier(0.23,1,0.32,1)' }}>
              <label className={`block text-xs font-black uppercase tracking-[0.2em] mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Describe your vision
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={selected === '3d' ? 'A glowing crystal sphere with fractal geometry...' : 'A neural network visualization with flowing data streams...'}
                  rows={3}
                  className={`w-full px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed resize-none outline-none transition-all border ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 text-white placeholder-gray-600 focus:border-violet-500/50 focus:bg-white/[0.07]'
                      : 'bg-black/[0.03] border-black/10 text-gray-900 placeholder-gray-400 focus:border-violet-400/50 focus:bg-black/[0.05]'
                  }`}
                />
                <div className={`absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300 ${prompt.length > 0 ? 'opacity-100' : 'opacity-0'}`}
                  style={{ boxShadow: `0 0 0 2px rgba(139,92,246,0.3)` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => { onSubmit(selected, needsPrompt ? prompt : ''); }}
            disabled={generating || (needsPrompt && !prompt.trim())}
            className={`w-full py-5 rounded-[28px] font-black text-base text-white flex items-center justify-center gap-3 transition-all duration-500 ${
              generating || (needsPrompt && !prompt.trim())
                ? 'opacity-40 cursor-not-allowed bg-gray-500'
                : 'bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 hover:-translate-y-1 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50'
            }`}
          >
            {generating ? (
              <><Loader2 size={20} className="animate-spin" /> Neural link active...</>
            ) : (
              <><Zap size={20} className="group-hover:animate-bounce" /> Activate {AI_OPERATIONS.find(o => o.action === selected)?.label}</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn  { from { opacity: 0; transform: scale(0.92) translateY(24px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes slideDown{ from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

// ─── Image Upload Bar ─────────────────────────────────────────────────────────
interface ImageInsertBarProps {
  onInsert: (src: string) => void;
  isDark: boolean;
  label?: string;
}

function ImageInsertBar({ onInsert, isDark, label = 'Add Image' }: ImageInsertBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onInsert(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUrl = () => {
    const url = window.prompt('Paste image URL:');
    if (url?.trim()) onInsert(url.trim());
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept="image/*,.glb,.gltf" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-105 border ${
          isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' : 'bg-black/5 hover:bg-black/10 text-gray-600 border-black/10'
        }`}
      >
        <Upload size={16} className="text-emerald-400" /> Upload
      </button>
      <button
        onClick={handleUrl}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-105 border ${
          isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' : 'bg-black/5 hover:bg-black/10 text-gray-600 border-black/10'
        }`}
      >
        <ImageIcon size={16} className="text-sky-400" /> URL
      </button>
    </div>
  );
}

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
interface TabBarProps {
  activeTab: EditorTab;
  onChange: (tab: EditorTab) => void;
  isDark: boolean;
}

function TabBar({ activeTab, onChange, isDark }: TabBarProps) {
  const activeIdx = TAB_CONFIG.findIndex(t => t.id === activeTab);

  return (
    <div className={`relative flex items-center gap-1 p-1.5 rounded-[28px] border w-fit ${
      isDark ? 'bg-white/[0.04] border-white/8' : 'bg-black/[0.03] border-black/8'
    }`}>
      {/* Sliding pill */}
      <div
        className={`absolute top-1.5 bottom-1.5 rounded-[22px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          TAB_CONFIG[activeIdx].glow
        } bg-gradient-to-r ${TAB_CONFIG[activeIdx].gradient} shadow-lg`}
        style={{
          // Approximate pill width per tab: each tab ~160px, gap 4px, left padding 6px
          left: `${6 + activeIdx * 164}px`,
          width: '156px',
        }}
      />

      {TAB_CONFIG.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex items-center gap-2.5 px-5 py-3 rounded-[22px] transition-all duration-300 w-[156px] justify-center font-bold text-sm ${
              isActive
                ? 'text-white'
                : isDark
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <tab.icon
              size={16}
              className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}
            />
            <span className="tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main NoteEditor ──────────────────────────────────────────────────────────
export function NoteEditor() {
  const {
    notes, selectedNoteId, updateNote, deleteNote, addFlashcard,
    selectNote, addNote, selectedTopicId, selectedSubjectId, selectedNotebookId,
  } = useStore();

  const note = notes.find((n) => n.id === selectedNoteId);
  const attachmentCount = note?.attachments?.length ?? 0;

  // ── UI State ──
  const [activeTab, setActiveTab]             = useState<EditorTab>('write');
  const [splitMode, setSplitMode]             = useState(false);
  const [showAiModal, setShowAiModal]         = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingTitle, setEditingTitle]       = useState(false);
  const [aiGenerating, setAiGenerating]       = useState(false);
  const [generatedAsset, setGeneratedAsset]   = useState<any>(null);
  const [focusMode, setFocusMode]             = useState(false);
  const [tabEntering, setTabEntering]         = useState(false);

  // ── Canvas State ──
  const [pageBg, setPageBg]           = useState<PageBackground>('dots');
  const [fullWidth, setFullWidth]     = useState(false);
  const [pageIcon, setPageIcon]       = useState('🌌');
  const [coverImage, setCoverImage]   = useState(COVER_IMAGES[0]);
  const [activeTheme, setActiveTheme] = useState<'light' | 'dim' | 'sepia'>('dim');

  const isDark = activeTheme === 'dim';

  // ── Stats ──
  const wordCount = useMemo(() =>
    note?.content.replace(/<[^>]*>?/gm, ' ').trim().split(/\s+/).filter(w => w.length > 0).length || 0,
  [note?.content]);
  const readingTime = Math.ceil(wordCount / 200) || 1;

  // ── Tab switch animation ──
  const handleTabChange = (tab: EditorTab) => {
    setTabEntering(true);
    setActiveTab(tab);
    setTimeout(() => setTabEntering(false), 400);
  };

  // ── TipTap Editor ──
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Highlight.configure({ multicolor: true }),
      Underline, TextStyle, Color,
      ResizableImageExtension,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-indigo-400 hover:text-indigo-300 font-semibold underline decoration-indigo-500/30 underline-offset-4 transition-colors' },
      }),
    ],
    content: note?.content ?? '',
    onUpdate: ({ editor: e }) => {
      if (note) updateNote(note.id, { content: e.getHTML() });
    },
    editorProps: {
      attributes: {
        class: `prose prose-xl max-w-none focus:outline-none min-h-[60vh] pb-64 pt-6 leading-[1.85] selection:bg-indigo-500/30 selection:text-indigo-200 ${
          isDark ? 'prose-invert prose-headings:text-white prose-p:text-gray-200 prose-li:text-gray-200' : ''
        }`,
      },
    },
  }, [note?.id, activeTheme]);

  useEffect(() => {
    if (editor && note && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content);
    }
    if (attachmentCount > 0) setSplitMode(true);
  }, [editor, note?.id, attachmentCount]);

  // ── Image insertion ──
  const insertImage = useCallback((src: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'resizableImage',
      attrs: { src, width: '100%' },
    }).run();
  }, [editor]);

  // ── AI handler ──
  const handleAI = async (action: AIAction, prompt: string) => {
    if (!note) return;
    setShowAiModal(false);
    setAiGenerating(true);
    const model = action === '3d' ? 'microsoft/trellis' : 'black-forest-labs/flux.2-klein-4b';

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action, model, prompt,
          note: { title: note.title, content: note.content, tags: note.tags },
        }),
      });
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();

      if (action === 'summarize') {
        const points = (data.summaryPoints ?? []).slice(0, AI_SUMMARY_POINT_LIMIT);
        if (points.length > 0) {
          const html = `<div style="background:rgba(255,255,255,0.03);backdrop-filter:blur(24px);padding:40px;border-radius:32px;margin:40px 0;border:1px solid rgba(255,255,255,0.1);box-shadow:0 40px 80px -20px rgba(0,0,0,0.5)">
            <h3 style="color:#a78bfa;margin-top:0;font-size:1.5rem;font-weight:900;">✨ Executive Synthesis</h3>
            <ul style="color:#cbd5e1;font-size:1.1rem;line-height:1.8">${points.map((p: string) => `<li style="margin-bottom:14px">${escapeHtml(p)}</li>`).join('')}</ul>
          </div>`;
          updateNote(note.id, { content: `${note.content}${html}` });
          toast.success('Synthesis injected.');
        }
      } else if (action === 'flashcards') {
        const cards = (data.flashcards ?? []).filter((c: any) => c.front && c.back);
        if (cards.length > 0) {
          cards.forEach((c: any) => addFlashcard(c.front, c.back, note.id, note.tags));
          toast.success(`${cards.length} flashcards extracted.`);
        }
      } else {
        const rawUrl = data.generated?.assetUrl || data.generated?.previewImage || data.generated?.raw?.url;
        let src = rawUrl?.replace(/\s+/g, '') || '';
        if (src && !src.startsWith('http') && !src.startsWith('data:')) src = `data:image/jpeg;base64,${src}`;
        if (src) setGeneratedAsset({ title: action === '3d' ? '🧊 3D Asset' : '🖼️ Neural Render', prompt, assetUrl: src, action });
      }
    } catch {
      toast.error('Neural pathway disrupted.');
    } finally {
      setAiGenerating(false);
    }
  };

  const insertGeneratedAsset = () => {
    if (!generatedAsset || !editor) return;
    const isImg = generatedAsset.assetUrl.startsWith('data:image') || /\.(jpeg|jpg|gif|png|webp)$/i.test(generatedAsset.assetUrl);
    if (isImg) {
      insertImage(generatedAsset.assetUrl);
    } else {
      const html = `<p><a href="${escapeHtml(generatedAsset.assetUrl)}" target="_blank" style="color:#6366f1;font-weight:bold">🧊 View 3D Asset: ${escapeHtml(generatedAsset.prompt)}</a></p>`;
      editor.chain().focus().insertContent(html).run();
    }
    setGeneratedAsset(null);
    toast.success('Asset embedded.');
  };

  // ── Background patterns ──
  const bgPatternClass = useMemo(() => {
    const dotColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const lineColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const patterns: Record<PageBackground, string> = {
      blank:     '',
      dots:      `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
      grid:      `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
      lines:     `linear-gradient(transparent 31px, ${lineColor} 31px)`,
      blueprint: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
    };
    const sizes: Record<PageBackground, string> = {
      blank: '', dots: '28px 28px', grid: '40px 40px', lines: '100% 32px', blueprint: '40px 40px',
    };
    return { backgroundImage: patterns[pageBg], backgroundSize: sizes[pageBg] || 'auto' };
  }, [pageBg, isDark]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (!note) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center overflow-hidden relative ${THEMES[activeTheme]}`}>
        <div className="fixed top-0 left-1/4 w-[700px] h-[700px] bg-indigo-500/15 rounded-full blur-[150px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative w-36 h-36 rounded-[44px] border flex items-center justify-center mb-10 group cursor-default overflow-hidden"
          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-all duration-700" />
          <Sparkles size={52} className="text-indigo-400" />
        </div>
        <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4">
          Initialize Mind Canvas
        </h2>
        <p className={`text-lg text-center max-w-md leading-relaxed mb-12 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          A boundless space for writing, drawing, and cognitive synthesis — powered by neural AI.
        </p>
        <button
          onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)}
          className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black rounded-full shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all duration-500 text-base"
        >
          <ImagePlus size={20} /> Create Workspace
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const activeTabCfg = TAB_CONFIG.find(t => t.id === activeTab)!;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative transition-colors duration-700 ${THEMES[activeTheme]}`}>

      {/* ── Ambient glows ── */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] rounded-full blur-[180px] pointer-events-none mix-blend-screen opacity-40 animate-pulse"
        style={{ background: `radial-gradient(circle, ${activeTabCfg.accent}30 0%, transparent 70%)`, animationDuration: '8s' }} />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none mix-blend-screen opacity-30 animate-pulse"
        style={{ background: 'radial-gradient(circle, #8b5cf640 0%, transparent 70%)', animationDuration: '12s', animationDelay: '3s' }} />

      {/* ── TOP NAVBAR ── */}
      {!focusMode && (
        <div className={`h-16 border-b flex items-center px-6 justify-between shrink-0 z-40 sticky top-0 backdrop-blur-3xl transition-all ${
          isDark ? 'border-white/[0.06] bg-black/20' : 'border-black/[0.06] bg-white/20'
        }`}>
          <div className={`flex items-center gap-5 text-sm font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="flex items-center gap-2"><Clock size={14} className="text-indigo-400" />{readingTime}m read</span>
            <span className="flex items-center gap-2"><Hash size={14} className="text-emerald-400" />{wordCount} words</span>
            {aiGenerating && (
              <span className="flex items-center gap-2 text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 text-xs">
                <Loader2 size={12} className="animate-spin" /> Neural link active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Focus mode */}
            <button onClick={() => setFocusMode(true)}
              className={`p-2.5 rounded-xl border transition-all hover:scale-105 backdrop-blur-md ${isDark ? 'bg-white/[0.04] border-white/8 text-gray-400 hover:text-white' : 'bg-black/[0.04] border-black/8 text-gray-500 hover:text-black'}`}>
              <Maximize size={16} />
            </button>

            {/* Split */}
            <button onClick={() => setSplitMode(!splitMode)}
              className={`p-2.5 rounded-xl border transition-all hover:scale-105 backdrop-blur-md ${splitMode ? 'bg-indigo-500 text-white border-transparent shadow-lg shadow-indigo-500/30' : isDark ? 'bg-white/[0.04] border-white/8 text-gray-400 hover:text-white' : 'bg-black/[0.04] border-black/8 text-gray-500 hover:text-black'}`}>
              <LayoutGrid size={16} />
            </button>

            {/* Settings */}
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)}
                className={`p-2.5 rounded-xl border transition-all hover:scale-105 backdrop-blur-md ${isDark ? 'bg-white/[0.04] border-white/8 text-gray-400 hover:text-white' : 'bg-black/[0.04] border-black/8 text-gray-500 hover:text-black'}`}>
                <Settings2 size={16} />
              </button>

              {showSettings && (
                <div className={`absolute right-0 top-full mt-3 w-80 rounded-[32px] border shadow-[0_40px_80px_rgba(0,0,0,0.4)] p-6 z-50 backdrop-blur-[60px] ${isDark ? 'bg-[#111]/90 border-white/8' : 'bg-white/90 border-black/8'}`}
                  style={{ animation: 'scaleIn 0.25s cubic-bezier(0.23,1,0.32,1)' }}>
                  <p className="text-[10px] font-black tracking-[0.25em] uppercase text-gray-500 mb-4">Canvas Pattern</p>
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {(['blank','dots','grid','lines','blueprint'] as PageBackground[]).map(bg => (
                      <button key={bg} onClick={() => setPageBg(bg)}
                        className={`aspect-square rounded-2xl flex items-center justify-center text-xs transition-all duration-300 ${pageBg === bg ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-105' : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-black/5 text-gray-500 hover:bg-black/10'}`}>
                        {bg === 'blank' ? <FileText size={16}/> : bg === 'blueprint' ? <Layers size={16}/> : bg === 'dots' ? <LayoutGrid size={16}/> : bg === 'grid' ? <GripHorizontal size={16}/> : <List size={16}/>}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] font-black tracking-[0.25em] uppercase text-gray-500 mb-4">Theme</p>
                  <div className="flex gap-2 mb-6">
                    {(['light','dim','sepia'] as const).map(t => (
                      <button key={t} onClick={() => setActiveTheme(t)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all capitalize ${
                          activeTheme === t
                            ? t === 'light' ? 'bg-white text-black border-gray-200 shadow' : t === 'dim' ? 'bg-[#111] text-white border-white/20 shadow' : 'bg-[#FBF0D9] text-[#5C4B37] border-[#5C4B37]/20 shadow'
                            : 'bg-transparent text-gray-500 border-transparent'
                        }`}>{t}</button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setFullWidth(false)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${!fullWidth ? (isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/10 text-black border-black/20') : 'text-gray-500 border-transparent'}`}>Centered</button>
                    <button onClick={() => setFullWidth(true)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${fullWidth ? (isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/10 text-black border-black/20') : 'text-gray-500 border-transparent'}`}>Full Width</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Focus mode exit */}
      {focusMode && (
        <button onClick={() => setFocusMode(false)}
          className="fixed top-8 right-8 z-[200] p-4 bg-white/10 backdrop-blur-2xl border border-white/20 text-white rounded-full hover:bg-white/20 hover:scale-110 transition-all shadow-2xl">
          <Minimize2 size={20} />
        </button>
      )}

      {/* ── MAIN SCROLL AREA ── */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`flex-1 overflow-y-auto relative scroll-smooth scrollbar-hide`}
          style={{ ...bgPatternClass, backgroundColor: activeTheme === 'blueprint' ? '#0f172a' : undefined }}
        >

          {/* Cover image */}
          <div className="relative group">
            {coverImage !== 'none' ? (
              <div className={`relative w-full overflow-hidden transition-all duration-[1.5s] ${focusMode ? 'h-[20vh]' : 'h-[42vh]'}`}>
                <img src={coverImage} alt="" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[3s] ease-out" />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-black/10 ${isDark ? 'to-[#0d0d0d]' : activeTheme === 'sepia' ? 'to-[#FBF0D9]' : 'to-[#FCFCFC]'}`} />
              </div>
            ) : <div className="h-24" />}

            <button onClick={() => setShowCoverPicker(!showCoverPicker)}
              className="absolute top-6 right-6 px-5 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2 shadow-xl hover:scale-105">
              <Palette size={14} /> Change Cover
            </button>

            {showCoverPicker && (
              <div className={`absolute right-6 top-16 w-80 rounded-[32px] border shadow-2xl p-4 z-50 grid grid-cols-2 gap-3 backdrop-blur-[60px] ${isDark ? 'bg-[#111]/90 border-white/8' : 'bg-white/90 border-black/8'}`}>
                {COVER_IMAGES.map((img, i) => (
                  <button key={i} onClick={() => { setCoverImage(img); setShowCoverPicker(false); }}
                    className={`h-20 rounded-2xl overflow-hidden border-2 transition-all ${coverImage === img ? 'border-indigo-500 scale-[0.96]' : 'border-transparent hover:scale-[1.03] hover:shadow-lg'}`}>
                    {img === 'none'
                      ? <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-white/5 text-gray-500' : 'bg-black/5 text-gray-400'}`}>Minimal</div>
                      : <img src={img} alt="" className="w-full h-full object-cover" />
                    }
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── PAGE CONTENT ── */}
          <div className={`relative z-10 mx-auto transition-all duration-1000 ${fullWidth ? 'max-w-[96%]' : 'max-w-[1080px]'}`}>

            {/* Page icon */}
            <div className="relative -mt-24 ml-10 mb-8 inline-block z-20">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-[100px] leading-none drop-shadow-2xl hover:scale-110 hover:-rotate-6 transition-transform duration-500 select-none block">
                {pageIcon}
              </button>
              {showEmojiPicker && (
                <div className={`absolute left-0 top-full mt-3 w-80 rounded-[28px] border shadow-2xl p-4 grid grid-cols-5 gap-2 z-50 backdrop-blur-[60px] ${isDark ? 'bg-[#111]/90 border-white/8' : 'bg-white/90 border-black/8'}`}>
                  {EMOJI_LIST.map(e => (
                    <button key={e} onClick={() => { setPageIcon(e); setShowEmojiPicker(false); }}
                      className={`text-3xl aspect-square flex items-center justify-center rounded-2xl hover:scale-125 transition-transform ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>{e}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="px-10 pb-6">
              {editingTitle ? (
                <input
                  autoFocus
                  className={`text-[5.5rem] font-black w-full outline-none bg-transparent tracking-tighter leading-[1.05] placeholder-gray-500/40 ${isDark ? 'text-white' : activeTheme === 'sepia' ? 'text-[#3E3224]' : 'text-gray-900'}`}
                  value={note.title}
                  onChange={(e) => updateNote(note.id, { title: e.target.value })}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                  placeholder="Untitled Matrix..."
                />
              ) : (
                <h1
                  onClick={() => setEditingTitle(true)}
                  className={`text-[5.5rem] font-black cursor-text hover:opacity-75 transition-opacity tracking-tighter leading-[1.05] ${isDark ? 'text-white' : activeTheme === 'sepia' ? 'text-[#3E3224]' : 'text-gray-900'}`}
                >
                  {note.title || 'Untitled Matrix'}
                </h1>
              )}
            </div>

            {/* ── TAB SWITCHER ── */}
            <div className="px-10 mb-8">
              <TabBar activeTab={activeTab} onChange={handleTabChange} isDark={isDark} />
            </div>

            {/* ── TAB CONTENT ── */}
            <div
              className={`transition-all duration-400 ${tabEntering ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}
              style={{ transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.23,1,0.32,1)' }}
            >

              {/* ──────────── WRITE TAB ──────────── */}
              {activeTab === 'write' && (
                <div className="px-10 pb-10">
                  {/* Mini image bar above editor */}
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Rich Text Canvas</p>
                    <ImageInsertBar onInsert={insertImage} isDark={isDark} />
                  </div>

                  {/* Editor */}
                  <EditorContent editor={editor} />

                  {/* Bubble menu */}
                  {editor && (
                    <BubbleMenu editor={editor}
                      className={`flex overflow-hidden backdrop-blur-3xl border shadow-[0_20px_40px_rgba(0,0,0,0.3)] rounded-3xl p-1.5 ${isDark ? 'bg-[#1a1a1a]/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} isDark={isDark}><Bold size={16} /></ToolbarBtn>
                      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} isDark={isDark}><Italic size={16} /></ToolbarBtn>
                      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} isDark={isDark}><UnderlineIcon size={16} /></ToolbarBtn>
                      <div className={`w-px my-2 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                      <ToolbarBtn onClick={() => setShowAiModal(true)} isDark={isDark}><Wand2 size={16} className="text-purple-400" /></ToolbarBtn>
                    </BubbleMenu>
                  )}
                </div>
              )}

              {/* ──────────── CANVAS TAB ──────────── */}
              {activeTab === 'canvas' && (
                <div className="px-10 pb-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-xl shadow-pink-500/30">
                        <Shapes size={22} className="text-white" />
                      </div>
                      <div>
                        <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Freeform Board</h3>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Infinite vector canvas — draw, sketch, diagram</p>
                      </div>
                    </div>
                    <ImageInsertBar onInsert={(src) => toast.success('Image added to canvas')} isDark={isDark} />
                  </div>

                  <div className={`rounded-[40px] overflow-hidden border shadow-[0_20px_60px_rgba(0,0,0,0.15)] min-h-[700px] relative flex flex-col ${isDark ? 'bg-black/40 border-white/8' : 'bg-white/70 border-black/8'}`}>
                    {/* Canvas toolbar */}
                    <div className={`flex items-center gap-3 px-6 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                      {[
                        { icon: MousePointer2, label: 'Select',  color: 'text-indigo-400' },
                        { icon: PenTool,       label: 'Draw',    color: 'text-pink-400' },
                        { icon: Shapes,        label: 'Shapes',  color: 'text-emerald-400' },
                        { icon: Eraser,        label: 'Erase',   color: 'text-amber-400' },
                      ].map(({ icon: Icon, label, color }, i) => (
                        <button key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 border ${
                          i === 0
                            ? isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-black/10 border-black/15 text-black'
                            : isDark ? 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white' : 'border-transparent text-gray-400 hover:bg-black/5 hover:text-black'
                        }`}>
                          <Icon size={15} className={i === 0 ? '' : color} /> {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1">
                      <NoteCanvasBoard note={note} />
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────── OCR TAB ──────────── */}
              {activeTab === 'ocr' && (
                <div className="px-10 pb-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-xl shadow-sky-500/30">
                        <Brain size={22} className="text-white" />
                      </div>
                      <div>
                        <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Cognitive OCR</h3>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Neural handwriting recognition — write to transcribe</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ImageInsertBar onInsert={(src) => toast.success('Image added to OCR pad')} isDark={isDark} />
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-black/5 border-black/10 text-gray-600'}`}>
                        <ScanLine size={15} className="text-sky-400 animate-pulse" />
                        <span>OCR Active</span>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-[40px] overflow-hidden border shadow-[0_20px_60px_rgba(0,0,0,0.15)] min-h-[700px] relative ${isDark ? 'bg-black/40 border-white/8' : 'bg-white/70 border-black/8'}`}>
                    {/* OCR toolbar */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                      <div className="flex items-center gap-3">
                        {[
                          { icon: PenTool, label: 'Pen',   color: 'text-blue-400' },
                          { icon: Eraser,  label: 'Erase', color: 'text-rose-400' },
                        ].map(({ icon: Icon, label, color }, i) => (
                          <button key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 border ${
                            i === 0
                              ? isDark ? 'bg-sky-500/15 border-sky-500/30 text-sky-300' : 'bg-sky-500/10 border-sky-500/20 text-sky-600'
                              : isDark ? 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white' : 'border-transparent text-gray-400 hover:bg-black/5 hover:text-black'
                          }`}>
                            <Icon size={15} className={i === 0 ? '' : color} /> {label}
                          </button>
                        ))}
                      </div>
                      <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:-translate-y-0.5 transition-all`}>
                        <ChevronRight size={16} /> Transcribe to Note
                      </button>
                    </div>

                    <HandwritingPad note={note} />
                  </div>
                </div>
              )}

            </div>{/* end tab content */}
          </div>{/* end page content */}

        </div>{/* end main scroll */}

        {/* ── SPLIT SIDEBAR ── */}
        {splitMode && !focusMode && (
          <div className={`w-[440px] border-l overflow-y-auto z-30 flex flex-col gap-6 p-8 shrink-0 backdrop-blur-3xl animate-in slide-in-from-right-8 duration-400 ${isDark ? 'bg-black/40 border-white/[0.06]' : 'bg-white/60 border-black/[0.06]'}`}>
            <div className={`rounded-[36px] p-8 border ${isDark ? 'bg-white/[0.03] border-white/8' : 'bg-white/80 border-black/8 shadow-lg'}`}>
              <h3 className={`text-lg font-black mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <div className="p-2.5 bg-indigo-500/15 rounded-2xl text-indigo-400"><Layers size={20} /></div>
                Document Cortex
              </h3>
              <DocumentWorkspace note={note} compact />
            </div>
          </div>
        )}
      </div>{/* end main row */}

      {/* ── FLOATING DOCK ── */}
      {!focusMode && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]">
          <div className={`backdrop-blur-[70px] border shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] px-4 py-4 rounded-[44px] flex items-center gap-1.5 ${isDark ? 'bg-[#0f0f14]/80 border-white/10 text-white' : 'bg-white/80 border-black/8 text-gray-900'}`}>

            <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()} isDark={isDark}><Undo2 size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().redo().run()} isDark={isDark}><Redo2 size={20} /></ToolbarBtn>
            <Divider isDark={isDark} />

            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} isDark={isDark}><Bold size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} isDark={isDark}><Italic size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} isDark={isDark}><UnderlineIcon size={20} /></ToolbarBtn>
            <Divider isDark={isDark} />

            {/* Text color */}
            <div className={`relative p-3.5 rounded-3xl transition-all cursor-pointer border hover:scale-110 ${isDark ? 'hover:bg-white/10 border-transparent text-gray-300' : 'hover:bg-black/5 border-transparent text-gray-600'}`}>
              <Type size={20} />
              <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
            </div>

            {/* Highlight */}
            <div className={`relative p-3.5 rounded-3xl transition-all cursor-pointer border hover:scale-110 ${isDark ? 'hover:bg-white/10 border-transparent text-gray-300' : 'hover:bg-black/5 border-transparent text-gray-600'}`}>
              <Highlighter size={20} />
              <input type="color" defaultValue="#fde68a" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
            </div>

            <Divider isDark={isDark} />
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} isDark={isDark}><Heading1 size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} isDark={isDark}><Heading2 size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} isDark={isDark}><List size={20} /></ToolbarBtn>
            <Divider isDark={isDark} />

            {/* Image upload from dock */}
            <div className={`relative p-3.5 rounded-3xl transition-all cursor-pointer border hover:scale-110 ${isDark ? 'hover:bg-white/10 border-transparent' : 'hover:bg-black/5 border-transparent'}`}>
              <ImageIcon size={20} className="text-emerald-400" />
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => insertImage(reader.result as string);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* AI Button */}
            <div className="ml-2">
              <button
                onClick={() => setShowAiModal(true)}
                className={`flex items-center justify-center p-4 rounded-[28px] shadow-2xl transition-all duration-500 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 text-white hover:scale-110 hover:-translate-y-2 hover:shadow-purple-500/50 ${aiGenerating ? 'opacity-70 animate-pulse' : ''}`}
              >
                <Wand2 size={24} className={aiGenerating ? 'animate-spin' : 'animate-pulse'} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI MODAL ── */}
      <AiPromptModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSubmit={handleAI}
        generating={aiGenerating}
        isDark={isDark}
      />

      {/* ── GENERATED ASSET PREVIEW ── */}
      {generatedAsset && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-8 bg-black/50 backdrop-blur-2xl">
          <div className={`w-full max-w-xl rounded-[52px] border shadow-[0_80px_160px_rgba(0,0,0,0.7)] p-10 relative overflow-hidden ${isDark ? 'bg-[#0f0f14]/90 border-white/10' : 'bg-white/90 border-black/8'}`}
            style={{ animation: 'scaleIn 0.5s cubic-bezier(0.23,1,0.32,1)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-pink-500/10 rounded-[52px] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className={`text-2xl font-black flex items-center gap-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/40 text-white"><Sparkles size={22} /></div>
                Synthesis Complete
              </h3>
              <button onClick={() => setGeneratedAsset(null)} className={`p-3 rounded-2xl transition-all hover:scale-110 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-black/5 hover:bg-black/10 text-gray-500'}`}><X size={18} /></button>
            </div>

            <div className={`rounded-[36px] overflow-hidden mb-8 border relative z-10 ${isDark ? 'bg-black/40 border-white/[0.06]' : 'bg-gray-50 border-black/[0.06]'}`} style={{ height: '360px' }}>
              <img src={generatedAsset.assetUrl} alt="" className="w-full h-full object-contain p-4" />
            </div>

            <div className="flex gap-4 relative z-10">
              <button onClick={() => setGeneratedAsset(null)} className={`flex-1 py-4 rounded-[24px] font-bold text-sm transition-all hover:scale-105 border ${isDark ? 'bg-white/5 hover:bg-white/8 text-white border-white/10' : 'bg-black/5 hover:bg-black/8 text-black border-black/10'}`}>Discard</button>
              <button onClick={insertGeneratedAsset} className="flex-[2] py-4 rounded-[24px] font-black text-sm text-white bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 shadow-xl shadow-purple-500/30 hover:-translate-y-0.5 hover:shadow-purple-500/50 transition-all">Embed into Canvas</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Divider({ isDark }: { isDark: boolean }) {
  return <div className={`w-px h-10 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />;
}

function ToolbarBtn({
  onClick, active, children, isDark,
}: {
  onClick?: () => void; active?: boolean; children: React.ReactNode; isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3.5 rounded-3xl transition-all duration-300 flex items-center justify-center hover:scale-110 ${
        active
          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
          : isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}
