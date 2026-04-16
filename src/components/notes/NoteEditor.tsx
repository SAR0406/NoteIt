'use client';

import React, { useState } from 'react';
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
  Image as ImageIcon, Palette, Type
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

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ underline: false, link: false }),
        Highlight.configure({ multicolor: true }), // ENABLES MULTICOLOR HIGHLIGHTS
        Underline,
        TextStyle,
        Color, // ENABLES MULTICOLOR TEXT
        Image.configure({ inline: true, allowBase64: true }), // ENABLES IMAGES
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
          // Creative dotted canvas background for the writing pad
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[600px] px-8 py-6 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:24px_24px] bg-white rounded-2xl shadow-sm border border-gray-100',
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
    } else if (cmd === 'image') {
      addImage();
    } else {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    }
    setShowSlashMenu(false);
  };

  const addImage = () => {
    const url = window.prompt('Enter Image URL or Paste Base64:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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
    if (normalized.startsWith('https://') || normalized.startsWith('http://') || normalized.startsWith('data:image/') || normalized.startsWith('data:application/')) {
      return normalized;
    }
    return '';
  };

  const insertGeneratedAsset = () => {
    if (!generatedAsset || !editor) return;
    
    const resultHtml = [
      `<div style="padding: 10px; background: #f9fafb; border-radius: 12px; margin: 10px 0;">`,
      `<h3 style="margin-top: 0; color: #4f46e5;">✨ ${generatedAsset.title}</h3>`,
      `<p style="font-size: 0.85em; color: #6b7280; margin-bottom: 10px;"><strong>Prompt:</strong> ${escapeHtml(generatedAsset.prompt)}</p>`,
      generatedAsset.previewImage ? `<img src="${escapeHtml(generatedAsset.previewImage)}" alt="Generated output" style="border-radius: 8px; width: 100%; max-width: 500px;" />` : '',
      generatedAsset.assetUrl && generatedAsset.assetUrl !== generatedAsset.previewImage 
        ? `<p style="margin-top: 10px;"><a href="${escapeHtml(generatedAsset.assetUrl)}" target="_blank" rel="noreferrer" style="color: #2563eb; font-weight: bold;">➡️ Open full 3D Asset</a></p>` 
        : '',
      `</div>`
    ].join('');

    editor.chain().focus().insertContent(resultHtml).run();
    setGeneratedAsset(null);
    toast.success('Inserted into creative canvas!');
  };

  const handleAI = async (action: AIAction) => {
    if (!note) return;
    let prompt = '';
    let image = '';
    const model: GenerationModel = action === '3d' ? 'microsoft/trellis' : 'black-forest-labs/flux.2-klein-4b';

    if (action === 'diagram') {
      const input = window.prompt('What should be generated? (e.g. realistic human heart, conceptual diagram)', note.title || '');
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
          action, model, prompt, image,
          note: { title: note.title, content: note.content, tags: note.tags, handwritingIndex: note.handwritingIndex, attachments: note.attachments, drawings: note.drawings },
        }),
      });

      if (!response.ok) {
        throw new Error('AI provider unavailable');
      }

      const data = await response.json();

      if (action === 'summarize') {
        const points = (data.summaryPoints ?? []).filter(Boolean).slice(0, AI_SUMMARY_POINT_LIMIT);
        if (points.length === 0) {
          applyLocalFallback(action);
          setAiState('fallback');
          toast.success('Summary added (local fallback)');
        } else {
          const summaryHtml = `<div style="background:#f0f9ff; padding:15px; border-radius:12px; margin: 15px 0;"><h3>📝 AI Summary</h3><ul>${points.map((point: string) => `<li>${escapeHtml(point)}</li>`).join('')}</ul></div>`;
          updateNote(note.id, { content: `${note.content}${summaryHtml}` });
          setAiState('success');
          toast.success('Summary embedded!');
        }
      } else if (action === 'flashcards' || action === 'quiz') {
        const cards = (data.flashcards ?? []).filter((c: any) => c.front && c.back).slice(0, action === 'quiz' ? AI_QUIZ_CARD_LIMIT : AI_FLASHCARD_CARD_LIMIT);
        if (cards.length === 0) {
          applyLocalFallback(action);
          setAiState('fallback');
        } else {
          cards.forEach((card: any) => addFlashcard(card.front, card.back, note.id, note.tags));
          setAiState('success');
          toast.success(`NVIDIA NIM generated ${cards.length} cards!`);
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
        if (!safeAsset && safePreview) safeAsset = safePreview;

        if (!safePreview && !safeAsset) {
          setAiState('fallback');
          toast.error('Generation completed but no preview URL was returned.');
        } else {
          const titleByAction: Record<'diagram' | 'image-convert' | '3d', string> = {
            diagram: '🖼️ AI Diagram Generation',
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
          toast.success('Creative asset ready! Review in the AI panel.');
        }
      }
    } catch (e) {
      console.error(e);
      setAiState('retry');
      toast.error('Generation failed.');
    }
    setAiLoading(false);
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white">
        <BookOpen size={56} className="mb-4 opacity-30" />
        <p className="text-lg font-medium text-gray-600">Select a canvas to edit</p>
        <button onClick={() => { const n = addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId }); selectNote(n.id); }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          + New Canvas Note
        </button>
      </div>
    );
  }

  const linkedNotes = notes.filter((n) => note.linkedNoteIds.includes(n.id));
  const unlinkableNotes = notes.filter((n) => n.id !== note.id && !note.linkedNoteIds.includes(n.id));
  const hasSelection = editor ? !editor.state.selection.empty : false;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
      {/* CREATIVE TOOLBAR */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 space-y-2 shrink-0 z-10 shadow-sm">
        <FloatingToolbar>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold"><Bold size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><Italic size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline"><UnderlineIcon size={15} /></ToolbarBtn>
          
          <div className="w-px h-5 bg-gray-200 mx-1" />
          
          {/* MULTICOLOR TEXT & HIGHLIGHT PICKERS */}
          <div className="flex items-center gap-1 relative overflow-hidden group rounded hover:bg-gray-100 p-1">
            <Type size={14} className="text-gray-500 pointer-events-none" />
            <input 
              type="color" 
              className="w-5 h-5 p-0 border-0 cursor-pointer bg-transparent rounded"
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
              title="Text Color"
            />
          </div>
          <div className="flex items-center gap-1 relative overflow-hidden group rounded hover:bg-gray-100 p-1">
            <Highlighter size={14} className="text-gray-500 pointer-events-none" />
            <input 
              type="color" 
              defaultValue="#ffff00"
              className="w-5 h-5 p-0 border-0 cursor-pointer bg-transparent rounded"
              onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()}
              title="Highlight Color"
            />
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="H1"><Heading1 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="H2"><Heading2 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list"><List size={15} /></ToolbarBtn>
          
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {/* IMAGE INSERT BUTTON */}
          <ToolbarBtn onClick={addImage} title="Insert Image"><ImageIcon size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Code"><Code size={15} /></ToolbarBtn>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setSplitMode((v) => !v)} className={`p-1.5 rounded hover:bg-gray-100 ${splitMode ? 'text-indigo-600' : 'text-gray-400'}`} title="Split Workspace"><PanelRightOpen size={15} /></button>
            <button onClick={() => setEditorFocusMode(!editorFocusMode)} className={`p-1.5 rounded hover:bg-gray-100 ${editorFocusMode ? 'text-indigo-600' : 'text-gray-400'}`} title="Focus mode"><Focus size={15} /></button>
            <button onClick={() => toggleFavorite(note.id)} className={`p-1.5 rounded hover:bg-gray-100 ${note.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}><Star size={15} className={note.isFavorite ? 'fill-yellow-500' : ''} /></button>
            <button onClick={() => togglePin(note.id)} className={`p-1.5 rounded hover:bg-gray-100 ${note.isPinned ? 'text-blue-600' : 'text-gray-400'}`}><Pin size={15} /></button>

            {/* AI Menu */}
            <div className="relative">
              <button onClick={() => setShowAiDropdown((v) => !v)} className={`p-1.5 rounded hover:bg-purple-50 text-purple-500 ${aiLoading ? 'animate-pulse' : ''}`} title="AI Generation Tools">
                <Sparkles size={15} />
              </button>
              {showAiDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2">
                  <p className="text-[11px] text-gray-400 px-1 mb-2 font-semibold tracking-wider uppercase">Generative AI Tools</p>
                  <button onClick={() => handleAI('summarize')} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2"><AlignLeft size={12} /> Summarize note</button>
                  <button onClick={() => handleAI('flashcards')} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2"><Brain size={12} /> Generate flashcards</button>
                  <button onClick={() => handleAI('quiz')} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2"><BookOpen size={12} /> Generate quiz</button>
                  <button onClick={() => handleAI('diagram')} className="w-full text-left text-xs px-3 py-2 hover:bg-purple-50 text-purple-700 rounded-lg flex items-center gap-2"><Palette size={12} /> Generate diagram/photo (FLUX)</button>
                  <button onClick={() => handleAI('3d')} className="w-full text-left text-xs px-3 py-2 hover:bg-purple-50 text-purple-700 rounded-lg flex items-center gap-2"><Sparkles size={12} /> Generate 3D model (Trellis)</button>
                </div>
              )}
            </div>
            <button onClick={() => { deleteNote(note.id); selectNote(null); }} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
          </div>
        </FloatingToolbar>

        {(hasSelection || aiLoading || aiState !== 'idle') && (
          <div className="flex flex-wrap items-center gap-2 px-1 text-xs mt-2">
            {hasSelection && (
              <>
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Selection AI:</span>
                <PillButton onClick={() => handleAI('flashcards')}>Flashcard</PillButton>
                <PillButton onClick={() => handleAI('summarize')}>Summary</PillButton>
              </>
            )}
            {(aiLoading || aiState !== 'idle') && (
              <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${aiState === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {aiLoading ? 'AI Generating...' : `AI: ${aiState.replace(/-/g, ' ')}`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-8 pt-6 pb-4 bg-white shrink-0 shadow-sm z-0">
        {editingTitle ? (
          <input autoFocus className="text-3xl font-bold text-gray-900 w-full outline-none border-b-2 border-indigo-500 pb-1 bg-transparent" value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)} />
        ) : (
          <h1 className="text-3xl font-bold text-gray-900 cursor-text hover:bg-gray-50 rounded px-2 -mx-2 py-1 transition-colors" onClick={() => setEditingTitle(true)}>{note.title}</h1>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-4 relative min-h-0 bg-gray-50">
        <SplitPane
          leftClassName={`overflow-y-auto h-full rounded-2xl ${splitMode ? '' : 'col-span-2'}`}
          rightClassName={splitMode ? 'overflow-y-auto h-full pl-4' : 'hidden'}
          left={(
            <div className="flex flex-col gap-6 pb-20">
              {/* THE CREATIVE EDITOR CANVAS */}
              <EditorContent editor={editor} className="h-full" />
              
              {showSlashMenu && (
                <div className="mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-xl p-1 z-50">
                  <button onClick={() => insertSlashCommand('todo')} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100">/todo</button>
                  <button onClick={() => insertSlashCommand('code')} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100">/code</button>
                  <button onClick={() => insertSlashCommand('image')} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100">/image (Paste URL)</button>
                </div>
              )}

              {/* INTEGRATED DRAWING BOARD */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Palette size={14}/> Infinite Canvas</h3>
                <NoteCanvasBoard note={note} />
              </div>

              {/* INTEGRATED HANDWRITING PAD */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Type size={14}/> Handwriting / OCR Pad</h3>
                <HandwritingPad note={note} />
              </div>
            </div>
          )}
          right={splitMode ? <DocumentWorkspace note={note} compact /> : <></>}
        />

        {/* AI GENERATION PANEL OVERLAY */}
        {generatedAsset && (
          <div className="absolute right-8 bottom-8 w-96 bg-white border border-gray-200 shadow-2xl rounded-2xl p-5 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles size={16} className="text-purple-600"/> {generatedAsset.title}</h3>
              <button onClick={() => setGeneratedAsset(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md"><X size={14} /></button>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-3 mb-4 max-h-24 overflow-y-auto border border-purple-100">
              <p className="text-[12px] text-purple-900 font-medium leading-tight italic">"{generatedAsset.prompt}"</p>
            </div>

            <div className="flex-1 min-h-[220px] bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden mb-4 border border-gray-200 relative group">
              {generatedAsset.previewImage ? (
                <img src={generatedAsset.previewImage} alt="Generated Preview" className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500" />
              ) : generatedAsset.assetUrl ? (
                <div className="text-center p-4">
                  <p className="text-sm font-bold mb-2 text-gray-700">3D Model Ready 🧊</p>
                  <a href={generatedAsset.assetUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline bg-blue-50 px-3 py-1.5 rounded-full inline-block">Preview Asset</a>
                </div>
              ) : (
                <p className="text-xs text-gray-400 animate-pulse">Loading asset...</p>
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <button onClick={() => setGeneratedAsset(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">Discard</button>
              <button onClick={insertGeneratedAsset} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-sm shadow-purple-200 flex items-center justify-center gap-1"><Image size={14} /> Insert to Note</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, active, title, children }: { onClick?: () => void; active?: boolean; title?: string; children: React.ReactNode; }) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-md transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
      {children}
    </button>
  );
}
