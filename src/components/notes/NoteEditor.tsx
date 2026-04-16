'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Heading1, Heading2, Heading3, Link as LinkIcon, Minus, Star, Pin, Tag,
  Trash2, Brain, Sparkles, BookOpen, X, AlignLeft, Code, Quote, PanelRightOpen, Focus,
  Image as ImageIcon, Palette, Type, LayoutGrid, GripHorizontal, FileText, ChevronDown,
  Clock, Hash, Maximize2, Minimize2, MoreHorizontal, CheckCircle2,
  ImagePlus, Settings2, Undo2, Redo2, Maximize, SmilePlus
} from 'lucide-react';
import { MEDICAL_TAGS } from '@/lib/templates';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { DocumentWorkspace } from '@/components/documents/DocumentWorkspace';
import { HandwritingPad } from './HandwritingPad';
import { NoteCanvasBoard } from './NoteCanvasBoard';
import { AI_FLASHCARD_CARD_LIMIT, AI_QUIZ_CARD_LIMIT, AI_SUMMARY_POINT_LIMIT } from '@/lib/ai/constants';
import { escapeHtml } from '@/lib/ai/text';
import { FloatingToolbar, PillButton, SplitPane, TimelineRail } from '@/components/ui/primitives';

type AIAction = 'summarize' | 'flashcards' | 'quiz' | 'diagram' | 'image-convert' | '3d';
type GenerationModel = 'black-forest-labs/flux.2-klein-4b' | 'microsoft/trellis';
type SlashCommand = 'todo' | 'code' | 'heading' | 'image';
type PageBackground = 'blank' | 'dots' | 'grid' | 'lines';

const SLASH_COMMAND_TODO_TEXT = '☐ To-do item';

interface GeneratedAsset {
  title: string;
  model: string;
  prompt: string;
  previewImage?: string;
  assetUrl?: string;
  action: AIAction;
}

const EMOJI_LIST = ['📄', '🧠', '🫀', '🧬', '🔬', '💊', '🦴', '🏥', '⚕️', '📝', '✨', '🚀', '💡', '🎨', '🧊'];
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=2000&auto=format&fit=crop',
  'none'
];

export function NoteEditor() {
  const {
    notes, selectedNoteId, updateNote, deleteNote, toggleFavorite, togglePin,
    addTagToNote, removeTagFromNote, linkNotes, unlinkNote,
    generateFlashcardsFromNote, summarizeNote, generateQuizFromNote, addFlashcard,
    selectNote, addNote, selectedTopicId, selectedSubjectId, selectedNotebookId,
    editorFocusMode, setEditorFocusMode,
  } = useStore();

  const note = notes.find((n) => n.id === selectedNoteId);
  const attachmentCount = note?.attachments.length ?? 0;

  // --- UI & PSYCHOLOGY STATES ---
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'queued' | 'generating' | 'success' | 'partial-success' | 'retry' | 'fallback' | 'error'>('idle');
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  
  // --- CANVAS CUSTOMIZATION ---
  const [pageBg, setPageBg] = useState<PageBackground>('blank');
  const [fullWidth, setFullWidth] = useState(false);
  const [pageIcon, setPageIcon] = useState('📄');
  const [coverImage, setCoverImage] = useState('none');

  // --- COMPUTED META ---
  const wordCount = useMemo(() => note?.content.replace(/<[^>]*>?/gm, ' ').trim().split(/\s+/).filter(w => w.length > 0).length || 0, [note?.content]);
  const readingTime = Math.ceil(wordCount / 200) || 1;

  // --- EDITOR CONFIGURATION ---
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Highlight.configure({ multicolor: true }), 
      Underline,
      TextStyle,
      Color,
      // Beautifully styled images that pop off the canvas
      Image.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: 'rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] my-8 mx-auto max-w-[90%] border border-gray-100 transition-all duration-500 hover:shadow-[0_20px_50px_rgb(0,0,0,0.2)] hover:scale-[1.01] cursor-pointer block' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-500 hover:text-indigo-700 underline decoration-indigo-200 hover:decoration-indigo-500 underline-offset-4 transition-all' } }),
    ],
    content: note?.content ?? '',
    onUpdate: ({ editor: currentEditor }) => {
      if (note) updateNote(note.id, { content: currentEditor.getHTML() });
    },
    editorProps: {
      attributes: { class: 'prose prose-lg prose-indigo max-w-none focus:outline-none min-h-[60vh] pb-64 pt-8 text-gray-800 leading-relaxed font-sans' },
    },
  }, [note?.id, updateNote]);

  useEffect(() => {
    if (editor && note && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content);
    }
  }, [editor, note]);

  useEffect(() => {
    if (!note?.id) return;
    setSplitMode(attachmentCount > 0);
  }, [attachmentCount, note?.id]);

  const insertSlashCommand = (cmd: SlashCommand) => {
    if (!editor) return;
    if (cmd === 'todo') editor.chain().focus().insertContent(SLASH_COMMAND_TODO_TEXT).run();
    else if (cmd === 'code') editor.chain().focus().toggleCodeBlock().run();
    else if (cmd === 'image') addImage();
    else editor.chain().focus().toggleHeading({ level: 2 }).run();
    setShowSlashMenu(false);
  };

  const addImage = () => {
    const url = window.prompt('Paste Image URL or Base64 String:');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  };

  const toSafeUrl = (value?: string) => {
    if (!value) return '';
    const normalized = value.replace(/\s+/g, '');
    if (normalized.startsWith('https://') || normalized.startsWith('http://') || normalized.startsWith('data:image/') || normalized.startsWith('data:application/')) {
      return normalized;
    }
    return '';
  };

  const insertGeneratedAsset = () => {
    if (!generatedAsset || !editor) return;
    const resultHtml = [
      `<div style="padding: 32px; background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 24px; margin: 32px 0; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);">`,
      `<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">`,
      `<div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 8px; border-radius: 12px; color: white;">✨</div>`,
      `<h3 style="margin: 0; color: #1e293b; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">${generatedAsset.title}</h3>`,
      `</div>`,
      `<p style="font-size: 0.95rem; color: #64748b; margin-bottom: 24px; font-weight: 500; padding: 12px 16px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #8b5cf6;">${escapeHtml(generatedAsset.prompt)}</p>`,
      generatedAsset.previewImage ? `<img src="${escapeHtml(generatedAsset.previewImage)}" alt="AI Generated" style="border-radius: 16px; width: 100%; max-height: 70vh; object-fit: contain; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);" />` : '',
      generatedAsset.assetUrl && generatedAsset.assetUrl !== generatedAsset.previewImage 
        ? `<div style="margin-top: 24px; text-align: center;"><a href="${escapeHtml(generatedAsset.assetUrl)}" target="_blank" rel="noreferrer" style="display: inline-flex; align-items: center; gap: 8px; background: #0f172a; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 0.95rem; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.3);">🧊 Open 3D Workspace</a></div>` 
        : '',
      `</div>`
    ].join('');

    editor.chain().focus().insertContent(resultHtml).run();
    setGeneratedAsset(null);
    toast.success('Inserted masterpiece into canvas!');
  };

  const handleAI = async (action: AIAction) => {
    if (!note) return;
    let prompt = ''; let image = '';
    const model: GenerationModel = action === '3d' ? 'microsoft/trellis' : 'black-forest-labs/flux.2-klein-4b';

    if (action === 'diagram') {
      const input = window.prompt('What should be generated? (e.g. cinematic, hyper-realistic 3D render of a human heart)', note.title || '');
      if (!input?.trim()) return; prompt = input.trim();
    }
    if (action === '3d') {
      const input = window.prompt('Describe the 3D model to generate:', `Detailed 3D model of ${note.title}`);
      if (!input?.trim()) return; prompt = input.trim();
    }
    if (action === 'image-convert') {
      const subjectPrompt = window.prompt('Describe the target style (e.g. Pixar 3D style, Da Vinci sketch):', note.title || '');
      if (!subjectPrompt?.trim()) return;
      const sourceImage = window.prompt('Paste source image as data URL (data:image/...)');
      if (!sourceImage?.startsWith('data:image/')) return toast.error('Invalid image data URL.');
      prompt = subjectPrompt.trim(); image = sourceImage.trim();
    }

    setAiLoading(true); setAiState('queued');
    
    try {
      setAiState('generating');
      const response = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, model, prompt, image, note: { title: note.title, content: note.content, tags: note.tags, handwritingIndex: note.handwritingIndex, attachments: note.attachments, drawings: note.drawings } }),
      });

      if (!response.ok) throw new Error('AI provider unavailable');
      const data = await response.json();

      if (action === 'summarize') {
        const points = (data.summaryPoints ?? []).filter(Boolean).slice(0, AI_SUMMARY_POINT_LIMIT);
        if (points.length > 0) {
          const summaryHtml = `<div style="background: linear-gradient(135deg, #f0f9ff, #e0e7ff); padding:32px; border-radius:24px; margin: 32px 0; border: 1px solid #c7d2fe; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.1);">
            <h3 style="color: #4338ca; margin-top: 0; display: flex; align-items: center; gap: 8px; font-size: 1.5rem; letter-spacing: -0.02em;">✨ Executive Summary</h3>
            <ul style="color: #334155; font-size: 1.05rem; line-height: 1.7;">${points.map((p: string) => `<li style="margin-bottom: 12px; padding-left: 8px;">${escapeHtml(p)}</li>`).join('')}</ul>
          </div>`;
          updateNote(note.id, { content: `${note.content}${summaryHtml}` });
          setAiState('success'); toast.success('Premium Summary embedded!');
        } else setAiState('fallback');
      } else if (action === 'flashcards' || action === 'quiz') {
        const cards = (data.flashcards ?? []).filter((c: any) => c.front && c.back).slice(0, action === 'quiz' ? AI_QUIZ_CARD_LIMIT : AI_FLASHCARD_CARD_LIMIT);
        if (cards.length > 0) {
          cards.forEach((c: any) => addFlashcard(c.front, c.back, note.id, note.tags));
          setAiState('success'); toast.success(`Generated ${cards.length} cognitive cards!`);
        } else setAiState('fallback');
      } else {
        const rawObj = data.generated?.raw || {};
        const rawB64 = rawObj.image || rawObj.b64_json || rawObj.artifacts?.[0]?.base64;
        const rawUrl = rawObj.url || rawObj.asset_url || rawObj.artifacts?.[0]?.url;

        let safePreview = toSafeUrl(data.generated?.previewImage) || toSafeUrl(rawUrl);
        let safeAsset = toSafeUrl(data.generated?.assetUrl) || toSafeUrl(rawUrl);

        if (!safePreview && rawB64) safePreview = rawB64.startsWith('data:') ? rawB64 : `data:image/jpeg;base64,${rawB64}`;
        if (!safeAsset && safePreview) safeAsset = safePreview;

        if (safePreview || safeAsset) {
          setGeneratedAsset({
            title: action === '3d' ? '🧊 Immersive 3D Asset' : '🖼️ Generative Masterpiece',
            model: data.generated?.model ?? model, prompt, previewImage: safePreview, assetUrl: safeAsset, action,
          });
          setAiState('success');
        } else setAiState('fallback');
      }
    } catch (e) {
      setAiState('retry'); toast.error('Neural engine failed to generate.');
    }
    setAiLoading(false);
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
        <div className="relative group cursor-pointer" onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)}>
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
          <div className="relative w-28 h-28 bg-white border border-gray-100 shadow-2xl rounded-3xl flex items-center justify-center mb-8 transform group-hover:-translate-y-2 transition-all duration-500">
            <Sparkles size={48} className="text-indigo-500" />
          </div>
        </div>
        <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Blank Canvas</h2>
        <p className="text-gray-500 mb-10 max-w-md text-center text-lg leading-relaxed">Where your mind dumps become masterpieces. Write, draw, generate 3D models, and organize chaos.</p>
        <button onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)} className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl hover:shadow-2xl hover:shadow-gray-900/20 hover:-translate-y-1 flex items-center gap-2 text-lg">
          <ImagePlus size={20} /> Initialize Workspace
        </button>
      </div>
    );
  }

  // --- BACKGROUND THEMES ---
  const bgStyles = {
    blank: 'bg-white',
    dots: 'bg-[radial-gradient(#cbd5e1_2px,transparent_2px)] [background-size:32px_32px] bg-white',
    grid: 'bg-[linear-gradient(to_right,#f1f5f9_2px,transparent_2px),linear-gradient(to_bottom,#f1f5f9_2px,transparent_2px)] [background-size:32px_32px] bg-white',
    lines: 'bg-[linear-gradient(transparent_31px,#f1f5f9_32px)] [background-size:100%_32px] bg-white',
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB] overflow-hidden relative selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* 🌟 PREMIUM TOP NAVIGATION BAR */}
      <div className="h-16 bg-white/60 backdrop-blur-2xl border-b border-gray-200/50 flex items-center px-6 justify-between shrink-0 z-40 sticky top-0 transition-all">
        <div className="flex items-center gap-4 text-sm font-semibold text-gray-600">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
            <Clock size={16} className="text-indigo-500"/> {readingTime} min
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
            <Hash size={16} className="text-emerald-500"/> {wordCount} words
          </div>
          {aiState !== 'idle' && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border capitalize tracking-wide text-xs font-bold transition-all duration-300 ${aiLoading ? 'bg-blue-50/80 border-blue-100 text-blue-600 animate-pulse' : 'bg-purple-50/80 border-purple-100 text-purple-600'}`}>
              <Sparkles size={14}/> {aiLoading ? 'Neural Engine Active...' : aiState}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Page Settings Dropdown */}
          <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className="p-2.5 hover:bg-white rounded-xl text-gray-500 shadow-sm border border-transparent hover:border-gray-200 transition-all">
              <Settings2 size={18} />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-3 w-72 bg-white/90 backdrop-blur-3xl border border-gray-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-4 z-50 animate-in slide-in-from-top-4 duration-300">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-1">Canvas Texture</p>
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {(['blank', 'dots', 'grid', 'lines'] as const).map(bg => (
                    <button key={bg} onClick={() => setPageBg(bg)} className={`aspect-square rounded-2xl border-2 flex justify-center items-center transition-all ${pageBg === bg ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md shadow-indigo-100' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50 text-gray-400'}`}>
                      {bg === 'blank' ? <FileText size={20}/> : bg === 'dots' ? <LayoutGrid size={20}/> : bg === 'grid' ? <GripHorizontal size={20}/> : <List size={20}/>}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-1">Layout Width</p>
                <div className="flex gap-2">
                  <button onClick={() => setFullWidth(false)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${!fullWidth ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Standard</button>
                  <button onClick={() => setFullWidth(true)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${fullWidth ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Ultra-Wide</button>
                </div>
              </div>
            )}
          </div>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={() => toggleFavorite(note.id)} className={`p-2.5 rounded-xl transition-all ${note.isFavorite ? 'text-yellow-500 bg-yellow-50 border border-yellow-200 shadow-sm' : 'text-gray-500 border border-transparent hover:bg-white hover:border-gray-200 shadow-sm'}`}><Star size={18} className={note.isFavorite ? 'fill-yellow-500' : ''} /></button>
          <button onClick={() => togglePin(note.id)} className={`p-2.5 rounded-xl transition-all ${note.isPinned ? 'text-indigo-600 bg-indigo-50 border border-indigo-200 shadow-sm' : 'text-gray-500 border border-transparent hover:bg-white hover:border-gray-200 shadow-sm'}`}><Pin size={18} /></button>
          <button onClick={() => { deleteNote(note.id); selectNote(null); }} className="p-2.5 rounded-xl text-gray-500 border border-transparent hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm transition-all"><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative scroll-smooth scrollbar-hide">
        
        {/* 🏔️ NOTION-STYLE COVER HEADER */}
        <div className="relative group">
          {coverImage !== 'none' ? (
            <div className="h-[30vh] w-full relative">
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
            </div>
          ) : (
            <div className="h-32 w-full bg-gradient-to-r from-gray-100 to-gray-200"></div>
          )}
          
          {/* Cover Controls (Appear on hover) */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl text-sm font-bold text-gray-700 shadow-lg hover:bg-white border border-gray-200/50 transition-all flex items-center gap-2">
              <ImageIcon size={16}/> Change Cover
            </button>
            {showCoverPicker && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-3xl border border-gray-200 shadow-2xl rounded-3xl p-3 z-50 grid grid-cols-2 gap-2">
                {COVER_IMAGES.map((img, i) => (
                  <button key={i} onClick={() => { setCoverImage(img); setShowCoverPicker(false); }} className={`h-20 rounded-2xl overflow-hidden border-2 transition-all ${coverImage === img ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-transparent hover:border-gray-300'}`}>
                    {img === 'none' ? <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">Remove</div> : <img src={img} className="w-full h-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 📜 MAIN PAPER CANVAS */}
        <div className={`relative z-10 mx-auto ${fullWidth ? 'max-w-[98%]' : 'max-w-[900px]'} transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
          
          {/* Page Icon (Overlapping Cover) */}
          <div className="relative -mt-16 ml-12 mb-6">
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-7xl hover:scale-110 hover:-rotate-6 transition-transform duration-300 drop-shadow-xl relative z-20 bg-transparent border-0 p-0">
              {pageIcon}
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-full mt-2 bg-white/90 backdrop-blur-2xl border border-gray-200 shadow-2xl rounded-3xl p-4 z-50 w-72 grid grid-cols-5 gap-2 animate-in zoom-in-95 duration-200">
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji} onClick={() => { setPageIcon(emoji); setShowEmojiPicker(false); }} className="text-3xl p-2 hover:bg-gray-100 rounded-2xl transition-colors">{emoji}</button>
                ))}
              </div>
            )}
          </div>

          <div className={`bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[40px] min-h-[1000px] border border-gray-200/60 overflow-hidden mb-32`}>
            
            {/* Title & Meta Data Section */}
            <div className="px-16 pt-12 pb-8 border-b border-gray-50/50 bg-white/50 backdrop-blur-sm sticky top-0 z-30">
              {editingTitle ? (
                <input autoFocus className="text-6xl font-black text-gray-900 w-full outline-none border-b-4 border-indigo-500 pb-2 bg-transparent placeholder-gray-200 tracking-tight" placeholder="Untitled Masterpiece" value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)} />
              ) : (
                <h1 className="text-6xl font-black text-gray-900 cursor-text hover:bg-gray-50 rounded-2xl px-4 -mx-4 py-2 transition-colors tracking-tight" onClick={() => setEditingTitle(true)}>{note.title || 'Untitled Masterpiece'}</h1>
              )}

              {/* Tags Row */}
              <div className="flex flex-wrap items-center gap-2 mt-6">
                {note.tags.map(tag => (
                  <span key={tag} className="px-4 py-1.5 bg-gray-100/80 text-gray-600 hover:bg-gray-200 border border-gray-200/50 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 group cursor-pointer">
                    {tag} <X size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500" onClick={() => removeTagFromNote(note.id, tag)}/>
                  </span>
                ))}
                <div className="relative">
                  <button onClick={() => setShowTagDropdown(!showTagDropdown)} className="px-4 py-1.5 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-1.5">
                    <Tag size={14}/> Add Tag
                  </button>
                  {showTagDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-3xl shadow-2xl rounded-2xl p-3 border border-gray-100 z-50">
                      <input className="w-full bg-gray-50 text-sm font-medium border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 ring-indigo-500/20 mb-2 transition-all" placeholder="Create tag..." value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && customTag) { addTagToNote(note.id, customTag.startsWith('#') ? customTag : `#${customTag}`); setCustomTag(''); } }} />
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {MEDICAL_TAGS.filter(t => !note.tags.includes(t)).map(tag => (
                          <button key={tag} onClick={() => addTagToNote(note.id, tag)} className="w-full text-left text-sm font-semibold px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-gray-500 transition-colors">{tag}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FLOATING MAC-OS STYLE TOOLBAR (Sticky bottom) */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-white/70 backdrop-blur-3xl border border-white/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] px-4 py-3 rounded-[32px] flex items-center gap-2 animate-in slide-in-from-bottom-10 duration-700 delay-300">
                <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={18} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={18} /></ToolbarBtn>
                <div className="w-px h-8 bg-gray-200/60 mx-1" />
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}><Bold size={18} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}><Italic size={18} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}><UnderlineIcon size={18} /></ToolbarBtn>
                <div className="w-px h-8 bg-gray-200/60 mx-1" />
                
                {/* Advanced Color Pickers */}
                <div className="relative group p-2 flex items-center justify-center hover:bg-gray-100/80 rounded-2xl transition-colors cursor-pointer tooltip-trigger">
                  <Type size={18} className="text-gray-700" />
                  <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
                </div>
                <div className="relative group p-2 flex items-center justify-center hover:bg-gray-100/80 rounded-2xl transition-colors cursor-pointer tooltip-trigger">
                  <Highlighter size={18} className="text-gray-700" />
                  <input type="color" defaultValue="#fef08a" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
                </div>
                
                <div className="w-px h-8 bg-gray-200/60 mx-1" />
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}><Heading1 size={18} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}><Heading2 size={18} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}><List size={18} /></ToolbarBtn>
                <div className="w-px h-8 bg-gray-200/60 mx-1" />
                <ToolbarBtn onClick={addImage}><ImageIcon size={18} className="text-emerald-500" /></ToolbarBtn>
                
                {/* Magic AI Button inside Toolbar */}
                <div className="relative ml-2">
                  <button onClick={() => setShowAiDropdown(!showAiDropdown)} className="flex items-center justify-center p-2.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:-rotate-3 transition-all duration-300">
                    <Sparkles size={20} className="animate-pulse" />
                  </button>
                  {showAiDropdown && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-white/95 backdrop-blur-3xl border border-gray-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-3xl p-3 z-[100] animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
                      <p className="text-[10px] text-gray-400 px-3 mb-2 font-bold tracking-widest uppercase">🧠 Cognitive Processing</p>
                      <button onClick={() => { handleAI('summarize'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-bold px-4 py-3 hover:bg-indigo-50 hover:text-indigo-700 rounded-2xl flex items-center gap-3 transition-colors"><AlignLeft size={18} className="text-indigo-400"/> Auto-Summarize</button>
                      <button onClick={() => { handleAI('flashcards'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-bold px-4 py-3 hover:bg-indigo-50 hover:text-indigo-700 rounded-2xl flex items-center gap-3 transition-colors"><Brain size={18} className="text-indigo-400"/> Extract Flashcards</button>
                      <div className="h-px bg-gray-100 my-2 mx-3" />
                      <p className="text-[10px] text-gray-400 px-3 mb-2 font-bold tracking-widest uppercase">🎨 Generative Visuals</p>
                      <button onClick={() => { handleAI('diagram'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-bold px-4 py-3 hover:bg-purple-50 hover:text-purple-700 rounded-2xl flex items-center gap-3 transition-colors"><Palette size={18} className="text-purple-400"/> FLUX Generation</button>
                      <button onClick={() => { handleAI('3d'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-bold px-4 py-3 hover:bg-blue-50 hover:text-blue-700 rounded-2xl flex items-center gap-3 transition-colors"><Maximize size={18} className="text-blue-400"/> Trellis 3D Model</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* THE CORE TEXT EDITOR */}
            <div className={`p-16 min-h-screen ${bgStyles[pageBg]} relative transition-colors duration-500`}>
              {/* Optional Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
                <Sparkles size={400} />
              </div>
              
              <div className="relative z-10">
                <EditorContent editor={editor} className="min-h-full" />
              </div>

              {/* INTEGRATED BOARD WIDGETS (Freeform Boards) */}
              <div className="mt-32 space-y-12 relative z-10 pb-32">
                <div className="bg-white/60 backdrop-blur-xl rounded-[40px] p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-200/60 hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] transition-shadow duration-500 group">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-2xl shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform"><Palette size={24} /></div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Infinite Drawing Canvas</h3>
                      <p className="text-sm font-medium text-gray-500">Sketch ideas freely directly inside your note.</p>
                    </div>
                  </div>
                  <div className="ring-1 ring-gray-200/80 rounded-[32px] overflow-hidden bg-white shadow-inner"><NoteCanvasBoard note={note} /></div>
                </div>

                <div className="bg-white/60 backdrop-blur-xl rounded-[40px] p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-200/60 hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] transition-shadow duration-500 group">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform"><Type size={24} /></div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Cognitive OCR Pad</h3>
                      <p className="text-sm font-medium text-gray-500">Handwrite notes and let AI index them for search.</p>
                    </div>
                  </div>
                  <div className="ring-1 ring-gray-200/80 rounded-[32px] overflow-hidden bg-white shadow-inner"><HandwritingPad note={note} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* PREMIUM BENTO-BOX AI RESULT PANEL */}
        {generatedAsset && (
          <div className="fixed right-10 bottom-10 w-[460px] bg-white/70 backdrop-blur-3xl border border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-[40px] p-8 flex flex-col z-[100] animate-in slide-in-from-right-16 fade-in duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-[40px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="font-extrabold text-xl flex items-center gap-3 text-gray-900 tracking-tight">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-purple-500/30"><Sparkles size={20}/></div> 
                {generatedAsset.title}
              </h3>
              <button onClick={() => setGeneratedAsset(null)} className="text-gray-400 hover:bg-white hover:text-gray-800 p-2.5 rounded-2xl shadow-sm border border-transparent hover:border-gray-200 transition-all"><X size={20} /></button>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm relative z-10">
              <p className="text-sm text-gray-700 font-semibold leading-relaxed italic border-l-4 border-purple-400 pl-3">"{generatedAsset.prompt}"</p>
            </div>

            <div className="w-full h-72 bg-gradient-to-b from-gray-50 to-gray-100 rounded-[32px] flex items-center justify-center overflow-hidden mb-8 border border-gray-200/80 shadow-inner relative z-10 group">
              {generatedAsset.previewImage ? (
                <img src={generatedAsset.previewImage} alt="Preview" className="object-contain w-full h-full drop-shadow-2xl group-hover:scale-[1.02] transition-transform duration-700 ease-out" />
              ) : generatedAsset.assetUrl ? (
                <div className="text-center p-8 flex flex-col items-center">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner animate-bounce"><Maximize2 size={36}/></div>
                  <p className="text-xl font-extrabold text-gray-900 mb-3 tracking-tight">3D Geometry Ready</p>
                  <a href={generatedAsset.assetUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5">Enter 3D Viewer</a>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-bold tracking-widest uppercase animate-pulse text-indigo-500">Synthesizing...</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 relative z-10">
              <button onClick={() => setGeneratedAsset(null)} className="flex-1 py-4 rounded-2xl text-sm font-extrabold bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 transition-all shadow-sm">Discard</button>
              <button onClick={insertGeneratedAsset} className="flex-[2] py-4 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 hover:-translate-y-1"><CheckCircle2 size={20} /> Embed into Canvas</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, active, title, children }: { onClick?: () => void; active?: boolean; title?: string; children: React.ReactNode; }) {
  return (
    <button onClick={onClick} title={title} className={`p-2.5 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}>
      {children}
    </button>
  );
}
