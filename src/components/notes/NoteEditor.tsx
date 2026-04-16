'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
  CheckCircle2, ImagePlus, Settings2, Undo2, Redo2, Maximize, Orbit, Shapes
} from 'lucide-react';
import { MEDICAL_TAGS } from '@/lib/templates';
import toast from 'react-hot-toast';
import { DocumentWorkspace } from '@/components/documents/DocumentWorkspace';
import { HandwritingPad } from './HandwritingPad';
import { NoteCanvasBoard } from './NoteCanvasBoard';
import { AI_FLASHCARD_CARD_LIMIT, AI_QUIZ_CARD_LIMIT, AI_SUMMARY_POINT_LIMIT } from '@/lib/ai/constants';
import { escapeHtml } from '@/lib/ai/text';

type AIAction = 'summarize' | 'flashcards' | 'quiz' | 'diagram' | 'image-convert' | '3d';
type PageBackground = 'blank' | 'dots' | 'grid' | 'lines';

const EMOJI_LIST = ['🌌', '🧠', '🫀', '🧬', '🔮', '⚡', '🔥', '💎', '⚕️', '📝', '✨', '🚀', '💡', '🎨', '🧊'];
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=2560&auto=format&fit=crop',
  'none'
];

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
  
  const [pageBg, setPageBg] = useState<PageBackground>('dots');
  const [fullWidth, setFullWidth] = useState(false);
  const [pageIcon, setPageIcon] = useState('🌌');
  const [coverImage, setCoverImage] = useState(COVER_IMAGES[0]);

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
      attributes: { class: 'prose prose-xl max-w-none focus:outline-none min-h-[60vh] pb-64 pt-8 text-gray-800/90 leading-[1.8] font-sans selection:bg-indigo-200 selection:text-indigo-900' },
    },
  }, [note?.id]);

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
      <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFDFD] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"><Orbit size={800} strokeWidth={0.5}/></div>
        <div className="relative w-32 h-32 bg-white border border-gray-100 shadow-2xl shadow-indigo-500/10 rounded-[40px] flex items-center justify-center mb-10 transform hover:-translate-y-4 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer group" onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)}>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[40px] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
          <Sparkles size={48} className="text-indigo-600" />
        </div>
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 mb-4 tracking-tighter">Initialize Mind Canvas</h2>
        <p className="text-gray-400 text-lg max-w-lg text-center leading-relaxed font-medium mb-12">A boundless space for cognitive offloading. Write, draw, and synthesize ideas with neural AI.</p>
        <button onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)} className="px-10 py-5 bg-black text-white font-bold rounded-2xl hover:bg-gray-900 transition-all shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-1 flex items-center gap-3 text-lg group">
          <ImagePlus size={22} className="group-hover:rotate-12 transition-transform"/> Create Workspace
        </button>
      </div>
    );
  }

  const bgStyles = {
    blank: 'bg-[#FCFCFC]',
    dots: 'bg-[radial-gradient(#e2e8f0_2px,transparent_2px)] [background-size:32px_32px] bg-[#FCFCFC]',
    grid: 'bg-[linear-gradient(to_right,#f1f5f9_2px,transparent_2px),linear-gradient(to_bottom,#f1f5f9_2px,transparent_2px)] [background-size:40px_40px] bg-[#FCFCFC]',
    lines: 'bg-[linear-gradient(transparent_39px,#f1f5f9_40px)] [background-size:100%_40px] bg-[#FCFCFC]',
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F3F4F6] overflow-hidden relative selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* 🔮 AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply opacity-50 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply opacity-50 animate-pulse" style={{ animationDuration: '12s' }}></div>

      {/* ⚡ GLASS TOP NAVBAR */}
      <div className="h-16 bg-white/40 backdrop-blur-2xl border-b border-white/50 flex items-center px-8 justify-between shrink-0 z-40 sticky top-0">
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
          <button onClick={() => setSplitMode(!splitMode)} className={`p-2.5 rounded-xl transition-all ${splitMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/60 text-gray-500 hover:bg-white shadow-sm border border-gray-200/50'}`}>
            <LayoutGrid size={18} />
          </button>
          <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className="p-2.5 rounded-xl bg-white/60 text-gray-500 hover:bg-white shadow-sm border border-gray-200/50 transition-all"><Settings2 size={18} /></button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-4 w-80 bg-white/80 backdrop-blur-3xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] rounded-[32px] p-5 z-50 animate-in slide-in-from-top-4 duration-300">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Canvas Matrix</p>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {(['blank', 'dots', 'grid', 'lines'] as const).map(bg => (
                    <button key={bg} onClick={() => setPageBg(bg)} className={`aspect-square rounded-2xl flex justify-center items-center transition-all duration-300 ${pageBg === bg ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'}`}>
                      {bg === 'blank' ? <FileText size={20}/> : bg === 'dots' ? <LayoutGrid size={20}/> : bg === 'grid' ? <GripHorizontal size={20}/> : <List size={20}/>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setFullWidth(false)} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${!fullWidth ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Centered</button>
                  <button onClick={() => setFullWidth(true)} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${fullWidth ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Ultra-Wide</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => { deleteNote(note.id); selectNote(null); }} className="p-2.5 rounded-xl bg-white/60 text-gray-400 hover:bg-red-500 hover:text-white shadow-sm border border-gray-200/50 transition-all"><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* 📜 MAIN INFINITE CANVAS SCROLL AREA */}
        <div className={`flex-1 overflow-y-auto relative scroll-smooth scrollbar-hide transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
          
          {/* CINEMATIC COVER IMAGE */}
          <div className="relative group">
            {coverImage !== 'none' ? (
              <div className="h-[35vh] w-full relative overflow-hidden">
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FCFCFC]"></div>
              </div>
            ) : <div className="h-40 w-full bg-transparent"></div>}
            
            <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="absolute top-8 right-8 px-5 py-2.5 bg-white/30 hover:bg-white/80 backdrop-blur-xl rounded-2xl text-sm font-bold text-gray-800 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center gap-2 border border-white/50"><ImageIcon size={16}/> Art Direction</button>
            
            {showCoverPicker && (
              <div className="absolute right-8 top-20 w-96 bg-white/90 backdrop-blur-3xl border border-white shadow-2xl rounded-[32px] p-4 z-50 grid grid-cols-2 gap-3 animate-in zoom-in-95 duration-300">
                {COVER_IMAGES.map((img, i) => (
                  <button key={i} onClick={() => { setCoverImage(img); setShowCoverPicker(false); }} className={`h-24 rounded-2xl overflow-hidden border-[3px] transition-all ${coverImage === img ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-[0.98]' : 'border-transparent hover:border-gray-300'}`}>
                    {img === 'none' ? <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">Minimal</div> : <img src={img} className="w-full h-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* THE PAPER */}
          <div className={`relative z-10 mx-auto ${fullWidth ? 'max-w-[95%]' : 'max-w-[1000px]'} transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
            
            <div className="relative -mt-24 ml-12 mb-8 inline-block z-20">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-[80px] leading-none drop-shadow-2xl hover:scale-110 hover:-rotate-12 transition-transform duration-500 ease-out">{pageIcon}</button>
              {showEmojiPicker && (
                <div className="absolute left-0 top-full mt-4 bg-white/80 backdrop-blur-3xl border border-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] rounded-[32px] p-5 w-[340px] grid grid-cols-5 gap-3 z-50 animate-in slide-in-from-top-4 duration-300">
                  {EMOJI_LIST.map(emoji => <button key={emoji} onClick={() => { setPageIcon(emoji); setShowEmojiPicker(false); }} className="text-3xl aspect-square flex items-center justify-center hover:bg-white rounded-2xl hover:shadow-md transition-all">{emoji}</button>)}
                </div>
              )}
            </div>

            <div className={`bg-transparent min-h-screen`}>
              <div className="px-16 pb-10">
                {editingTitle ? (
                  <input autoFocus className="text-[4rem] font-black text-gray-900 w-full outline-none bg-transparent placeholder-gray-300 tracking-tighter leading-tight" placeholder="Untitled Matrix" value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)} />
                ) : (
                  <h1 className="text-[4rem] font-black text-gray-900 cursor-text hover:opacity-70 transition-opacity tracking-tighter leading-tight" onClick={() => setEditingTitle(true)}>{note.title || 'Untitled Matrix'}</h1>
                )}
              </div>

              <div className={`p-16 min-h-screen ${bgStyles[pageBg]} rounded-[48px] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-gray-200/40 relative transition-colors duration-700`}>
                <EditorContent editor={editor} />

                {/* BENTO GRID: DRAWING & HANDWRITING */}
                <div className="mt-40 grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10 pb-40">
                  <div className="bg-white/40 backdrop-blur-xl rounded-[40px] p-8 shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white/60 hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] transition-all duration-500 flex flex-col group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-3xl shadow-lg shadow-pink-500/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"><Palette size={24} /></div>
                      <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Freeform Board</h3>
                    </div>
                    <div className="ring-1 ring-gray-200/50 rounded-[32px] overflow-hidden bg-white/80 shadow-inner flex-1 min-h-[400px]"><NoteCanvasBoard note={note} /></div>
                  </div>

                  <div className="bg-white/40 backdrop-blur-xl rounded-[40px] p-8 shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white/60 hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] transition-all duration-500 flex flex-col group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-3xl shadow-lg shadow-blue-500/30 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500"><Type size={24} /></div>
                      <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Cognitive OCR</h3>
                    </div>
                    <div className="ring-1 ring-gray-200/50 rounded-[32px] overflow-hidden bg-white/80 shadow-inner flex-1 min-h-[400px]"><HandwritingPad note={note} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📂 SPLIT MODE BENTO SIDEBAR (Apple Notes Style) */}
        {splitMode && (
          <div className="w-[400px] border-l border-white/50 bg-white/30 backdrop-blur-2xl p-6 overflow-y-auto z-30 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.05)] flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-6 shadow-sm border border-white">
              <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2"><Shapes size={20} className="text-indigo-500"/> Document Cortex</h3>
              <DocumentWorkspace note={note} compact />
            </div>
          </div>
        )}

        {/* 🛸 MAC-OS STYLE FLOATING GLASS DOCK */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-white/60 backdrop-blur-3xl border border-white/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] px-3 py-3 rounded-[32px] flex items-center gap-1.5 animate-in slide-in-from-bottom-16 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={20} /></ToolbarBtn>
            <div className="w-px h-8 bg-gray-300/50 mx-1" />
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}><Bold size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}><Italic size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}><UnderlineIcon size={20} /></ToolbarBtn>
            <div className="w-px h-8 bg-gray-300/50 mx-1" />
            <div className="relative group p-2.5 flex items-center justify-center hover:bg-white rounded-2xl transition-all cursor-pointer shadow-sm border border-transparent hover:border-gray-200">
              <Type size={20} className="text-gray-700" />
              <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
            </div>
            <div className="relative group p-2.5 flex items-center justify-center hover:bg-white rounded-2xl transition-all cursor-pointer shadow-sm border border-transparent hover:border-gray-200">
              <Highlighter size={20} className="text-gray-700" />
              <input type="color" defaultValue="#fef08a" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
            </div>
            <div className="w-px h-8 bg-gray-300/50 mx-1" />
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}><Heading1 size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}><Heading2 size={20} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}><List size={20} /></ToolbarBtn>
            <div className="w-px h-8 bg-gray-300/50 mx-1" />
            <ToolbarBtn onClick={addImage}><ImageIcon size={20} className="text-emerald-500" /></ToolbarBtn>
            
            {/* The Neural Button */}
            <div className="relative ml-2">
              <button onClick={() => setShowAiMenu(!showAiMenu)} className={`flex items-center justify-center p-3.5 rounded-[24px] shadow-xl transition-all duration-500 ${showAiMenu ? 'bg-gray-900 text-white scale-110 rotate-12' : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white hover:scale-110 hover:-rotate-6 hover:shadow-purple-500/40'}`}>
                <Sparkles size={24} className={aiState === 'generating' ? 'animate-spin' : ''} />
              </button>
              {showAiMenu && (
                <div className="absolute bottom-[calc(100%+24px)] left-1/2 -translate-x-1/2 w-80 bg-white/80 backdrop-blur-3xl border border-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] rounded-[36px] p-4 z-[100] animate-in slide-in-from-bottom-8 zoom-in-95 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
                  <div className="p-2">
                    <p className="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase mb-3 px-2">Neural Operations</p>
                    <button onClick={() => { handleAI('summarize'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-3.5 hover:bg-white rounded-2xl flex items-center gap-4 transition-all shadow-sm border border-transparent hover:border-gray-100 text-gray-700 hover:text-indigo-600 mb-1"><AlignLeft size={20} className="text-indigo-400"/> Auto-Summarize</button>
                    <button onClick={() => { handleAI('flashcards'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-3.5 hover:bg-white rounded-2xl flex items-center gap-4 transition-all shadow-sm border border-transparent hover:border-gray-100 text-gray-700 hover:text-indigo-600"><Brain size={20} className="text-indigo-400"/> Extract Flashcards</button>
                    <div className="h-px bg-gray-200/60 my-3 mx-4" />
                    <p className="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase mb-3 px-2">Visual Synthesis</p>
                    <button onClick={() => { handleAI('diagram'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-3.5 hover:bg-white rounded-2xl flex items-center gap-4 transition-all shadow-sm border border-transparent hover:border-gray-100 text-gray-700 hover:text-purple-600 mb-1"><Palette size={20} className="text-purple-400"/> Gen-AI Image</button>
                    <button onClick={() => { handleAI('3d'); setShowAiMenu(false); }} className="w-full text-left text-sm font-bold px-5 py-3.5 hover:bg-white rounded-2xl flex items-center gap-4 transition-all shadow-sm border border-transparent hover:border-gray-100 text-gray-700 hover:text-blue-600"><Shapes size={20} className="text-blue-400"/> 3D Geometry</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎬 CINEMATIC AI RESULT BENTO BOX */}
        {generatedAsset && (
          <div className="fixed right-12 bottom-12 w-[480px] bg-white/60 backdrop-blur-3xl border border-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] rounded-[48px] p-8 flex flex-col z-[200] animate-in slide-in-from-right-20 fade-in zoom-in-95 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-[48px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="font-black text-2xl flex items-center gap-4 text-gray-900 tracking-tight">
                <div className="w-12 h-12 flex items-center justify-center bg-black rounded-2xl text-white shadow-xl shadow-black/20"><Sparkles size={24}/></div> 
                Synthesis Complete
              </h3>
              <button onClick={() => setGeneratedAsset(null)} className="text-gray-400 hover:bg-white hover:text-gray-900 p-3 rounded-2xl shadow-sm border border-transparent hover:border-gray-200 transition-all"><X size={20} /></button>
            </div>
            
            <div className="w-full h-80 bg-white/50 rounded-[32px] flex items-center justify-center overflow-hidden mb-8 border border-white shadow-inner relative z-10 group p-2">
              {generatedAsset.assetUrl.startsWith('data:image') || generatedAsset.assetUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img src={generatedAsset.assetUrl} alt="Preview" className="object-contain w-full h-full rounded-[24px] drop-shadow-2xl group-hover:scale-105 transition-transform duration-[1.5s] ease-out" />
              ) : (
                <div className="text-center flex flex-col items-center">
                  <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center mb-6 shadow-2xl shadow-blue-600/40 animate-bounce"><Maximize2 size={40}/></div>
                  <p className="text-2xl font-black text-gray-900 mb-2">3D Asset Ready</p>
                  <p className="text-sm font-semibold text-gray-500 mb-6">Ready for spatial embedding.</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 relative z-10">
              <button onClick={() => setGeneratedAsset(null)} className="flex-1 py-5 rounded-3xl text-base font-bold bg-white/50 hover:bg-white text-gray-600 border border-white shadow-sm transition-all">Discard</button>
              <button onClick={insertGeneratedAsset} className="flex-[2] py-5 rounded-3xl text-base font-black bg-black hover:bg-gray-900 text-white transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-3 hover:-translate-y-1"><CheckCircle2 size={22} /> Embed to Canvas</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, active, children }: { onClick?: () => void; active?: boolean; children: React.ReactNode; }) {
  return (
    <button onClick={onClick} className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 hover:shadow-sm'}`}>
      {children}
    </button>
  );
}
