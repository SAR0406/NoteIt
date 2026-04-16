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
  Heading1, Heading2, Heading3, Link as LinkIcon, Minus, Star, Pin, Tag,
  Trash2, Brain, Sparkles, BookOpen, X, AlignLeft, Code, Quote, PanelRightOpen, Focus,
  Image as ImageIcon, Palette, Type, LayoutGrid, GripHorizontal, FileText, ChevronDown,
  Clock, Hash, Maximize2, Minimize2, MoreHorizontal, CheckCircle2
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

  // UI States
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'queued' | 'generating' | 'success' | 'partial-success' | 'retry' | 'fallback' | 'error'>('idle');
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  
  // Customization States
  const [pageBg, setPageBg] = useState<PageBackground>('dots');
  const [fullWidth, setFullWidth] = useState(false);

  // Computed Stats
  const wordCount = useMemo(() => note?.content.replace(/<[^>]*>?/gm, ' ').trim().split(/\s+/).filter(w => w.length > 0).length || 0, [note?.content]);
  const readingTime = Math.ceil(wordCount / 200) || 1;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Highlight.configure({ multicolor: true }), 
      Underline,
      TextStyle,
      Color,
      Image.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: 'rounded-xl shadow-md max-w-full my-4 hover:ring-4 ring-indigo-500/20 transition-all cursor-pointer' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-600 underline font-medium' } }),
    ],
    content: note?.content ?? '',
    onUpdate: ({ editor: currentEditor }) => {
      if (note) updateNote(note.id, { content: currentEditor.getHTML() });
    },
    editorProps: {
      attributes: { class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] pb-32 text-gray-800' },
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
    const url = window.prompt('Enter Image URL or Paste Base64:');
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
      `<div style="padding: 24px; background: linear-gradient(to right, #f8fafc, #f1f5f9); border-radius: 16px; margin: 24px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">`,
      `<h3 style="margin-top: 0; color: #4338ca; font-size: 1.25rem; display: flex; align-items: center; gap: 8px;">✨ ${generatedAsset.title}</h3>`,
      `<p style="font-size: 0.875rem; color: #64748b; margin-bottom: 16px; font-style: italic;"><strong>Prompt:</strong> ${escapeHtml(generatedAsset.prompt)}</p>`,
      generatedAsset.previewImage ? `<img src="${escapeHtml(generatedAsset.previewImage)}" alt="Generated output" style="border-radius: 12px; width: 100%; max-height: 600px; object-fit: contain; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />` : '',
      generatedAsset.assetUrl && generatedAsset.assetUrl !== generatedAsset.previewImage 
        ? `<div style="margin-top: 16px; text-align: center;"><a href="${escapeHtml(generatedAsset.assetUrl)}" target="_blank" rel="noreferrer" style="display: inline-block; background: #4f46e5; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.875rem;">🧊 Open Full 3D Asset</a></div>` 
        : '',
      `</div>`
    ].join('');

    editor.chain().focus().insertContent(resultHtml).run();
    setGeneratedAsset(null);
    toast.success('Inserted masterpiece into canvas!');
  };

  const handleAI = async (action: AIAction) => {
    if (!note) return;
    let prompt = '';
    let image = '';
    const model: GenerationModel = action === '3d' ? 'microsoft/trellis' : 'black-forest-labs/flux.2-klein-4b';

    if (action === 'diagram') {
      const input = window.prompt('What should be generated? (e.g. hyper-realistic human heart, 8k resolution)', note.title || '');
      if (!input?.trim()) return;
      prompt = input.trim();
    }
    if (action === '3d') {
      const input = window.prompt('Describe the 3D model to generate:', `Generate a detailed 3D model for "${note.title}"`);
      if (!input?.trim()) return;
      prompt = input.trim();
    }
    if (action === 'image-convert') {
      const subjectPrompt = window.prompt('Describe the target style/anatomy:', note.title || '');
      if (!subjectPrompt?.trim()) return;
      const sourceImage = window.prompt('Paste source image as data URL (data:image/...)');
      if (!sourceImage?.startsWith('data:image/')) return toast.error('Invalid image data URL.');
      prompt = subjectPrompt.trim();
      image = sourceImage.trim();
    }

    setAiLoading(true);
    setAiState('queued');
    
    try {
      setAiState('generating');
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, model, prompt, image, note: { title: note.title, content: note.content, tags: note.tags, handwritingIndex: note.handwritingIndex, attachments: note.attachments, drawings: note.drawings } }),
      });

      if (!response.ok) throw new Error('AI provider unavailable');
      const data = await response.json();

      if (action === 'summarize') {
        const points = (data.summaryPoints ?? []).filter(Boolean).slice(0, AI_SUMMARY_POINT_LIMIT);
        if (points.length > 0) {
          const summaryHtml = `<div style="background: linear-gradient(135deg, #eef2ff, #f3e8ff); padding:20px; border-radius:16px; margin: 24px 0; border: 1px solid #e0e7ff;">
            <h3 style="color: #4f46e5; margin-top: 0;">✨ AI Executive Summary</h3>
            <ul style="color: #374151;">${points.map((p: string) => `<li style="margin-bottom: 8px;">${escapeHtml(p)}</li>`).join('')}</ul>
          </div>`;
          updateNote(note.id, { content: `${note.content}${summaryHtml}` });
          setAiState('success');
          toast.success('Premium Summary embedded!');
        } else {
          setAiState('fallback');
        }
      } else if (action === 'flashcards' || action === 'quiz') {
        const cards = (data.flashcards ?? []).filter((c: any) => c.front && c.back).slice(0, action === 'quiz' ? AI_QUIZ_CARD_LIMIT : AI_FLASHCARD_CARD_LIMIT);
        if (cards.length > 0) {
          cards.forEach((c: any) => addFlashcard(c.front, c.back, note.id, note.tags));
          setAiState('success');
          toast.success(`Generated ${cards.length} premium cards!`);
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
            title: action === '3d' ? '🧊 AI 3D Generation' : '🖼️ AI Visual Asset',
            model: data.generated?.model ?? model,
            prompt, previewImage: safePreview, assetUrl: safeAsset, action,
          });
          setAiState('success');
        } else setAiState('fallback');
      }
    } catch (e) {
      setAiState('retry');
      toast.error('Generation failed.');
    }
    setAiLoading(false);
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
        <div className="w-24 h-24 bg-indigo-100 text-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner shadow-indigo-200/50">
          <BookOpen size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Mind Canvas Awaits</h2>
        <p className="text-gray-500 mb-8 max-w-md text-center">Create a new canvas to start writing, drawing, generating 3D models, and organizing your thoughts in a premium workspace.</p>
        <button onClick={() => selectNote(addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }).id)} className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
          Create Canvas
        </button>
      </div>
    );
  }

  // Background CSS mapping
  const bgStyles = {
    blank: 'bg-white',
    dots: 'bg-[radial-gradient(#d1d5db_2px,transparent_2px)] [background-size:24px_24px] bg-white',
    grid: 'bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] [background-size:24px_24px] bg-white',
    lines: 'bg-[linear-gradient(transparent_23px,#f1f5f9_24px)] [background-size:100%_24px] bg-white',
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden relative selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* 🚀 PREMIUM TOP NAVBAR */}
      <div className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center px-6 justify-between shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
            <Clock size={14} className="text-indigo-500"/> {readingTime} min read
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
            <Hash size={14} className="text-emerald-500"/> {wordCount} words
          </div>
          {aiState !== 'idle' && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md capitalize tracking-wider text-[10px] font-bold ${aiLoading ? 'bg-blue-50 text-blue-600 animate-pulse' : 'bg-purple-50 text-purple-600'}`}>
              <Sparkles size={12}/> {aiLoading ? 'AI Working...' : aiState}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <MoreHorizontal size={18} />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl p-2 z-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 pt-1">Page Style</p>
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {(['blank', 'dots', 'grid', 'lines'] as const).map(bg => (
                    <button key={bg} onClick={() => setPageBg(bg)} className={`p-2 rounded-xl border flex justify-center items-center ${pageBg === bg ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 hover:bg-gray-50 text-gray-400'}`}>
                      {bg === 'blank' ? <FileText size={16}/> : bg === 'dots' ? <LayoutGrid size={16}/> : bg === 'grid' ? <GripHorizontal size={16}/> : <List size={16}/>}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 pt-1">Width</p>
                <div className="flex gap-1">
                  <button onClick={() => setFullWidth(false)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${!fullWidth ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Narrow</button>
                  <button onClick={() => setFullWidth(true)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${fullWidth ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Full</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => toggleFavorite(note.id)} className={`p-2 rounded-lg transition-colors ${note.isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'}`}><Star size={18} className={note.isFavorite ? 'fill-yellow-500' : ''} /></button>
          <button onClick={() => togglePin(note.id)} className={`p-2 rounded-lg transition-colors ${note.isPinned ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'}`}><Pin size={18} /></button>
          <button onClick={() => { deleteNote(note.id); selectNote(null); }} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative scroll-smooth">
        {/* COVER HEADER */}
        <div className="h-48 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative shrink-0">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Tags floating on cover */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            {note.tags.map(tag => <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white text-xs font-semibold shadow-sm">{tag}</span>)}
            <button onClick={() => setShowTagDropdown(!showTagDropdown)} className="px-3 py-1 bg-white/10 backdrop-blur-md hover:bg-white/30 border border-white/30 rounded-full text-white text-xs font-semibold transition-all flex items-center gap-1">
              <Tag size={12}/> Add
            </button>
            {showTagDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl p-2 border border-gray-100 z-50">
                <input className="w-full bg-gray-100 text-sm border-none rounded-lg px-3 py-2 outline-none mb-2" placeholder="Type new tag..." value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && customTag) { addTagToNote(note.id, customTag.startsWith('#') ? customTag : `#${customTag}`); setCustomTag(''); } }} />
                <div className="max-h-40 overflow-y-auto">
                  {MEDICAL_TAGS.filter(t => !note.tags.includes(t)).map(tag => (
                    <button key={tag} onClick={() => addTagToNote(note.id, tag)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-gray-600 transition-colors">{tag}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN PAPER CANVAS */}
        <div className={`relative z-10 -mt-16 mx-auto ${fullWidth ? 'max-w-[95%]' : 'max-w-4xl'} transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
          <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-t-[32px] min-h-[800px] border border-gray-100 overflow-hidden">
            
            {/* FLOATING RICH FORMATTING BAR */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1">
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}><Bold size={16} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}><Italic size={16} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}><UnderlineIcon size={16} /></ToolbarBtn>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <div className="relative group p-1 flex items-center gap-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                  <Type size={16} className="text-gray-500" />
                  <input type="color" className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0 rounded-full" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
                </div>
                <div className="relative group p-1 flex items-center gap-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                  <Highlighter size={16} className="text-gray-500" />
                  <input type="color" defaultValue="#fef08a" className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0 rounded-full" onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
                </div>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}><Heading1 size={16} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}><Heading2 size={16} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}><List size={16} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}><ListOrdered size={16} /></ToolbarBtn>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <ToolbarBtn onClick={addImage}><ImageIcon size={16} className="text-emerald-500" /></ToolbarBtn>
              </div>

              <div className="flex items-center gap-2 relative">
                <button onClick={() => setShowAiDropdown(!showAiDropdown)} className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full font-semibold text-sm shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
                  <Sparkles size={14} /> AI Tools <ChevronDown size={14} className="opacity-70"/>
                </button>
                {showAiDropdown && (
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white/90 backdrop-blur-2xl border border-gray-100 shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                    <p className="text-[10px] text-gray-400 px-2 mb-2 font-bold tracking-widest uppercase">Content Generation</p>
                    <button onClick={() => { handleAI('summarize'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-medium px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"><AlignLeft size={16} className="text-indigo-400"/> Executive Summary</button>
                    <button onClick={() => { handleAI('flashcards'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-medium px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"><Brain size={16} className="text-indigo-400"/> Flashcards</button>
                    <button onClick={() => { handleAI('quiz'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-medium px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"><BookOpen size={16} className="text-indigo-400"/> Practice Quiz</button>
                    <div className="h-px bg-gray-100 my-2 mx-2" />
                    <p className="text-[10px] text-gray-400 px-2 mb-2 font-bold tracking-widest uppercase">Visuals (NVIDIA NIM)</p>
                    <button onClick={() => { handleAI('diagram'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-medium px-3 py-2 hover:bg-purple-50 hover:text-purple-700 rounded-xl flex items-center gap-3 transition-colors"><Palette size={16} className="text-purple-400"/> Flux Diagram / Photo</button>
                    <button onClick={() => { handleAI('3d'); setShowAiDropdown(false); }} className="w-full text-left text-sm font-medium px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-3 transition-colors"><Sparkles size={16} className="text-blue-400"/> Trellis 3D Model</button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-12 pt-10 pb-6 border-b border-gray-50 bg-white">
              {editingTitle ? (
                <input autoFocus className="text-5xl font-extrabold text-gray-900 w-full outline-none border-b-4 border-indigo-500 pb-2 bg-transparent placeholder-gray-200" placeholder="Untitled Canvas" value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)} />
              ) : (
                <h1 className="text-5xl font-extrabold text-gray-900 cursor-text hover:bg-gray-50 rounded-xl px-3 -mx-3 py-2 transition-colors" onClick={() => setEditingTitle(true)}>{note.title || 'Untitled Canvas'}</h1>
              )}
            </div>

            {/* THE CREATIVE DYNAMIC WORKSPACE */}
            <div className={`p-12 min-h-screen ${bgStyles[pageBg]}`}>
              <EditorContent editor={editor} className="min-h-full" />

              {/* INTEGRATED BOARD WIDGETS */}
              <div className="mt-16 space-y-8">
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-pink-100 text-pink-600 rounded-xl"><Palette size={20} /></div>
                    <h3 className="text-xl font-bold text-gray-800">Infinite Drawing Board</h3>
                  </div>
                  <div className="ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white"><NoteCanvasBoard note={note} /></div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Type size={20} /></div>
                    <h3 className="text-xl font-bold text-gray-800">OCR Handwriting Pad</h3>
                  </div>
                  <div className="ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white"><HandwritingPad note={note} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* PREMIUM GLASSMORPHIC AI RESULT PANEL */}
        {generatedAsset && (
          <div className="fixed right-10 bottom-10 w-[420px] bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] rounded-[32px] p-6 flex flex-col z-[100] animate-in slide-in-from-bottom-12 duration-500 ease-out">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-[32px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-md"><Sparkles size={16}/></div> 
                {generatedAsset.title}
              </h3>
              <button onClick={() => setGeneratedAsset(null)} className="text-gray-400 hover:bg-gray-200/50 p-2 rounded-full transition-colors"><X size={16} /></button>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-5 border border-white shadow-sm relative z-10">
              <p className="text-[13px] text-gray-600 font-medium leading-relaxed italic">"{generatedAsset.prompt}"</p>
            </div>

            <div className="w-full h-64 bg-gray-100/50 rounded-2xl flex items-center justify-center overflow-hidden mb-6 border border-gray-200/50 relative z-10 group">
              {generatedAsset.previewImage ? (
                <img src={generatedAsset.previewImage} alt="Preview" className="object-contain w-full h-full drop-shadow-xl group-hover:scale-105 transition-transform duration-700" />
              ) : generatedAsset.assetUrl ? (
                <div className="text-center p-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner animate-bounce"><Sparkles size={32}/></div>
                  <p className="text-lg font-bold text-gray-800 mb-2">3D Asset Generated</p>
                  <a href={generatedAsset.assetUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 bg-white px-4 py-2 rounded-xl shadow-sm border border-blue-100 hover:border-blue-300 transition-all">Preview Externally</a>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm font-medium animate-pulse">Rendering Asset...</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 relative z-10">
              <button onClick={() => setGeneratedAsset(null)} className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 transition-all shadow-sm">Discard</button>
              <button onClick={insertGeneratedAsset} className="flex-[2] py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 hover:-translate-y-0.5"><CheckCircle2 size={18} /> Add to Canvas</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, active, title, children }: { onClick?: () => void; active?: boolean; title?: string; children: React.ReactNode; }) {
  return (
    <button onClick={onClick} title={title} className={`p-2 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
      {children}
    </button>
  );
}
