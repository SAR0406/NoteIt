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
  Trash2, Brain, Sparkles, BookOpen, X, AlignLeft, Code, Quote, PanelRightOpen,
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

export function NoteEditor() {
  const {
    notes, selectedNoteId, updateNote, deleteNote, toggleFavorite, togglePin,
    addTagToNote, removeTagFromNote, linkNotes, unlinkNote,
    generateFlashcardsFromNote, summarizeNote, generateQuizFromNote, addFlashcard,
    selectNote, addNote, selectedTopicId, selectedSubjectId, selectedNotebookId,
  } = useStore();

  const note = notes.find((n) => n.id === selectedNoteId);

  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'queued' | 'generating' | 'success' | 'fallback' | 'error'>('idle');

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
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[420px] px-1',
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

  const applyLocalFallback = (action: 'summarize' | 'flashcards' | 'quiz') => {
    if (!note) return;
    if (action === 'summarize') summarizeNote(note.id);
    else if (action === 'flashcards') generateFlashcardsFromNote(note.id);
    else generateQuizFromNote(note.id);
  };

  const toSafeUrl = (value?: string) => {
    if (!value) return '';
    const normalized = value.trim();
    if (normalized.startsWith('https://') || normalized.startsWith('http://') || normalized.startsWith('data:image/')) {
      return normalized;
    }
    return '';
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
        } | null;
      };

        if (action === 'summarize') {
          const points = (data.summaryPoints ?? []).filter(Boolean).slice(0, AI_SUMMARY_POINT_LIMIT);
          if (points.length === 0) {
            applyLocalFallback(action);
            setAiState('fallback');
            toast.success('Summary added (local fallback)');
          } else {
            const summaryHtml = `<h3>📝 AI Summary</h3><ul>${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`;
            updateNote(note.id, { content: `${note.content}<hr>${summaryHtml}` });
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
            toast.success(`NVIDIA NIM ${action === 'quiz' ? 'quiz cards' : 'flashcards'} generated!`);
          }
        } else {
        const safePreview = toSafeUrl(data.generated?.previewImage);
        const safeAsset = toSafeUrl(data.generated?.assetUrl);
          if (!safePreview && !safeAsset) {
            setAiState('fallback');
            toast.error('Generation completed but no preview URL was returned.');
          } else {
          const titleByAction: Record<'diagram' | 'image-convert' | '3d', string> = {
            diagram: '🖼️ AI Diagram/Photo Generation',
            'image-convert': '🎨 AI Image Conversion',
            '3d': '🧊 AI 3D Generation',
          };
          const title = titleByAction[action];
          const resultHtml = [
            `<h3>${title}</h3>`,
            `<p><strong>Model:</strong> ${escapeHtml(data.generated?.model ?? model)}</p>`,
            `<p><strong>Prompt:</strong> ${escapeHtml(prompt)}</p>`,
            safePreview ? `<p><img src="${escapeHtml(safePreview)}" alt="Generated output" /></p>` : '',
            safeAsset ? `<p><a href="${escapeHtml(safeAsset)}" target="_blank" rel="noreferrer">Open generated asset</a></p>` : '',
            ].join('');
            updateNote(note.id, { content: `${note.content}<hr>${resultHtml}` });
            setAiState('success');
            toast.success(action === '3d' ? 'Trellis 3D generation added to note!' : 'FLUX generation result added to note!');
          }
        }
    } catch {
      if (action === 'summarize' || action === 'flashcards' || action === 'quiz') {
        applyLocalFallback(action);
        setAiState('fallback');
        toast.success(`${action === 'quiz' ? 'Quiz' : action === 'summarize' ? 'Summary' : 'Flashcards'} generated (local fallback)`);
      } else {
        setAiState('error');
        toast.error('NVIDIA generation failed. Check API key and prompt/image input.');
      }
    }
    setAiLoading(false);
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white">
        <BookOpen size={56} className="mb-4 opacity-30" />
        <p className="text-lg font-medium text-gray-600">Select a note to edit</p>
        <p className="text-sm mt-1">Or create a new note from the sidebar</p>
        <button
          onClick={() => {
            const n = addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId });
            selectNote(n.id);
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + New Note
        </button>
      </div>
    );
  }

  const linkedNotes = notes.filter((n) => note.linkedNoteIds.includes(n.id));
  const unlinkableNotes = notes.filter((n) => n.id !== note.id && !note.linkedNoteIds.includes(n.id));
  const hasSelection = editor ? !editor.state.selection.empty : false;

  return (
    <div className="flex-1 flex flex-col bg-[var(--surface)] overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-2">
        <FloatingToolbar>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
          <UnderlineIcon size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive('highlight')} title="Highlight">
          <Highlighter size={15} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-[var(--border)] mx-1" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="H1">
          <Heading1 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="H2">
          <Heading2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="H3">
          <Heading3 size={15} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-[var(--border)] mx-1" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Ordered list">
          <ListOrdered size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Quote">
          <Quote size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Code">
          <Code size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus size={15} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-[var(--border)] mx-1" />

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSplitMode((v) => !v)}
            className={`p-1.5 rounded hover:bg-[var(--surface-muted)] ${splitMode ? 'text-indigo-600' : 'text-[var(--text-muted)]'}`}
            title="Split-screen mode"
          >
            <PanelRightOpen size={15} />
          </button>
          <button
            onClick={() => toggleFavorite(note.id)}
            className={`p-1.5 rounded hover:bg-[var(--surface-muted)] ${note.isFavorite ? 'text-yellow-500' : 'text-[var(--text-muted)]'}`}
            title="Toggle favorite"
          >
            <Star size={15} className={note.isFavorite ? 'fill-yellow-500' : ''} />
          </button>
          <button
            onClick={() => togglePin(note.id)}
            className={`p-1.5 rounded hover:bg-[var(--surface-muted)] ${note.isPinned ? 'text-blue-600' : 'text-[var(--text-muted)]'}`}
            title="Toggle pin"
          >
            <Pin size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowTagDropdown((v) => !v)}
              className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--text-muted)]"
              title="Tags"
            >
              <Tag size={15} />
            </button>
            {showTagDropdown && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[var(--border)] rounded-xl shadow-lg z-50 p-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] px-2 mb-1">Current tags</p>
                <div className="flex flex-wrap gap-1 px-2 mb-2">
                  {note.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-[var(--primary-100)] text-[var(--primary-600)] px-2 py-0.5 rounded-full">
                      {tag}
                      <button onClick={() => removeTagFromNote(note.id, tag)} className="hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs font-semibold text-[var(--text-muted)] px-2 mb-1">Add tag</p>
                <div className="max-h-32 overflow-y-auto">
                  {MEDICAL_TAGS.filter((t) => !note.tags.includes(t)).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTagToNote(note.id, tag)}
                      className="w-full text-left text-xs px-2 py-1 hover:bg-[var(--surface-muted)] rounded"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 mt-2 px-2">
                  <input
                    className="flex-1 text-xs border border-[var(--border)] rounded px-2 py-1 outline-none"
                    placeholder="Custom tag..."
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customTag.trim()) {
                        addTagToNote(note.id, customTag.trim().startsWith('#') ? customTag.trim() : `#${customTag.trim()}`);
                        setCustomTag('');
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowLinkDropdown((v) => !v)}
              className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--text-muted)]"
              title="Link notes"
            >
              <LinkIcon size={15} />
            </button>
            {showLinkDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[var(--border)] rounded-xl shadow-lg z-50 p-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] px-2 mb-1">Linked notes</p>
                {linkedNotes.map((n) => (
                  <div key={n.id} className="flex items-center justify-between px-2 py-1 hover:bg-[var(--surface-muted)] rounded">
                    <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{n.title}</span>
                    <button onClick={() => unlinkNote(note.id, n.id)} className="text-[var(--text-muted)] hover:text-red-400 ml-1">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {linkedNotes.length === 0 && <p className="text-xs text-[var(--text-muted)] px-2 mb-1">None</p>}
                <p className="text-xs font-semibold text-[var(--text-muted)] px-2 mt-2 mb-1">Link to</p>
                <div className="max-h-32 overflow-y-auto">
                  {unlinkableNotes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => linkNotes(note.id, n.id)}
                      className="w-full text-left text-xs px-2 py-1 hover:bg-[var(--surface-muted)] rounded truncate"
                    >
                      + {n.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowAiDropdown((v) => !v)}
              className={`p-1.5 rounded hover:bg-purple-50 text-purple-500 ${aiLoading ? 'animate-pulse' : ''}`}
              title="AI Tools"
            >
              <Sparkles size={15} />
            </button>
            {showAiDropdown && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-[var(--border)] rounded-xl shadow-lg z-50 p-2">
                <p className="text-[11px] text-[var(--text-muted)] px-1 mb-2">Photo generation/editing model: FLUX.2-Klein-4B</p>
                <button onClick={() => handleAI('summarize')} className="w-full text-left text-xs px-3 py-2 hover:bg-[var(--surface-muted)] rounded-lg flex items-center gap-2">
                  <AlignLeft size={12} /> Summarize note
                </button>
                <button onClick={() => handleAI('flashcards')} className="w-full text-left text-xs px-3 py-2 hover:bg-[var(--surface-muted)] rounded-lg flex items-center gap-2">
                  <Brain size={12} /> Generate flashcards
                </button>
                <button onClick={() => handleAI('quiz')} className="w-full text-left text-xs px-3 py-2 hover:bg-[var(--surface-muted)] rounded-lg flex items-center gap-2">
                  <BookOpen size={12} /> Generate quiz
                </button>
                <button onClick={() => handleAI('diagram')} className="w-full text-left text-xs px-3 py-2 hover:bg-[var(--surface-muted)] rounded-lg flex items-center gap-2">
                  <Sparkles size={12} /> Generate diagram/photo
                </button>
                <button onClick={() => handleAI('image-convert')} className="w-full text-left text-xs px-3 py-2 hover:bg-[var(--surface-muted)] rounded-lg flex items-center gap-2">
                  <Sparkles size={12} /> Convert photo style (anime/Ghibli)
                </button>
                <button onClick={() => handleAI('3d')} className="w-full text-left text-xs px-3 py-2 hover:bg-[var(--surface-muted)] rounded-lg flex items-center gap-2">
                  <Sparkles size={12} /> Generate 3D model (Trellis)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => { deleteNote(note.id); selectNote(null); }}
            className="p-1.5 rounded hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500"
            title="Delete note"
          >
            <Trash2 size={15} />
          </button>
        </div>
        </FloatingToolbar>

        {(hasSelection || aiLoading || aiState !== 'idle') && (
          <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
            {hasSelection && (
              <>
                <span className="chip chip-active">Create from selection</span>
                <PillButton onClick={() => handleAI('flashcards')}>Flashcard</PillButton>
                <PillButton onClick={() => handleAI('summarize')}>Summary</PillButton>
                <PillButton onClick={() => handleAI('quiz')}>Quiz</PillButton>
              </>
            )}
            {(aiLoading || aiState !== 'idle') && (
              <span className={`chip ${aiState === 'success' ? 'chip-active' : ''}`}>
                AI status: {aiLoading ? 'generating' : aiState}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pt-4 pb-2 border-b border-[var(--border)] bg-[var(--surface)]">
        {editingTitle ? (
          <input
            autoFocus
            className="text-2xl font-semibold text-[var(--text-primary)] w-full outline-none border-b-2 border-[var(--primary-500)] pb-1 bg-transparent"
            value={note.title}
            onChange={(e) => updateNote(note.id, { title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
          />
        ) : (
          <h1
            className="text-2xl font-semibold text-[var(--text-primary)] cursor-text hover:bg-[var(--surface-muted)] rounded px-1 -mx-1 py-0.5"
            onClick={() => setEditingTitle(true)}
          >
            {note.title}
          </h1>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-[var(--text-muted)]">Updated {formatDate(note.updatedAt)}</span>
          <span className="text-xs text-[var(--text-secondary)]">Docs {note.attachments.length}</span>
          <span className="text-xs text-[var(--text-secondary)]">Drawings {note.drawings.length}</span>
          {note.handwritingIndex && <span className="text-xs text-indigo-600">OCR indexed</span>}
          <div className="flex gap-1 flex-wrap">
            {note.tags.map((tag) => (
              <span key={tag} className="text-xs bg-[var(--primary-100)] text-[var(--primary-600)] px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
          {note.linkedNoteIds.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">🔗 {note.linkedNoteIds.length} linked</span>
          )}
        </div>
      </div>

      {note.audioUrl && (
        <div className="px-6 py-2 bg-[var(--surface-muted)] border-b border-[var(--border)]">
          <TimelineRail className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--danger-600)] animate-pulse" />
              REC linked to note timeline
            </div>
            <span className="text-xs text-[var(--text-muted)]">{note.audioTimestamps.length} timestamp marker(s)</span>
          </TimelineRail>
        </div>
      )}

      <div className="flex-1 overflow-hidden px-3 py-3">
        <SplitPane
          leftClassName={`overflow-y-auto rounded-2xl border border-[var(--border)] bg-white px-6 py-4 ${splitMode ? '' : 'col-span-2'}`}
          rightClassName={splitMode ? 'min-h-0' : 'hidden'}
          left={(
            <>
              <EditorContent editor={editor} />
              <NoteCanvasBoard note={note} />
              <div className="mt-6">
                <HandwritingPad note={note} />
              </div>
            </>
          )}
          right={splitMode ? <DocumentWorkspace note={note} compact /> : <></>}
        />
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
      className={`p-1.5 rounded hover:bg-[var(--surface-muted)] ${active ? 'bg-[var(--primary-100)] text-[var(--primary-600)]' : 'text-[var(--text-secondary)]'}`}
    >
      {children}
    </button>
  );
}
