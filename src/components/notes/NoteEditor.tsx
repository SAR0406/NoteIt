'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useStore } from '@/store/useStore';
import {
  Bold, Italic, Underline as UnderlineIcon, Highlighter, List, ListOrdered,
  Heading1, Heading2, Heading3, Tag, Trash2, Brain, Sparkles, BookOpen, X, 
  AlignLeft, Code, Quote, PanelRightOpen, Focus, Image as ImageIcon, Palette, 
  Type, LayoutGrid, GripHorizontal, FileText, Clock, Hash, Maximize2, 
  CheckCircle2, ImagePlus, Settings2, Undo2, Redo2, Maximize, Orbit, Shapes,
  Wand2, Save, Download, Command, ChevronRight, LayoutTemplate, Layers,
  MousePointer2, PenTool, Eraser, Move
} from 'lucide-react';
import { MEDICAL_TAGS } from '@/lib/templates';
import toast from 'react-hot-toast';
import { DocumentWorkspace } from '@/components/documents/DocumentWorkspace';
import { HandwritingPad } from './HandwritingPad';
import { NoteCanvasBoard } from './NoteCanvasBoard';
import { AI_FLASHCARD_CARD_LIMIT, AI_QUIZ_CARD_LIMIT, AI_SUMMARY_POINT_LIMIT } from '@/lib/ai/constants';
import { escapeHtml } from '@/lib/ai/text';

type AIAction = 'summarize' | 'flashcards' | 'quiz' | 'diagram' | 'image-convert' | '3d';
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
  dim: 'bg-[#1C1C1E] text-gray-100',
  sepia: 'bg-[#FBF0D9] text-[#5C4B37]'
};

export function NoteEditor() {
  const {
    notes, selectedNoteId, updateNote, deleteNote, addTagToNote, removeTagFromNote,
    addFlashcard, selectNote, addNote, selectedTopicId, selectedSubjectId, selectedNotebookId,
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
  const [activeTheme, setActiveTheme] = useState<'light'|'dim'|'sepia'>('light');

  // --- COMPUTED META ---
  const wordCount = useMemo(() => note?.content.replace(/<[^>]*>?/gm, ' ').trim().split(/\s+/).filter(w => w.length > 0).length || 0, [note?.content]);
  const readingTime = Math.ceil(wordCount / 200) || 1;

  // --- PREMIUM TIPTAP EDITOR ---
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Highlight.configure({ multicolor: true }), 
      Underline, TextStyle, Color,
      Image.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: 'rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.15)] my-10 mx-auto max-w-[95%] border border-gray-200/50 transition-all duration-700 hover:shadow-[0_30px_60px_rgb(0,0,0,0.25)] hover:scale-[1.02] cursor-crosshair block ring-1 ring-black/5' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-500 hover:text-indigo-600 font-semibold underline decoration-indigo-200 hover:decoration-indigo-500 underline-offset-4 transition-all' } }),
    ],
    content: note?.content ?? '',
    onUpdate: ({ editor: currentEditor }) => { if (note) updateNote(note.id, { content: currentEditor.getHTML() }); },
    editorProps: {
      attributes: { class: `prose prose-2xl max-w-none focus:outline-none min-h-[60vh] pb-64 pt-8 leading-[1.8] font-sans selection:bg-indigo-200 selection:text-indigo-900 ${activeTheme === 'dim' ? 'prose-invert text-gray-200' : 'text-gray-800/90'}` },
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
          const summaryHtml = `<div style="background: rgba(255,255,255,0.7); backdrop-filter: blur(24px); padding:40px; border-radius:32px; margin: 40px 0; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.15);">
            <h3 style="color: #312e81; margin-top: 0; display: flex; align-items: center; gap: 12px; font-size: 1.75rem; letter-spacing: -0.03em; font-weight: 900;">✨ Executive Synthesis</h3>
            <ul style="color: #475569; font-size: 1.125rem; line-height: 1.8;">${points.map((p: string) => `<li style="margin-bottom: 16px;">${escapeHtml(p)}</li>`).join('')}</ul>
          </div>`;
          updateNote(note.id, { content: `${note.content}${summaryHtml}` });
          setAiState('success'); toast.success('Synthesis injected into canvas.');
        }
      } else if (action === 'flashcards' || action === 'quiz') {
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
    const resultHtml = `<div style="padding: 4px; background: linear-gradient(135deg, #e0e7ff, #f3e8ff); border-radius: 32px; margin: 40px 0; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.1);">
      <div style="background: #ffffff; border-radius: 28px; padding: 32px;">
        <h3 style="margin-top: 0; color: #1e1b4b; font-size: 1.5rem; font-weight: 800;">✨ ${generatedAsset.title}</h3>
        <p style="font-size: 1rem; color: #64748b; margin-bottom: 24px; font-style: italic;">"${escapeHtml(generatedAsset.prompt)}"</p>
        ${isImage ? `<img src="${escapeHtml(generatedAsset.assetUrl)}" style="border-radius: 20px; width: 100%; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1);" />` : `<a href="${escapeHtml(generatedAsset.assetUrl)}" target="_blank" style="display: inline-block; background: #0f172a; color: white; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: 800;">🧊 Enter 3D Viewer</a>`}
      </div>
    </div>`;
    editor.chain().focus().insertContent(resultHtml).run();
    setGeneratedAsset(null);
  };

  if (!note) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden ${THEMES[activeTheme]}`}>
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"><Orbit size={800} strokeWidth={0.5}/></div>
        <div className="relative w-32 h-32 bg-white border border-gray-100 shadow-2xl shadow-indigo-500/10 rounded-[40px] flex items-center justify-center mb-10 transform hover:-translate-y-4 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer group" onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)}>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[40px] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
          <Sparkles size={48} className="text-indigo-600" />
        </div>
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 tracking-tighter">Initialize Mind Canvas</h2>
        <p className="text-gray-500 text-lg max-w-lg text-center leading-relaxed font-medium mb-12">A boundless space for cognitive offloading. Write, draw, and synthesize ideas with neural AI.</p>
        <button onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)} className="px-10 py-5 bg-black text-white font-bold rounded-2xl hover:bg-gray-900 transition-all shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-1 flex items-center gap-3 text-lg group">
          <ImagePlus size={22} className="group-hover:rotate-12 transition-transform"/> Create Workspace
        </button>
      </div>
    );
  }

  const bgStyles = {
    blank: '',
    dots: 'bg-[radial-gradient(var(--tw-gradient-stops))] from-gray-200/50 to-transparent [background-size:32px_32px]',
    grid: 'bg-[linear-gradient(to_right,var(--tw-gradient-stops)),linear-gradient(to_bottom,var(--tw-gradient-stops))] from-gray-200/50 to-transparent [background-size:40px_40px]',
    lines: 'bg-[linear-gradient(transparent_39px,var(--tw-gradient-stops))] from-gray-200/50 to-transparent [background-size:100%_40px]',
    blueprint: 'bg-[#1E3A8A] bg-[linear-gradient(to_right,#3B82F6_1px,transparent_1px),linear-gradient(to_bottom,#3B82F6_1px,transparent_1px)] [background-size:40px_40px]'
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative selection:bg-indigo-300 selection:text-indigo-900 transition-colors duration-500 ${THEMES[activeTheme]}`}>
      
      {/* 🔮 AMBIENT BACKGROUND GLOWS (Framer/Awwwards style) */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply opacity-50 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply opacity-50 animate-pulse" style={{ animationDuration: '12s' }}></div>

      {/* ⚡ GLASS TOP NAVBAR */}
      <div className={`h-16 backdrop-blur-2xl border-b flex items-center px-8 justify-between shrink-0 z-40 sticky top-0 transition-all ${focusMode ? '-translate-y-full opacity-0 absolute' : 'translate-y-0 opacity-100'} ${activeTheme === 'dim' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200/50'}`}>
        <div className="flex items-center gap-6 text-sm font-bold text-gray-500">
          <span className="flex items-center gap-2"><Clock size={16} className="text-indigo-400"/> {readingTime} min</span>
          <span className="flex items-center gap-2"><Hash size={16} className="text-emerald-400"/> {wordCount} words</span>
          {aiState !== 'idle' && (
            <span className="flex items-center gap-2 text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-full shadow-sm border border-indigo-100/50 animate-in fade-in">
              <Orbit size={14} className={aiState === 'generating' ? 'animate-spin' : ''}/> Neural Link: {aiState}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setFocusMode(true)} className="p-2.5 rounded-xl bg-white/60 text-gray-500 hover:bg-white shadow-sm border border-gray-200/50 transition-all tooltip-trigger">
            <Maximize size={18} />
          </button>
          <button onClick={() => setSplitMode(!splitMode)} className={`p-2.5 rounded-xl transition-all ${splitMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/60 text-gray-500 hover:bg-white shadow-sm border border-gray-200/50'}`}>
            <LayoutGrid size={18} />
          </button>
          <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className="p-2.5 rounded-xl bg-white/60 text-gray-500 hover:bg-white shadow-sm border border-gray-200/50 transition-all"><Settings2 size={18} /></button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-4 w-[360px] bg-white/90 backdrop-blur-3xl border border-gray-200/60 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] rounded-[32px] p-6 z-50 animate-in slide-in-from-top-4 zoom-in-95 duration-300">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Canvas Matrix</p>
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {(['blank', 'dots', 'grid', 'lines', 'blueprint'] as const).map(bg => (
                    <button key={bg} onClick={() => setPageBg(bg)} className={`aspect-square rounded-2xl flex justify-center items-center transition-all duration-300 ${pageBg === bg ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'}`}>
                      {bg === 'blank' ? <FileText size={20}/> : bg === 'blueprint' ? <Layers size={20}/> : bg === 'dots' ? <LayoutGrid size={20}/> : bg === 'grid' ? <GripHorizontal size={20}/> : <List size={20}/>}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Theme Engine</p>
                <div className="flex gap-2 mb-6">
                  <button onClick={() => setActiveTheme('light')} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${activeTheme === 'light' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border-gray-200'}`}>Light</button>
                  <button onClick={() => setActiveTheme('dim')} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${activeTheme === 'dim' ? 'bg-indigo-500 text-white' : 'bg-[#1C1C1E] text-gray-400 border-gray-700'}`}>Dim</button>
                  <button onClick={() => setActiveTheme('sepia')} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${activeTheme === 'sepia' ? 'bg-[#5C4B37] text-white' : 'bg-[#FBF0D9] text-[#5C4B37] border-[#E8DCC4]'}`}>Sepia</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setFullWidth(false)} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${!fullWidth ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Centered</button>
                  <button onClick={() => setFullWidth(true)} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${fullWidth ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Ultra-Wide</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOCUS MODE EXIT OVERLAY */}
        {focusMode && (
          <button onClick={() => setFocusMode(false)} className="fixed top-8 right-8 z-[200] p-4 bg-black/50 backdrop-blur-xl text-white rounded-full hover:bg-black/70 hover:scale-110 transition-all shadow-2xl">
            <Minimize2 size={24} />
          </button>
        )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* 📜 MAIN INFINITE CANVAS SCROLL AREA */}
        <div className={`flex-1 overflow-y-auto relative scroll-smooth scrollbar-hide transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${bgStyles[pageBg]}`}>
          
          {/* CINEMATIC COVER IMAGE */}
          <div className="relative group">
            {coverImage !== 'none' ? (
              <div className={`h-[40vh] w-full relative overflow-hidden ${focusMode ? 'h-[20vh]' : ''} transition-all duration-1000`}>
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s] ease-out" />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent ${activeTheme === 'dim' ? 'to-[#1C1C1E]' : activeTheme === 'sepia' ? 'to-[#FBF0D9]' : 'to-[#FCFCFC]'}`}></div>
              </div>
            ) : <div className="h-40 w-full bg-transparent"></div>}
            
            <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="absolute top-8 right-8 px-5 py-2.5 bg-white/30 hover:bg-white/80 backdrop-blur-xl rounded-2xl text-sm font-bold text-gray-800 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center gap-2 border border-white/50"><ImageIcon size={16}/> Art Direction</button>
            
            {showCoverPicker && (
              <div className="absolute right-8 top-20 w-96 bg-white/90 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-[32px] p-4 z-50 grid grid-cols-2 gap-3 animate-in zoom-in-95 duration-300">
                {COVER_IMAGES.map((img, i) => (
                  <button key={i} onClick={() => { setCoverImage(img); setShowCoverPicker(false); }} className={`h-24 rounded-2xl overflow-hidden border-[3px] transition-all ${coverImage === img ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-[0.98]' : 'border-transparent hover:border-gray-300'}`}>
                    {img === 'none' ? <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">Minimal</div> : <img src={img} className="w-full h-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* THE PAPER */}
          <div className={`relative z-10 mx-auto ${fullWidth ? 'max-w-[95%]' : 'max-w-[1100px]'} transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
            
            <div className="relative -mt-24 ml-12 mb-12 inline-block z-20">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-[100px] leading-none drop-shadow-2xl hover:scale-110 hover:-rotate-12 transition-transform duration-500 ease-out">{pageIcon}</button>
              {showEmojiPicker && (
                <div className="absolute left-0 top-full mt-4 bg-white/80 backdrop-blur-3xl border border-white/50 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] rounded-[32px] p-5 w-[340px] grid grid-cols-5 gap-3 z-50 animate-in slide-in-from-top-4 duration-300">
                  {EMOJI_LIST.map(emoji => <button key={emoji} onClick={() => { setPageIcon(emoji); setShowEmojiPicker(false); }} className="text-3xl aspect-square flex items-center justify-center hover:bg-gray-100/50 rounded-2xl hover:shadow-md transition-all">{emoji}</button>)}
                </div>
              )}
            </div>

            <div className={`bg-transparent min-h-screen`}>
              <div className="px-16 pb-12">
                {editingTitle ? (
                  <input autoFocus className={`text-[5rem] font-black w-full outline-none bg-transparent placeholder-gray-300 tracking-tighter leading-tight ${activeTheme === 'dim' ? 'text-white' : 'text-gray-900'}`} placeholder="Untitled Matrix" value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)} />
                ) : (
                  <h1 className={`text-[5rem] font-black cursor-text hover:opacity-70 transition-opacity tracking-tighter leading-tight ${activeTheme === 'dim' ? 'text-white' : 'text-gray-900'}`} onClick={() => setEditingTitle(true)}>{note.title || 'Untitled Matrix'}</h1>
                )}
              </div>

              <div className={`px-16 pb-64 relative transition-colors duration-700`}>
                
                {/* Tiptap Editor Content */}
                <EditorContent editor={editor} />

                {editor && (
                  <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden bg-white/90 backdrop-blur-2xl border border-gray-200/50 shadow-2xl rounded-2xl p-1 animate-in zoom-in-95">
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={16} /></ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={16} /></ToolbarBtn>
                    <div className="w-px bg-gray-200/50 mx-1 my-2"></div>
                    <ToolbarBtn onClick={() => handleAI('summarize')}><Wand2 size={16} className="text-purple-500"/></ToolbarBtn>
                  </BubbleMenu>
                )}

                {/* BENTO GRID: DRAWING & HANDWRITING */}
                <div className="mt-40 grid grid-cols-1 xl:grid-cols-2 gap-10 relative z-10 pb-40">
                  {/* Drawing Board */}
                  <div className={`backdrop-blur-3xl rounded-[48px] p-10 shadow-[0_10px_50px_rgb(0,0,0,0.05)] border transition-all duration-500 flex flex-col group hover:-translate-y-2 hover:shadow-[0_30px_60px_rgb(0,0,0,0.08)] ${activeTheme === 'dim' ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/60'}`}>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-3xl shadow-xl shadow-pink-500/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"><Palette size={28} /></div>
                        <div>
                          <h3 className={`text-2xl font-black tracking-tight ${activeTheme === 'dim' ? 'text-white' : 'text-gray-900'}`}>Freeform Board</h3>
                          <p className="text-gray-500 font-medium">Infinite vector canvas</p>
                        </div>
                      </div>
                      <button className="p-3 bg-gray-100/50 hover:bg-gray-200/50 rounded-2xl transition-colors"><Maximize2 size={20}/></button>
                    </div>
                    <div className="ring-1 ring-black/5 rounded-[36px] overflow-hidden bg-white/90 shadow-inner flex-1 min-h-[500px] relative">
                      {/* Placeholder tools to simulate Figma/Freeform feel */}
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md shadow-xl border border-gray-200/50 rounded-2xl p-2 flex flex-col gap-2 z-20">
                        <button className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><MousePointer2 size={18}/></button>
                        <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl"><PenTool size={18}/></button>
                        <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl"><Shapes size={18}/></button>
                        <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl"><Eraser size={18}/></button>
                      </div>
                      <NoteCanvasBoard note={note} />
                    </div>
                  </div>

                  {/* OCR Pad */}
                  <div className={`backdrop-blur-3xl rounded-[48px] p-10 shadow-[0_10px_50px_rgb(0,0,0,0.05)] border transition-all duration-500 flex flex-col group hover:-translate-y-2 hover:shadow-[0_30px_60px_rgb(0,0,0,0.08)] ${activeTheme === 'dim' ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/60'}`}>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-3xl shadow-xl shadow-blue-500/30 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500"><Type size={28} /></div>
                        <div>
                          <h3 className={`text-2xl font-black tracking-tight ${activeTheme === 'dim' ? 'text-white' : 'text-gray-900'}`}>Cognitive OCR</h3>
                          <p className="text-gray-500 font-medium">Neural handwriting sync</p>
                        </div>
                      </div>
                      <button className="p-3 bg-gray-100/50 hover:bg-gray-200/50 rounded-2xl transition-colors"><Maximize2 size={20}/></button>
                    </div>
                    <div className="ring-1 ring-black/5 rounded-[36px] overflow-hidden bg-white/90 shadow-inner flex-1 min-h-[500px]">
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
          <div className={`w-[450px] border-l backdrop-blur-3xl p-8 overflow-y-auto z-30 shadow-[-30px_0_60px_-15px_rgba(0,0,0,0.05)] flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500 ${activeTheme === 'dim' ? 'bg-black/20 border-white/10' : 'bg-white/30 border-white/60'}`}>
            <div className={`backdrop-blur-2xl rounded-[40px] p-8 shadow-sm border ${activeTheme === 'dim' ? 'bg-white/5 border-white/10' : 'bg-white/80 border-white'}`}>
              <h3 className={`text-xl font-black mb-6 flex items-center gap-3 ${activeTheme === 'dim' ? 'text-white' : 'text-gray-800'}`}><Layers size={24} className="text-indigo-500"/> Document Cortex</h3>
              <DocumentWorkspace note={note} compact />
            </div>
          </div>
        )}

        {/* 🛸 MAC-OS STYLE FLOATING GLASS DOCK */}
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-transform duration-700 ${focusMode ? 'translate-y-40' : 'translate-y-0'}`}>
          <div className="bg-white/70 backdrop-blur-[40px] border border-white/60 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] px-4 py-4 rounded-[40px] flex items-center gap-2 animate-in slide-in-from-bottom-16 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={22} /></ToolbarBtn>
            <div className="w-px h-10 bg-gray-300/50 mx-2" />
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}><Bold size={22} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}><Italic size={22} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}><UnderlineIcon size={22} /></ToolbarBtn>
            <div className="w-px h-10 bg-gray-300/50 mx-2" />
            <div className="relative group p-3 flex items-center justify-center hover:bg-white rounded-2xl transition-all cursor-pointer shadow-sm border border-transparent hover:border-gray-200">
              <Type size={22} className="text-gray-700" />
              <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
            </div>
            <div className="relative group p-3 flex items-center justify-center hover:bg-white rounded-2xl transition-all cursor-pointer shadow-sm border border-transparent hover:border-gray-200">
              <Highlighter size={22} className="text-gray-700" />
              <input type="color" defaultValue="#fef08a" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
            </div>
            <div className="w-px h-10 bg-gray-300/50 mx-2" />
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}><Heading1 size={22} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}><Heading2 size={22} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}><List size={22} /></ToolbarBtn>
            <div className="w-px h-10 bg-gray-300/50 mx-2" />
            <ToolbarBtn onClick={addImage}><ImageIcon size={22} className="text-emerald-500" /></ToolbarBtn>
            
            {/* The Neural AI Button */}
            <div className="relative ml-4">
              <button onClick={() => setShowAiMenu(!showAiMenu)} className={`flex items-center justify-center p-4 rounded-[28px] shadow-2xl transition-all duration-500 ease-out ${showAiMenu ? 'bg-gray-900 text-white scale-110 rotate-12' : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white hover:scale-110 hover:-rotate-6 hover:shadow-purple-500/40'}`}>
                <Wand2 size={26} className={aiState === 'generating' ? 'animate-spin' : 'animate-pulse'} />
              </button>
              {showAiMenu && (
                <div className="absolute bottom-[calc(100%+32px)] left-1/2 -translate-x-1/2 w-80 bg-white/90 backdrop-blur-3xl border border-white/60 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] rounded-[40px] p-5 z-[200] animate-in slide-in-from-bottom-8 zoom-in-95 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
                  <div className="p-2">
                    <p className="text-[11px] text-gray-400 font-black tracking-[0.2em] uppercase mb-4 px-2">Neural Operations</p>
                    <button onClick={() => { handleAI('summarize'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-4 hover:bg-indigo-50/50 rounded-3xl flex items-center gap-4 transition-all border border-transparent hover:border-indigo-100 text-gray-700 hover:text-indigo-600 mb-2"><AlignLeft size={20} className="text-indigo-500"/> Auto-Summarize</button>
                    <button onClick={() => { handleAI('flashcards'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-4 hover:bg-indigo-50/50 rounded-3xl flex items-center gap-4 transition-all border border-transparent hover:border-indigo-100 text-gray-700 hover:text-indigo-600"><Brain size={20} className="text-indigo-500"/> Extract Flashcards</button>
                    <div className="h-px bg-gray-200/60 my-4 mx-4" />
                    <p className="text-[11px] text-gray-400 font-black tracking-[0.2em] uppercase mb-4 px-2">Visual Synthesis</p>
                    <button onClick={() => { handleAI('diagram'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-4 hover:bg-purple-50/50 rounded-3xl flex items-center gap-4 transition-all border border-transparent hover:border-purple-100 text-gray-700 hover:text-purple-600 mb-2"><Palette size={20} className="text-purple-500"/> Gen-AI Image</button>
                    <button onClick={() => { handleAI('3d'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-4 hover:bg-blue-50/50 rounded-3xl flex items-center gap-4 transition-all border border-transparent hover:border-blue-100 text-gray-700 hover:text-blue-600"><Shapes size={20} className="text-blue-500"/> 3D Geometry</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎬 CINEMATIC AI RESULT BENTO BOX */}
        {generatedAsset && (
          <div className="fixed right-12 bottom-12 w-[520px] bg-white/70 backdrop-blur-[40px] border border-white/60 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[48px] p-8 flex flex-col z-[300] animate-in slide-in-from-right-20 fade-in zoom-in-95 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-[48px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="font-black text-3xl flex items-center gap-4 text-gray-900 tracking-tight">
                <div className="w-14 h-14 flex items-center justify-center bg-black rounded-3xl text-white shadow-2xl shadow-black/30"><Sparkles size={28}/></div> 
                Synthesis Complete
              </h3>
              <button onClick={() => setGeneratedAsset(null)} className="text-gray-400 hover:bg-white hover:text-gray-900 p-4 rounded-3xl shadow-sm border border-transparent hover:border-gray-200 transition-all"><X size={24} /></button>
            </div>
            
            <div className="w-full h-[360px] bg-white/60 rounded-[36px] flex items-center justify-center overflow-hidden mb-8 border border-white shadow-inner relative z-10 group p-3">
              {generatedAsset.assetUrl.startsWith('data:image') || generatedAsset.assetUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img src={generatedAsset.assetUrl} alt="Preview" className="object-contain w-full h-full rounded-[28px] drop-shadow-2xl group-hover:scale-[1.03] transition-transform duration-[2s] ease-out" />
              ) : (
                <div className="text-center flex flex-col items-center">
                  <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[40px] flex items-center justify-center mb-6 shadow-2xl shadow-blue-600/40 animate-bounce"><Maximize2 size={48}/></div>
                  <p className="text-3xl font-black text-gray-900 mb-3">3D Asset Ready</p>
                  <p className="text-base font-semibold text-gray-500 mb-6">Ready for spatial embedding.</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 relative z-10">
              <button onClick={() => setGeneratedAsset(null)} className="flex-1 py-5 rounded-3xl text-lg font-bold bg-white/60 hover:bg-white text-gray-600 border border-white shadow-sm transition-all hover:scale-105">Discard</button>
              <button onClick={insertGeneratedAsset} className="flex-[2] py-5 rounded-3xl text-lg font-black bg-black hover:bg-gray-900 text-white transition-all shadow-2xl shadow-black/30 flex items-center justify-center gap-3 hover:-translate-y-1 hover:scale-105"><CheckCircle2 size={24} /> Embed to Canvas</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, active, children }: { onClick?: () => void; active?: boolean; children: React.ReactNode; }) {
  return (
    <button onClick={onClick} className={`p-3.5 rounded-2xl transition-all duration-300 ease-out ${active ? 'bg-gray-900 text-white shadow-xl scale-105' : 'text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 hover:shadow-md'}`}>
      {children}
    </button>
  );
}
,message:feat: Push NoteEditor boundaries with Awwwards-tier floating dock, bubble menus, dynamic themes, and immersive flow state,owner:SAR0406,path:src/components/notes/NoteEditor.tsx,repo:NoteIt,sha:f4a0c86955a30588661a3375c3db73919bd4df06}
