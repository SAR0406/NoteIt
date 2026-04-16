'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import { useStore } from '@/store/useStore';
import {
  Bold, Italic, Underline as UnderlineIcon, Highlighter, List, ListOrdered,
  Heading1, Heading2, Heading3, Link as LinkIcon, Minus, Star, Pin, Tag,
  Trash2, Brain, Sparkles, BookOpen, X, AlignLeft, Code, Quote, PanelRightOpen, Focus,
  PenTool, Palette, Type
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
type SlashCommand = 'todo' | 'code' | 'heading';
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

  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'queued' | 'generating' | 'success' | 'partial-success' | 'retry' | 'fallback' | 'error'>('idle');
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  
  // NEW: Tab state for Microsoft OneNote style navigation
  const [activeTab, setActiveTab] = useState<'text' | 'handwriting' | 'canvas'>('text');

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ underline: false, link: false }),
        Highlight.configure({ multicolor: false }),
        Underline,
        TextStyle,
        Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
      ],
      content: note?.content ?? '',
      onUpdate: ({ editor: currentEditor }) => {
        if (note) {
          updateNote(note.id, { content: currentEditor.getHTML() });
        }
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] px-2 pb-32 pt-2',
        },
      },
    },
    [note?.id, updateNote]
  );

  React.useEffect(() => {
    if (editor && note && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content);
    }
  }, [editor, note]);

  React.useEffect(() => {
    if (!note?.id) return;
    setSplitMode(attachmentCount > 0);
  }, [attachmentCount, note?.id]);

  React.useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/') {
        const { $from } = editor.state.selection;
        const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
        const atCommandBoundary = textBefore.length === 0 || /\s$/.test(textBefore);
        setShowSlashMenu(atCommandBoundary);
      }
      if (event.key === 'Escape') setShowSlashMenu(false);
    };
    dom.addEventListener('keydown', handler);
    return () => dom.removeEventListener('keydown', handler);
  }, [editor]);

  const insertSlashCommand = (cmd: SlashCommand) => {
    if (!editor) return;
    if (cmd === 'todo') {
      editor.chain().focus().insertContent(SLASH_COMMAND_TODO_TEXT).run();
    } else if (cmd === 'code') {
      editor.chain().focus().toggleCodeBlock().run();
    } else {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    }
    setShowSlashMenu(false);
  };

  const applyLocalFallback = (action: 'summarize' | 'flashcards' | 'quiz') => {
    if (!note) return;
    if (action === 'summarize') summarizeNote(note.id);
    else if (action === 'flashcards') generateFlashcardsFromNote(note.id);
    else generateQuizFromNote(note.id);
  };

  const toSafeUrl = (value?: string) => {
    if (!value) return '';
    const normalized = value.replace(/\s+/g, '');
    if (
      normalized.startsWith('https://') || 
      normalized.startsWith('http://') || 
      normalized.startsWith('data:image/') ||
      normalized.startsWith('data:application/')
    ) {
      return normalized;
    }
    return '';
  };

  const insertGeneratedAsset = () => {
    if (!generatedAsset || !editor) return;
    
    // Switch to text tab so the user sees it inserted
    setActiveTab('text');

    const resultHtml = [
      `<div style="background:#f8fafc; border-radius:12px; padding:16px; margin: 16px 0; border: 1px solid #e2e8f0;">`,
      `<h3 style="margin-top:0; color:#4f46e5; display:flex; align-items:center; gap:8px;">✨ ${generatedAsset.title}</h3>`,
      `<p style="font-size:12px; color:#64748b; font-family:monospace;"><strong>Model:</strong> ${escapeHtml(generatedAsset.model)} <br/> <strong>Prompt:</strong> ${escapeHtml(generatedAsset.prompt)}</p>`,
      generatedAsset.previewImage ? `<div style="margin-top:12px;"><img src="${generatedAsset.previewImage}" alt="Generated output" style="border-radius:8px; max-width:100%; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" /></div>` : '',
      generatedAsset.assetUrl && generatedAsset.assetUrl !== generatedAsset.previewImage 
        ? `<p style="margin-top:12px;"><a href="${escapeHtml(generatedAsset.assetUrl)}" target="_blank" rel="noreferrer" style="background:#4f46e5; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600;">🔗 Download 3D Asset</a></p>` 
        : '',
      `</div>`
    ].join('');

    editor.chain().focus().insertContent(resultHtml).run();
    setGeneratedAsset(null);
    toast.success('Inserted into note!');
  };

  const handleAI = async (action: AIAction) => {
    if (!note) return;
    let prompt = '';
    let image = '';
    const model: GenerationModel = action === '3d' ? 'microsoft/trellis' : 'black-forest-labs/flux.2-klein-4b';

    if (action === 'diagram') {
      const input = window.prompt(
        'What should be generated? (example: human heart, human kidney, human brain)',
        note.title || 'human heart'
      );
      if (!input?.trim()) return;
      prompt = input.trim();
    }
    if (action === '3d') {
      const input = window.prompt('Describe the 3D model to generate', `Generate a detailed 3D model for "${note.title}"`);
      if (!input?.trim()) return;
      prompt = input.trim();
    }
    if (action === 'image-convert') {
      const subjectPrompt = window.prompt(
        'Describe the anatomy in the source image for clean study-style editing',
        note.title || 'human heart'
      );
      if (!subjectPrompt?.trim()) return;
      const sourceImage = window.prompt('Paste source image as data URL (data:image/...)');
      if (!sourceImage?.startsWith('data:image/')) {
        toast.error('Please provide a valid data URL starting with data:image/ for image conversion.');
        return;
      }
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
        body: JSON.stringify({
          action,
          model,
          prompt,
          image,
          note: {
            title: note.title,
            content: note.content,
            tags: note.tags,
            handwritingIndex: note.handwritingIndex,
            attachments: note.attachments,
            drawings: note.drawings,
          },
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || 'AI provider unavailable');
      }

      const data = (await response.json()) as {
        summaryPoints?: string[];
        flashcards?: Array<{ front: string; back: string }>;
        generated?: {
          model?: string;
          previewImage?: string;
          assetUrl?: string;
          raw?: any;
        } | null;
      };

      if (action === 'summarize') {
        const points = (data.summaryPoints ?? []).filter(Boolean).slice(0, AI_SUMMARY_POINT_LIMIT);
        if (points.length === 0) {
          applyLocalFallback(action);
          setAiState('fallback');
          toast.success('Summary added (local fallback)');
        } else {
          setActiveTab('text');
          const summaryHtml = `<div style="background:#f0fdf4; padding:16px; border-radius:12px; border:1px solid #bbf7d0; margin:16px 0;">
            <h3 style="color:#166534; margin-top:0;">📝 AI Summary</h3>
            <ul style="color:#15803d; margin-bottom:0;">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
          </div>`;
          updateNote(note.id, { content: `${note.content}${summaryHtml}` });
          setAiState('success');
          toast.success('NVIDIA NIM summary added!');
        }
      } else if (action === 'flashcards' || action === 'quiz') {
        const cards = (data.flashcards ?? [])
          .filter((c) => c.front && c.back)
          .slice(0, action === 'quiz' ? AI_QUIZ_CARD_LIMIT : AI_FLASHCARD_CARD_LIMIT);
          
        if (cards.length === 0) {
          applyLocalFallback(action);
          setAiState('fallback');
          toast.success(`${action === 'quiz' ? 'Quiz' : 'Flashcards'} generated (local fallback)`);
        } else {
          cards.forEach((card) => addFlashcard(card.front, card.back, note.id, note.tags));
          setAiState('success');
          toast.success(`NVIDIA NIM ${action === 'quiz' ? 'quiz cards' : 'flashcards'} generated (${cards.length})!`);
        }
      } else {
        const rawObj = data.generated?.raw || {};
        const rawB64 = rawObj.image || rawObj.b64_json || rawObj.data?.[0]?.b64_json || rawObj.artifacts?.[0]?.base64;
        const rawUrl = rawObj.url || rawObj.asset_url || rawObj.data?.[0]?.url || rawObj.artifacts?.[0]?.url;

        let safePreview = toSafeUrl(data.generated?.previewImage) || toSafeUrl(rawUrl);
        let safeAsset = toSafeUrl(data.generated?.assetUrl) || toSafeUrl(rawUrl);

        if (!safePreview && rawB64) {
          safePreview = rawB64.startsWith('data:') ? rawB64 : `data:image/jpeg;base64,${rawB64}`;
        }
        if (!safeAsset && safePreview) {
          safeAsset = safePreview;
        }

        if (!safePreview && !safeAsset) {
          setAiState('fallback');
          toast.error('Generation completed but no preview URL was returned.');
        } else {
          const titleByAction: Record<'diagram' | 'image-convert' | '3d', string> = {
            diagram: '🖼️ AI Diagram/Photo Generation',
            'image-convert': '🎨 AI Image Conversion',
            '3d': '🧊 AI 3D Generation',
          };
          
          setGeneratedAsset({
            title: titleByAction[action],
            model: data.generated?.model ?? model,
            prompt,
            previewImage: safePreview,
            assetUrl: safeAsset,
            action,
          });
          setAiState('success');
          toast.success('Asset ready! Review in the AI panel.');
        }
      }
    } catch (e) {
      console.error("Editor AI Generation Error:", e);
      if (action === 'summarize' || action === 'flashcards' || action === 'quiz') {
        applyLocalFallback(action);
        setAiState('fallback');
        toast.success(`${action === 'quiz' ? 'Quiz' : action === 'summarize' ? 'Summary' : 'Flashcards'} generated (local fallback)`);
      } else {
        setAiState('retry');
        toast.error('NVIDIA generation failed. Check console for details.');
      }
    }
    setAiLoading(false);
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[var(--surface-muted)]">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen size={32} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Your Study Space</h2>
          <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">Select a note from the left panel or create a new one to begin studying.</p>
          <button
            onClick={() => {
              const n = addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId });
              selectNote(n.id);
            }}
            className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-md transition-all font-medium flex items-center gap-2"
          >
            <AlignLeft size={16} /> Create New Note
          </button>
        </div>
      </div>
    );
  }

  const linkedNotes = notes.filter((n) => note.linkedNoteIds.includes(n.id));
  const unlinkableNotes = notes.filter((n) => n.id !== note.id && !note.linkedNoteIds.includes(n.id));
  const hasSelection = editor ? !editor.state.selection.empty : false;

  return (
    <div className="flex-1 flex flex-col bg-[var(--surface-muted)] overflow-hidden relative">
      
      {/* TOOLBAR */}
      <div className="border-b border-[var(--border)] bg-white px-4 py-2.5 flex items-center gap-2 shrink-0 z-10 shadow-sm">
        <FloatingToolbar>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold"><Bold size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><Italic size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline"><UnderlineIcon size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive('highlight')} title="Highlight"><Highlighter size={15} /></ToolbarBtn>
          
          <div className="w-px h-5 bg-gray-200 mx-1" />
          
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="H1"><Heading1 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="H2"><Heading2 size={15} /></ToolbarBtn>
          
          <div className="w-px h-5 bg-gray-200 mx-1" />
          
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list"><List size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Ordered list"><ListOrdered size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Quote"><Quote size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Code"><Code size={15} /></ToolbarBtn>
        </FloatingToolbar>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setSplitMode((v) => !v)} className={`p-1.5 rounded-lg transition-colors ${splitMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Split-screen Document Mode">
            <PanelRightOpen size={16} />
          </button>
          
          <div className="w-px h-5 bg-gray-200 mx-1" />

          <button onClick={() => toggleFavorite(note.id)} className={`p-1.5 rounded-lg transition-colors ${note.isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-500 hover:bg-gray-100'}`} title="Favorite">
            <Star size={16} className={note.isFavorite ? 'fill-yellow-500' : ''} />
          </button>
          <button onClick={() => togglePin(note.id)} className={`p-1.5 rounded-lg transition-colors ${note.isPinned ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`} title="Pin Note">
            <Pin size={16} className={note.isPinned ? 'fill-blue-600' : ''} />
          </button>

          {/* AI Tools Dropdown */}
          <div className="relative">
            <button onClick={() => setShowAiDropdown((v) => !v)} className={`ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 text-indigo-700 font-medium text-xs transition-all ${aiLoading ? 'animate-pulse' : ''}`}>
              <Sparkles size={14} className={aiLoading ? 'animate-spin' : ''} />
              AI Tools
            </button>
            {showAiDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[10px] uppercase font-bold text-gray-400 px-2 mb-2 tracking-wider">Note Assistant</p>
                <button onClick={() => {handleAI('summarize'); setShowAiDropdown(false);}} className="w-full text-left text-xs font-medium text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors">
                  <div className="bg-green-100 text-green-600 p-1.5 rounded-md"><AlignLeft size={14} /></div> Summarize content
                </button>
                <button onClick={() => {handleAI('flashcards'); setShowAiDropdown(false);}} className="w-full text-left text-xs font-medium text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors mt-1">
                  <div className="bg-blue-100 text-blue-600 p-1.5 rounded-md"><Brain size={14} /></div> Generate flashcards
                </button>
                <button onClick={() => {handleAI('quiz'); setShowAiDropdown(false);}} className="w-full text-left text-xs font-medium text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors mt-1">
                  <div className="bg-orange-100 text-orange-600 p-1.5 rounded-md"><BookOpen size={14} /></div> Create practice quiz
                </button>
                
                <div className="h-px bg-gray-100 my-2"></div>
                <p className="text-[10px] uppercase font-bold text-gray-400 px-2 mb-2 tracking-wider">Visual & Generative AI</p>
                
                <button onClick={() => {handleAI('diagram'); setShowAiDropdown(false);}} className="w-full text-left text-xs font-medium text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors">
                  <div className="bg-purple-100 text-purple-600 p-1.5 rounded-md"><Palette size={14} /></div> Generate diagram (Flux)
                </button>
                <button onClick={() => {handleAI('3d'); setShowAiDropdown(false);}} className="w-full text-left text-xs font-medium text-gray-700 px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors mt-1">
                  <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-md"><Sparkles size={14} /></div> Generate 3D Model (Trellis)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NOTE TITLE AND META INFO */}
      <div className="bg-white px-8 pt-6 pb-0 shrink-0">
        {editingTitle ? (
          <input
            autoFocus
            className="text-4xl font-bold text-gray-900 w-full outline-none border-b-2 border-blue-500 pb-1 bg-transparent"
            value={note.title}
            onChange={(e) => updateNote(note.id, { title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
          />
        ) : (
          <h1
            className="text-4xl font-bold text-gray-900 cursor-text hover:bg-gray-50 rounded-lg px-2 -mx-2 py-1 transition-colors"
            onClick={() => setEditingTitle(true)}
          >
            {note.title}
          </h1>
        )}
        
        <div className="flex items-center gap-4 mt-3 mb-6 flex-wrap">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{formatDate(note.updatedAt)}</span>
          <div className="flex gap-1.5 flex-wrap">
            {note.tags.map((tag) => (
              <span key={tag} className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">{tag}</span>
            ))}
          </div>
        </div>

        {/* MICROSOFT OFFICE STYLE TABS */}
        <div className="flex gap-1 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all relative top-[1px]
              ${activeTab === 'text' ? 'text-blue-700 bg-blue-50/50 border-t border-l border-r border-gray-200 rounded-t-lg' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
            `}
          >
            <Type size={16} className={activeTab === 'text' ? 'text-blue-600' : ''} /> Notes
            {activeTab === 'text' && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-white"></div>}
            {activeTab === 'text' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-lg"></div>}
          </button>

          <button 
            onClick={() => setActiveTab('handwriting')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all relative top-[1px]
              ${activeTab === 'handwriting' ? 'text-purple-700 bg-purple-50/50 border-t border-l border-r border-gray-200 rounded-t-lg' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
            `}
          >
            <PenTool size={16} className={activeTab === 'handwriting' ? 'text-purple-600' : ''} /> Sketch Pad
            {activeTab === 'handwriting' && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-white"></div>}
            {activeTab === 'handwriting' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-purple-600 rounded-t-lg"></div>}
          </button>

          <button 
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all relative top-[1px]
              ${activeTab === 'canvas' ? 'text-emerald-700 bg-emerald-50/50 border-t border-l border-r border-gray-200 rounded-t-lg' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
            `}
          >
            <Palette size={16} className={activeTab === 'canvas' ? 'text-emerald-600' : ''} /> Whiteboard
            {activeTab === 'canvas' && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-white"></div>}
            {activeTab === 'canvas' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600 rounded-t-lg"></div>}
          </button>
        </div>
      </div>

      {/* MAIN EDITOR CONTENT AREA (Scrollable) */}
      <div className="flex-1 overflow-hidden relative min-h-0 bg-white">
        <SplitPane
          leftClassName={`h-full flex flex-col min-h-0 ${splitMode ? '' : 'col-span-2'}`}
          rightClassName={splitMode ? 'h-full bg-gray-50 border-l border-gray-200' : 'hidden'}
          left={(
            <div className="flex-1 overflow-y-auto h-full px-8 bg-white relative pb-32">
              
              {/* SLASH COMMAND MENU */}
              {showSlashMenu && activeTab === 'text' && (
                <div className="absolute z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-2 py-1 mb-1">Insert block</p>
                  <button onClick={() => insertSlashCommand('todo')} className="w-full text-left text-sm font-medium text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"><span className="text-gray-400">☐</span> To-do List</button>
                  <button onClick={() => insertSlashCommand('heading')} className="w-full text-left text-sm font-medium text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"><span className="text-gray-400">H2</span> Section Heading</button>
                  <button onClick={() => insertSlashCommand('code')} className="w-full text-left text-sm font-medium text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"><Code size={14} className="text-gray-400"/> Code Block</button>
                </div>
              )}

              {/* TAB CONTENT RENDERING */}
              <div className="max-w-4xl mx-auto h-full">
                <div className={activeTab === 'text' ? 'block' : 'hidden'}>
                  <EditorContent editor={editor} />
                </div>
                
                <div className={activeTab === 'handwriting' ? 'block h-full pt-6' : 'hidden'}>
                  <HandwritingPad note={note} />
                </div>
                
                <div className={activeTab === 'canvas' ? 'block h-full pt-6' : 'hidden'}>
                  <NoteCanvasBoard note={note} />
                </div>
              </div>

            </div>
          )}
          right={splitMode ? <DocumentWorkspace note={note} compact /> : <></>}
        />

        {/* AI GENERATION PANEL OVERLAY (Like MS Designer/Insert Panel) */}
        {generatedAsset && (
          <div className="absolute right-6 bottom-6 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl p-5 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-gray-800"><Sparkles size={16} className="text-purple-500 fill-purple-100"/> {generatedAsset.title}</h3>
              <button onClick={() => setGeneratedAsset(null)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                <X size={14} />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
              <p className="text-[11px] text-gray-600 font-mono leading-relaxed line-clamp-3">{generatedAsset.prompt}</p>
            </div>

            <div className="flex-1 w-full aspect-square bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden mb-4 border border-gray-200 relative group">
              {generatedAsset.previewImage ? (
                <img src={generatedAsset.previewImage} alt="Generated Preview" className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500" />
              ) : generatedAsset.assetUrl ? (
                <div className="text-center p-6 bg-indigo-50 w-full h-full flex flex-col items-center justify-center">
                  <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-indigo-500"><BookOpen size={20}/></div>
                  <p className="text-sm font-semibold text-indigo-900 mb-1">3D Model Ready</p>
                  <a href={generatedAsset.assetUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-medium hover:underline">Click here to preview asset</a>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Sparkles className="animate-pulse mb-2" />
                  <p className="text-xs font-medium">Loading asset data...</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <button 
                onClick={() => setGeneratedAsset(null)} 
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={insertGeneratedAsset} 
                className="flex-[2] py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-1.5"
              >
                <AlignLeft size={14} /> Insert into Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${active ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
    >
      {children}
    </button>
  );
}
