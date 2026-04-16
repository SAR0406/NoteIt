'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useStore } from '@/store/useStore';
import {
  Bold, Italic, Underline as UnderlineIcon, Highlighter, List, Heading1, Heading2, 
  Trash2, Brain, Sparkles, X, AlignLeft, LayoutGrid, GripHorizontal, FileText, 
  Clock, Hash, Maximize2, CheckCircle2, ImagePlus, Settings2, Undo2, Redo2, 
  Maximize, Orbit, Shapes, Wand2, Layers, MousePointer2, PenTool, Eraser, 
  Minimize2, Image as ImageIcon, Type, Palette
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DocumentWorkspace } from '@/components/documents/DocumentWorkspace';
import { HandwritingPad } from './HandwritingPad';
import { NoteCanvasBoard } from './NoteCanvasBoard';
import { AI_FLASHCARD_CARD_LIMIT, AI_SUMMARY_POINT_LIMIT } from '@/lib/ai/constants';
import { escapeHtml } from '@/lib/ai/text';

type AIAction = 'summarize' | 'flashcards' | 'diagram' | '3d';
type PageBackground = 'blank' | 'dots' | 'grid' | 'lines' | 'blueprint';

const EMOJI_LIST = ['🌌', '🧠', '🫀', '🧬', '🔮', '⚡', '🔥', '💎', '⚕️', '📝', '✨', '🚀', '💡', '🎨', '🧊'];
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=2560&auto=format&fit=crop',
  'none'
];

// --- ADVANCED THEME ENGINE ---
const THEMES = {
  light: 'bg-[#FCFCFC] text-gray-900',
  dim: 'bg-[#121212] text-gray-100',
  sepia: 'bg-[#FBF0D9] text-[#5C4B37]'
};

export function NoteEditor() {
  const {
    notes, selectedNoteId, updateNote, deleteNote, addFlashcard, selectNote, addNote, 
    selectedTopicId, selectedSubjectId, selectedNotebookId,
  } = useStore();

  const note = notes.find((n) => n.id === selectedNoteId);
  const attachmentCount = note?.attachments.length ?? 0;

  // --- ELITE UI STATES ---
  const [splitMode, setSplitMode] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'generating' | 'success' | 'fallback'>('idle');
  const [generatedAsset, setGeneratedAsset] = useState<any | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  
  // --- CANVAS CUSTOMIZATION ---
  const [pageBg, setPageBg] = useState<PageBackground>('dots');
  const [fullWidth, setFullWidth] = useState(false);
  const [pageIcon, setPageIcon] = useState('🌌');
  const [coverImage, setCoverImage] = useState(COVER_IMAGES[0]);
  const [activeTheme, setActiveTheme] = useState<'light'|'dim'|'sepia'>('dim');

  const wordCount = useMemo(() => note?.content.replace(/<[^>]*>?/gm, ' ').trim().split(/\s+/).filter(w => w.length > 0).length || 0, [note?.content]);
  const readingTime = Math.ceil(wordCount / 200) || 1;

  // --- PREMIUM TIPTAP EDITOR ---
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Highlight.configure({ multicolor: true }), 
      Underline, TextStyle, Color,
      Image.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: 'rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.15)] my-10 mx-auto max-w-[95%] border border-white/10 transition-all duration-700 hover:shadow-[0_30px_60px_rgb(0,0,0,0.25)] hover:scale-[1.02] cursor-crosshair block ring-1 ring-white/5' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-400 hover:text-indigo-300 font-semibold underline decoration-indigo-500/30 hover:decoration-indigo-400 underline-offset-4 transition-all' } }),
    ],
    content: note?.content ?? '',
    onUpdate: ({ editor: currentEditor }) => { if (note) updateNote(note.id, { content: currentEditor.getHTML() }); },
    editorProps: {
      attributes: { class: `prose prose-2xl max-w-none focus:outline-none min-h-[60vh] pb-64 pt-8 leading-[1.8] font-sans selection:bg-indigo-500/30 selection:text-indigo-200 ${activeTheme === 'dim' ? 'prose-invert text-gray-200/90' : activeTheme === 'sepia' ? 'text-[#5C4B37]/90' : 'text-gray-800/90'}` },
    },
  }, [note?.id, activeTheme]);

  useEffect(() => {
    if (editor && note && editor.getHTML() !== note.content) editor.commands.setContent(note.content);
    if (attachmentCount > 0) setSplitMode(true);
  }, [editor, note, attachmentCount]);

  const addImage = () => {
    const url = window.prompt('Paste High-Res Image URL or Base64:');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  };

  const handleAI = async (action: AIAction) => {
    if (!note) return;
    let prompt = ''; let image = '';
    const model = action === '3d' ? 'microsoft/trellis' : 'black-forest-labs/flux.2-klein-4b';

    if (action === 'diagram' || action === '3d') {
      const input = window.prompt('Describe the neural generation:', note.title || '');
      if (!input?.trim()) return; prompt = input.trim();
    }

    setAiState('generating');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, model, prompt, image, note: { title: note.title, content: note.content, tags: note.tags } }),
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();

      if (action === 'summarize') {
        const points = (data.summaryPoints ?? []).slice(0, AI_SUMMARY_POINT_LIMIT);
        if (points.length > 0) {
          const summaryHtml = `<div style="background: rgba(255,255,255,0.03); backdrop-filter: blur(24px); padding:40px; border-radius:32px; margin: 40px 0; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);">
            <h3 style="color: #818cf8; margin-top: 0; display: flex; align-items: center; gap: 12px; font-size: 1.75rem; letter-spacing: -0.03em; font-weight: 900;">✨ Executive Synthesis</h3>
            <ul style="color: #cbd5e1; font-size: 1.125rem; line-height: 1.8;">${points.map((p: string) => `<li style="margin-bottom: 16px;">${escapeHtml(p)}</li>`).join('')}</ul>
          </div>`;
          updateNote(note.id, { content: `${note.content}${summaryHtml}` });
          setAiState('success'); toast.success('Synthesis injected into canvas.');
        }
      } else if (action === 'flashcards') {
        const cards = (data.flashcards ?? []).filter((c: any) => c.front && c.back);
        if (cards.length > 0) {
          cards.forEach((c: any) => addFlashcard(c.front, c.back, note.id, note.tags));
          setAiState('success'); toast.success(`Extracted ${cards.length} cognitive blocks.`);
        }
      } else {
        const rawUrl = data.generated?.assetUrl || data.generated?.previewImage || data.generated?.raw?.url || data.generated?.raw?.image;
        let safeAsset = rawUrl?.replace(/\s+/g, '') || '';
        if (safeAsset && !safeAsset.startsWith('http') && !safeAsset.startsWith('data:')) safeAsset = `data:image/jpeg;base64,${safeAsset}`;

        if (safeAsset) {
          setGeneratedAsset({ title: action === '3d' ? '🧊 Spacial 3D Matrix' : '🖼️ Neural Visual Rendering', prompt, assetUrl: safeAsset, action });
          setAiState('success');
        }
      }
    } catch { setAiState('fallback'); toast.error('Neural pathway disrupted.'); }
  };

  const insertGeneratedAsset = () => {
    if (!generatedAsset || !editor) return;
    const isImage = generatedAsset.assetUrl.startsWith('data:image') || generatedAsset.assetUrl.match(/\.(jpeg|jpg|gif|png)$/i);
    const resultHtml = `<div style="padding: 4px; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); border-radius: 32px; margin: 40px 0; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.3);">
      <div style="background: rgba(20,20,20,0.8); backdrop-filter: blur(20px); border-radius: 28px; padding: 32px; border: 1px solid rgba(255,255,255,0.05);">
        <h3 style="margin-top: 0; color: #e0e7ff; font-size: 1.5rem; font-weight: 800;">✨ ${generatedAsset.title}</h3>
        <p style="font-size: 1rem; color: #94a3b8; margin-bottom: 24px; font-style: italic;">"${escapeHtml(generatedAsset.prompt)}"</p>
        ${isImage ? `<img src="${escapeHtml(generatedAsset.assetUrl)}" style="border-radius: 20px; width: 100%; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);" />` : `<a href="${escapeHtml(generatedAsset.assetUrl)}" target="_blank" style="display: inline-block; background: #fff; color: #000; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: 800;">🧊 Enter 3D Viewer</a>`}
      </div>
    </div>`;
    editor.chain().focus().insertContent(resultHtml).run();
    setGeneratedAsset(null);
  };

  if (!note) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden ${THEMES[activeTheme]}`}>
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"><Orbit size={800} strokeWidth={0.5}/></div>
        <div className="relative w-32 h-32 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/20 rounded-[40px] flex items-center justify-center mb-10 transform hover:-translate-y-4 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer group" onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)}>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[40px] opacity-0 group-hover:opacity-20 transition-opacity duration-700"></div>
          <Sparkles size={48} className="text-indigo-400" />
        </div>
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4 tracking-tighter">Initialize Mind Canvas</h2>
        <p className="text-gray-400 text-lg max-w-lg text-center leading-relaxed font-medium mb-12">A boundless space for cognitive offloading. Write, draw, and synthesize ideas with neural AI.</p>
        <button onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)} className="px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-indigo-500/25 hover:-translate-y-1 flex items-center gap-3 text-lg group">
          <ImagePlus size={22} className="group-hover:rotate-12 transition-transform"/> Create Workspace
        </button>
      </div>
    );
  }

  const isDark = activeTheme === 'dim';

  const bgStyles = {
    blank: '',
    dots: `bg-[radial-gradient(var(--tw-gradient-stops))] ${isDark ? 'from-white/5' : 'from-black/5'} to-transparent [background-size:32px_32px]`,
    grid: `bg-[linear-gradient(to_right,var(--tw-gradient-stops)),linear-gradient(to_bottom,var(--tw-gradient-stops))] ${isDark ? 'from-white/5' : 'from-black/5'} to-transparent [background-size:40px_40px]`,
    lines: `bg-[linear-gradient(transparent_39px,var(--tw-gradient-stops))] ${isDark ? 'from-white/5' : 'from-black/5'} to-transparent [background-size:100%_40px]`,
    blueprint: 'bg-[#0f172a] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] [background-size:40px_40px]'
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-500 ${THEMES[activeTheme]}`}>
      
      {/* 🔮 AMBIENT BACKGROUND GLOWS */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen opacity-60 animate-pulse" style={{ animationDuration: '10s' }}></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-60 animate-pulse" style={{ animationDuration: '14s' }}></div>

      {/* ⚡ GLASS TOP NAVBAR */}
      <div className={`h-16 backdrop-blur-3xl border-b flex items-center px-8 justify-between shrink-0 z-40 sticky top-0 transition-all duration-500 ${focusMode ? '-translate-y-full opacity-0 absolute' : 'translate-y-0 opacity-100'} ${isDark ? 'bg-black/40 border-white/5' : 'bg-white/40 border-black/5'}`}>
        <div className={`flex items-center gap-6 text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="flex items-center gap-2"><Clock size={16} className="text-indigo-400"/> {readingTime} min</span>
          <span className="flex items-center gap-2"><Hash size={16} className="text-emerald-400"/> {wordCount} words</span>
          {aiState !== 'idle' && (
            <span className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full shadow-sm border border-indigo-500/20 animate-in fade-in">
              <Orbit size={14} className={aiState === 'generating' ? 'animate-spin' : ''}/> Neural Link: {aiState}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setFocusMode(true)} className={`p-2.5 rounded-xl backdrop-blur-md shadow-sm border transition-all hover:scale-105 ${isDark ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10' : 'bg-black/5 text-gray-600 border-black/5 hover:bg-black/10'}`}>
            <Maximize size={18} />
          </button>
          <button onClick={() => setSplitMode(!splitMode)} className={`p-2.5 rounded-xl backdrop-blur-md transition-all hover:scale-105 ${splitMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/50' : isDark ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10' : 'bg-black/5 text-gray-600 border-black/5 hover:bg-black/10'}`}>
            <LayoutGrid size={18} />
          </button>
          <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2.5 rounded-xl backdrop-blur-md shadow-sm border transition-all hover:scale-105 ${isDark ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10' : 'bg-black/5 text-gray-600 border-black/5 hover:bg-black/10'}`}><Settings2 size={18} /></button>
            {showSettings && (
              <div className={`absolute right-0 top-full mt-4 w-[360px] backdrop-blur-3xl border shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] rounded-[32px] p-6 z-50 animate-in slide-in-from-top-4 zoom-in-95 duration-300 ${isDark ? 'bg-[#1a1a1a]/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Canvas Matrix</p>
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {(['blank', 'dots', 'grid', 'lines', 'blueprint'] as const).map(bg => (
                    <button key={bg} onClick={() => setPageBg(bg)} className={`aspect-square rounded-2xl flex justify-center items-center transition-all duration-300 ${pageBg === bg ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-110' : isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-black/5 hover:bg-black/10 text-gray-500'}`}>
                      {bg === 'blank' ? <FileText size={20}/> : bg === 'blueprint' ? <Layers size={20}/> : bg === 'dots' ? <LayoutGrid size={20}/> : bg === 'grid' ? <GripHorizontal size={20}/> : <List size={20}/>}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Theme Engine</p>
                <div className="flex gap-2 mb-6">
                  <button onClick={() => setActiveTheme('light')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${activeTheme === 'light' ? 'bg-white text-black border-black/20 shadow-md' : 'bg-transparent text-gray-500 border-gray-500/30 hover:bg-white/5'}`}>Light</button>
                  <button onClick={() => setActiveTheme('dim')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${activeTheme === 'dim' ? 'bg-[#121212] text-white border-white/20 shadow-md' : 'bg-transparent text-gray-500 border-gray-500/30 hover:bg-white/5'}`}>Dark</button>
                  <button onClick={() => setActiveTheme('sepia')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${activeTheme === 'sepia' ? 'bg-[#FBF0D9] text-[#5C4B37] border-[#5C4B37]/20 shadow-md' : 'bg-transparent text-gray-500 border-gray-500/30 hover:bg-white/5'}`}>Sepia</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setFullWidth(false)} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all border ${!fullWidth ? 'bg-white/10 text-white border-white/20 shadow-lg' : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5'}`}>Centered</button>
                  <button onClick={() => setFullWidth(true)} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all border ${fullWidth ? 'bg-white/10 text-white border-white/20 shadow-lg' : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5'}`}>Ultra-Wide</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOCUS MODE EXIT OVERLAY */}
        {focusMode && (
          <button onClick={() => setFocusMode(false)} className="fixed top-8 right-8 z-[200] p-4 bg-white/10 backdrop-blur-2xl border border-white/20 text-white rounded-full hover:bg-white/20 hover:scale-110 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <Minimize2 size={24} />
          </button>
        )}
       </div> {/* ✅ CLOSE TOP NAVBAR DIV HERE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 📜 MAIN INFINITE CANVAS SCROLL AREA */}
        <div className={`flex-1 overflow-y-auto relative scroll-smooth scrollbar-hide transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${pageBg === 'blueprint' ? bgStyles.blueprint : bgStyles[pageBg]}`}>
          
          {/* CINEMATIC COVER IMAGE */}
          <div className="relative group">
            {coverImage !== 'none' ? (
              <div className={`h-[45vh] w-full relative overflow-hidden ${focusMode ? 'h-[25vh]' : ''} transition-all duration-[1.5s] ease-[cubic-bezier(0.23,1,0.32,1)]`}>
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[3s] ease-out" />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/20 ${isDark ? 'to-[#121212]' : activeTheme === 'sepia' ? 'to-[#FBF0D9]' : 'to-[#FCFCFC]'}`}></div>
              </div>
            ) : <div className="h-40 w-full bg-transparent"></div>}
            
            <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="absolute top-8 right-8 px-5 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl text-sm font-bold text-white shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center gap-2 hover:scale-105"><ImageIcon size={16}/> Art Direction</button>
            
            {showCoverPicker && (
              <div className={`absolute right-8 top-20 w-96 backdrop-blur-3xl border shadow-2xl rounded-[32px] p-4 z-50 grid grid-cols-2 gap-3 animate-in zoom-in-95 duration-300 ${isDark ? 'bg-[#1a1a1a]/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                {COVER_IMAGES.map((img, i) => (
                  <button key={i} onClick={() => { setCoverImage(img); setShowCoverPicker(false); }} className={`h-24 rounded-2xl overflow-hidden border-[3px] transition-all ${coverImage === img ? 'border-indigo-500 ring-4 ring-indigo-500/30 scale-[0.96]' : 'border-transparent hover:border-gray-500/30'}`}>
                    {img === 'none' ? <div className={`w-full h-full flex items-center justify-center font-bold ${isDark ? 'bg-white/5 text-gray-500' : 'bg-black/5 text-gray-400'}`}>Minimal</div> : <img src={img} className="w-full h-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* THE PAPER */}
          <div className={`relative z-10 mx-auto ${fullWidth ? 'max-w-[95%]' : 'max-w-[1200px]'} transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
            
            <div className="relative -mt-28 ml-12 mb-12 inline-block z-20">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-[120px] leading-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:scale-110 hover:-rotate-12 transition-transform duration-500 ease-out">{pageIcon}</button>
              {showEmojiPicker && (
                <div className={`absolute left-0 top-full mt-4 backdrop-blur-3xl border shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] rounded-[32px] p-5 w-[360px] grid grid-cols-5 gap-3 z-50 animate-in slide-in-from-top-4 duration-300 ${isDark ? 'bg-[#1a1a1a]/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                  {EMOJI_LIST.map(emoji => <button key={emoji} onClick={() => { setPageIcon(emoji); setShowEmojiPicker(false); }} className={`text-4xl aspect-square flex items-center justify-center rounded-2xl transition-all hover:scale-110 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>{emoji}</button>)}
                </div>
              )}
            </div>

            <div className={`bg-transparent min-h-screen`}>
              <div className="px-16 pb-16">
                {editingTitle ? (
                  <input autoFocus className={`text-[6rem] font-black w-full outline-none bg-transparent placeholder-gray-500/50 tracking-tighter leading-[1.1] ${isDark ? 'text-white' : activeTheme === 'sepia' ? 'text-[#3E3224]' : 'text-gray-900'}`} placeholder="Untitled Matrix" value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)} />
                ) : (
                  <h1 className={`text-[6rem] font-black cursor-text hover:opacity-70 transition-opacity tracking-tighter leading-[1.1] ${isDark ? 'text-white' : activeTheme === 'sepia' ? 'text-[#3E3224]' : 'text-gray-900'}`} onClick={() => setEditingTitle(true)}>{note.title || 'Untitled Matrix'}</h1>
                )}
              </div>

              <div className={`px-16 pb-64 relative transition-colors duration-700`}>
                
                {/* Tiptap Editor Content */}
                <EditorContent editor={editor} />

                {editor && (
                  <BubbleMenu editor={editor} tippyOptions={{ duration: 200, animation: 'shift-away' }} className={`flex overflow-hidden backdrop-blur-3xl border shadow-[0_20px_40px_rgba(0,0,0,0.2)] rounded-3xl p-1.5 animate-in zoom-in-95 ${isDark ? 'bg-[#2a2a2a]/90 border-white/10' : 'bg-white/90 border-black/10'}`}>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} isDark={isDark}><Bold size={18} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} isDark={isDark}><Italic size={18} /></ToolbarBtn>
                    <div className={`w-px mx-1.5 my-2 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
                    <ToolbarBtn onClick={() => handleAI('summarize')} isDark={isDark}><Wand2 size={18} className="text-indigo-400"/></ToolbarBtn>
                  </BubbleMenu>
                )}

                {/* BENTO GRID: DRAWING & HANDWRITING */}
                <div className="mt-48 grid grid-cols-1 xl:grid-cols-2 gap-12 relative z-10 pb-40">
                  {/* Drawing Board */}
                  <div className={`backdrop-blur-3xl rounded-[56px] p-12 shadow-[0_20px_80px_rgba(0,0,0,0.1)] border transition-all duration-700 ease-out flex flex-col group hover:-translate-y-4 hover:shadow-[0_40px_100px_rgba(0,0,0,0.2)] ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/60'}`}>
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-[28px] shadow-2xl shadow-pink-500/40 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"><Palette size={32} /></div>
                        <div>
                          <h3 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Freeform Board</h3>
                          <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Infinite vector canvas</p>
                        </div>
                      </div>
                      <button className={`p-4 rounded-3xl transition-all hover:scale-110 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}><Maximize2 size={24}/></button>
                    </div>
                    <div className={`ring-1 rounded-[40px] overflow-hidden shadow-inner flex-1 min-h-[600px] relative ${isDark ? 'bg-black/40 ring-white/10' : 'bg-white/80 ring-black/5'}`}>
                      <div className={`absolute left-6 top-1/2 -translate-y-1/2 backdrop-blur-2xl shadow-2xl border rounded-[28px] p-3 flex flex-col gap-3 z-20 ${isDark ? 'bg-[#1a1a1a]/80 border-white/10' : 'bg-white/80 border-black/5'}`}>
                        <button className="p-3.5 bg-indigo-500/20 text-indigo-400 rounded-2xl hover:scale-110 transition-transform"><MousePointer2 size={22}/></button>
                        <button className={`p-3.5 rounded-2xl hover:scale-110 transition-transform ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'}`}><PenTool size={22}/></button>
                        <button className={`p-3.5 rounded-2xl hover:scale-110 transition-transform ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'}`}><Shapes size={22}/></button>
                        <button className={`p-3.5 rounded-2xl hover:scale-110 transition-transform ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'}`}><Eraser size={22}/></button>
                      </div>
                      <NoteCanvasBoard note={note} />
                    </div>
                  </div>

                  {/* OCR Pad */}
                  <div className={`backdrop-blur-3xl rounded-[56px] p-12 shadow-[0_20px_80px_rgba(0,0,0,0.1)] border transition-all duration-700 ease-out flex flex-col group hover:-translate-y-4 hover:shadow-[0_40px_100px_rgba(0,0,0,0.2)] ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/60'}`}>
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[28px] shadow-2xl shadow-blue-500/40 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"><Type size={32} /></div>
                        <div>
                          <h3 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Cognitive OCR</h3>
                          <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Neural handwriting sync</p>
                        </div>
                      </div>
                      <button className={`p-4 rounded-3xl transition-all hover:scale-110 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}><Maximize2 size={24}/></button>
                    </div>
                    <div className={`ring-1 rounded-[40px] overflow-hidden shadow-inner flex-1 min-h-[600px] ${isDark ? 'bg-black/40 ring-white/10' : 'bg-white/80 ring-black/5'}`}>
                      <HandwritingPad note={note} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📂 SPLIT MODE BENTO SIDEBAR */}
        {splitMode && !focusMode && (
          <div className={`w-[480px] border-l backdrop-blur-3xl p-10 overflow-y-auto z-30 shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.2)] flex flex-col gap-8 animate-in slide-in-from-right-12 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-black/5'}`}>
            <div className={`backdrop-blur-2xl rounded-[48px] p-10 shadow-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-white'}`}>
              <h3 className={`text-2xl font-black mb-8 flex items-center gap-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><Layers size={28} /></div>
                Document Cortex
              </h3>
              <DocumentWorkspace note={note} compact />
            </div>
          </div>
        )}

        {/* 🛸 MAC-OS STYLE FLOATING GLASS DOCK */}
        <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${focusMode ? 'translate-y-64' : 'translate-y-0'}`}>
          <div className={`backdrop-blur-[60px] border shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] px-5 py-5 rounded-[48px] flex items-center gap-2 animate-in slide-in-from-bottom-24 duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${isDark ? 'bg-[#1a1a1a]/80 border-white/10' : 'bg-white/80 border-white'}`}>
            <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()} isDark={isDark}><Undo2 size={24} /></ToolbarBtn>
            <div className={`w-px h-12 mx-3 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} isDark={isDark}><Bold size={24} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} isDark={isDark}><Italic size={24} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} isDark={isDark}><UnderlineIcon size={24} /></ToolbarBtn>
            <div className={`w-px h-12 mx-3 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
            
            {/* Color Pickers */}
            <div className={`relative group p-4 flex items-center justify-center rounded-3xl transition-all cursor-pointer border hover:scale-110 ${isDark ? 'hover:bg-white/10 border-transparent hover:border-white/10 text-gray-400' : 'hover:bg-white border-transparent hover:border-black/5 hover:shadow-md text-gray-600'}`}>
              <Type size={24} />
              <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
            </div>
            <div className={`relative group p-4 flex items-center justify-center rounded-3xl transition-all cursor-pointer border hover:scale-110 ${isDark ? 'hover:bg-white/10 border-transparent hover:border-white/10 text-gray-400' : 'hover:bg-white border-transparent hover:border-black/5 hover:shadow-md text-gray-600'}`}>
              <Highlighter size={24} />
              <input type="color" defaultValue="#fef08a" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
            </div>
            
            <div className={`w-px h-12 mx-3 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} isDark={isDark}><Heading1 size={24} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} isDark={isDark}><Heading2 size={24} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} isDark={isDark}><List size={24} /></ToolbarBtn>
            <div className={`w-px h-12 mx-3 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
            <ToolbarBtn onClick={addImage} isDark={isDark}><ImageIcon size={24} className="text-emerald-500" /></ToolbarBtn>
            
            {/* The Neural AI Button */}
            <div className="relative ml-5">
              <button onClick={() => setShowAiMenu(!showAiMenu)} className={`flex items-center justify-center p-5 rounded-[32px] shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${showAiMenu ? 'bg-white text-black scale-110 rotate-[15deg]' : 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white hover:scale-110 hover:-rotate-6 hover:shadow-purple-500/50'}`}>
                <Wand2 size={28} className={aiState === 'generating' ? 'animate-spin' : 'animate-pulse'} />
              </button>
              
              {showAiMenu && (
                <div className={`absolute bottom-[calc(100%+40px)] left-1/2 -translate-x-1/2 w-[380px] backdrop-blur-[60px] border shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[48px] p-6 z-[200] animate-in slide-in-from-bottom-12 zoom-in-95 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isDark ? 'bg-[#1a1a1a]/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                  <div className="p-2">
                    <p className="text-[12px] text-gray-500 font-black tracking-[0.25em] uppercase mb-5 px-3">Neural Operations</p>
                    <button onClick={() => { handleAI('summarize'); setShowAiMenu(false); }} className={`w-full text-left text-base font-bold px-6 py-5 rounded-[28px] flex items-center gap-5 transition-all border border-transparent hover:scale-105 mb-3 ${isDark ? 'hover:bg-indigo-500/20 hover:border-indigo-500/30 text-gray-300 hover:text-white' : 'hover:bg-indigo-50 hover:border-indigo-100 text-gray-700 hover:text-indigo-600'}`}><AlignLeft size={24} className="text-indigo-400"/> Auto-Summarize</button>
                    <button onClick={() => { handleAI('flashcards'); setShowAiMenu(false); }} className={`w-full text-left text-base font-bold px-6 py-5 rounded-[28px] flex items-center gap-5 transition-all border border-transparent hover:scale-105 ${isDark ? 'hover:bg-indigo-500/20 hover:border-indigo-500/30 text-gray-300 hover:text-white' : 'hover:bg-indigo-50 hover:border-indigo-100 text-gray-700 hover:text-indigo-600'}`}><Brain size={24} className="text-indigo-400"/> Extract Flashcards</button>
                    <div className={`h-px my-6 mx-5 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                    <p className="text-[12px] text-gray-500 font-black tracking-[0.25em] uppercase mb-5 px-3">Visual Synthesis</p>
                    <button onClick={() => { handleAI('diagram'); setShowAiMenu(false); }} className={`w-full text-left text-base font-bold px-6 py-5 rounded-[28px] flex items-center gap-5 transition-all border border-transparent hover:scale-105 mb-3 ${isDark ? 'hover:bg-purple-500/20 hover:border-purple-500/30 text-gray-300 hover:text-white' : 'hover:bg-purple-50 hover:border-purple-100 text-gray-700 hover:text-purple-600'}`}><Palette size={24} className="text-purple-400"/> Gen-AI Image</button>
                    <button onClick={() => { handleAI('3d'); setShowAiMenu(false); }} className={`w-full text-left text-base font-bold px-6 py-5 rounded-[28px] flex items-center gap-5 transition-all border border-transparent hover:scale-105 ${isDark ? 'hover:bg-blue-500/20 hover:border-blue-500/30 text-gray-300 hover:text-white' : 'hover:bg-blue-50 hover:border-blue-100 text-gray-700 hover:text-blue-600'}`}><Shapes size={24} className="text-blue-400"/> 3D Geometry</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎬 CINEMATIC AI RESULT BENTO BOX */}
        {generatedAsset && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-12 bg-black/40 backdrop-blur-2xl animate-in fade-in duration-700">
            <div className={`w-full max-w-2xl backdrop-blur-[60px] border shadow-[0_100px_200px_-40px_rgba(0,0,0,0.8)] rounded-[64px] p-12 flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-12 duration-[1s] ease-[cubic-bezier(0.23,1,0.32,1)] ${isDark ? 'bg-[#121212]/80 border-white/10' : 'bg-white/80 border-white'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[64px] pointer-events-none blur-3xl"></div>
              
              <div className="flex justify-between items-center mb-10 relative z-10">
                <h3 className={`font-black text-4xl flex items-center gap-5 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[28px] text-white shadow-2xl shadow-purple-500/40"><Sparkles size={32}/></div> 
                  Synthesis Complete
                </h3>
                <button onClick={() => setGeneratedAsset(null)} className={`p-5 rounded-[28px] transition-all hover:scale-110 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-white shadow-sm border border-transparent hover:border-gray-200 text-gray-900'}`}><X size={28} /></button>
              </div>
              
              <div className={`w-full h-[460px] rounded-[48px] flex items-center justify-center overflow-hidden mb-10 border shadow-inner relative z-10 group p-4 ${isDark ? 'bg-black/40 border-white/5' : 'bg-white/60 border-white'}`}>
                {generatedAsset.assetUrl.startsWith('data:image') || generatedAsset.assetUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={generatedAsset.assetUrl} alt="Preview" className="object-contain w-full h-full rounded-[40px] drop-shadow-2xl group-hover:scale-[1.05] transition-transform duration-[3s] ease-out" />
                ) : (
                  <div className="text-center flex flex-col items-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[40px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-600/40 animate-bounce"><Maximize2 size={56}/></div>
                    <p className={`text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>3D Asset Ready</p>
                    <p className={`text-lg font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ready for spatial embedding.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-6 relative z-10">
                <button onClick={() => setGeneratedAsset(null)} className={`flex-1 py-6 rounded-[32px] text-xl font-bold transition-all hover:scale-105 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-white/60 hover:bg-white text-gray-600 border border-white shadow-sm'}`}>Discard</button>
                <button onClick={insertGeneratedAsset} className="flex-[2] py-6 rounded-[32px] text-xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white transition-all shadow-2xl shadow-purple-500/40 flex items-center justify-center gap-4 hover:-translate-y-2 hover:scale-105"><CheckCircle2 size={28} /> Embed to Matrix</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, active, children, isDark }: { onClick?: () => void; active?: boolean; children: React.ReactNode; isDark: boolean; }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-3xl transition-all duration-500 ease-out flex items-center justify-center hover:scale-110 ${active ? (isDark ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-black text-white shadow-xl') : (isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-md')}`}>
      {children}
    </button>
  );
}
