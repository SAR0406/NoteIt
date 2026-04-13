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
import { AI_FLASHCARD_CARD_LIMIT, AI_QUIZ_CARD_LIMIT, AI_SUMMARY_POINT_LIMIT } from '@/lib/ai/constants';

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
  const [customTag, setCustomTag] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [splitMode, setSplitMode] = useState(false);

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

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

  const applyLocalFallback = (action: 'summarize' | 'flashcards' | 'quiz') => {
    if (!note) return;
    if (action === 'summarize') summarizeNote(note.id);
    else if (action === 'flashcards') generateFlashcardsFromNote(note.id);
    else generateQuizFromNote(note.id);
  };

  const handleAI = async (action: 'summarize' | 'flashcards' | 'quiz') => {
    if (!note) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
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
      };

      if (action === 'summarize') {
        const points = (data.summaryPoints ?? []).filter(Boolean).slice(0, AI_SUMMARY_POINT_LIMIT);
        if (points.length === 0) {
          applyLocalFallback(action);
          toast.success('Summary added (local fallback)');
        } else {
          const summaryHtml = `<h3>📝 AI Summary</h3><ul>${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`;
          updateNote(note.id, { content: `${note.content}<hr>${summaryHtml}` });
          toast.success('NVIDIA NIM summary added!');
        }
      } else {
        const cards = (data.flashcards ?? [])
          .filter((c) => c.front && c.back)
          .slice(0, action === 'quiz' ? AI_QUIZ_CARD_LIMIT : AI_FLASHCARD_CARD_LIMIT);
        if (cards.length === 0) {
          applyLocalFallback(action);
          toast.success(`${action === 'quiz' ? 'Quiz' : 'Flashcards'} generated (local fallback)`);
        } else {
          cards.forEach((card) => addFlashcard(card.front, card.back, note.id, note.tags));
          toast.success(`NVIDIA NIM ${action === 'quiz' ? 'quiz cards' : 'flashcards'} generated!`);
        }
      }
    } catch {
      applyLocalFallback(action);
      toast.success(`${action === 'quiz' ? 'Quiz' : action === 'summarize' ? 'Summary' : 'Flashcards'} generated (local fallback)`);
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

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center gap-1 flex-wrap">
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
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="H1">
          <Heading1 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="H2">
          <Heading2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="H3">
          <Heading3 size={15} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
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
        <div className="w-px h-5 bg-gray-200 mx-1" />

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSplitMode((v) => !v)}
            className={`p-1.5 rounded hover:bg-gray-100 ${splitMode ? 'text-indigo-600' : 'text-gray-400'}`}
            title="Split-screen mode"
          >
            <PanelRightOpen size={15} />
          </button>
          <button
            onClick={() => toggleFavorite(note.id)}
            className={`p-1.5 rounded hover:bg-gray-100 ${note.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
            title="Toggle favorite"
          >
            <Star size={15} className={note.isFavorite ? 'fill-yellow-500' : ''} />
          </button>
          <button
            onClick={() => togglePin(note.id)}
            className={`p-1.5 rounded hover:bg-gray-100 ${note.isPinned ? 'text-blue-600' : 'text-gray-400'}`}
            title="Toggle pin"
          >
            <Pin size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowTagDropdown((v) => !v)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              title="Tags"
            >
              <Tag size={15} />
            </button>
            {showTagDropdown && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2">
                <p className="text-xs font-semibold text-gray-500 px-2 mb-1">Current tags</p>
                <div className="flex flex-wrap gap-1 px-2 mb-2">
                  {note.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {tag}
                      <button onClick={() => removeTagFromNote(note.id, tag)} className="hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs font-semibold text-gray-500 px-2 mb-1">Add tag</p>
                <div className="max-h-32 overflow-y-auto">
                  {MEDICAL_TAGS.filter((t) => !note.tags.includes(t)).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTagToNote(note.id, tag)}
                      className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 mt-2 px-2">
                  <input
                    className="flex-1 text-xs border rounded px-2 py-1 outline-none"
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
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              title="Link notes"
            >
              <LinkIcon size={15} />
            </button>
            {showLinkDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2">
                <p className="text-xs font-semibold text-gray-500 px-2 mb-1">Linked notes</p>
                {linkedNotes.map((n) => (
                  <div key={n.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded">
                    <span className="text-xs text-gray-700 truncate flex-1">{n.title}</span>
                    <button onClick={() => unlinkNote(note.id, n.id)} className="text-gray-400 hover:text-red-400 ml-1">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {linkedNotes.length === 0 && <p className="text-xs text-gray-400 px-2 mb-1">None</p>}
                <p className="text-xs font-semibold text-gray-500 px-2 mt-2 mb-1">Link to</p>
                <div className="max-h-32 overflow-y-auto">
                  {unlinkableNotes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => linkNotes(note.id, n.id)}
                      className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate"
                    >
                      + {n.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative group">
            <button className={`p-1.5 rounded hover:bg-purple-50 text-purple-500 ${aiLoading ? 'animate-pulse' : ''}`} title="AI Tools">
              <Sparkles size={15} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1 hidden group-hover:block">
              <button onClick={() => handleAI('summarize')} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                <AlignLeft size={12} /> Summarize note
              </button>
              <button onClick={() => handleAI('flashcards')} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                <Brain size={12} /> Generate flashcards
              </button>
              <button onClick={() => handleAI('quiz')} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                <BookOpen size={12} /> Generate quiz
              </button>
            </div>
          </div>

          <button
            onClick={() => { deleteNote(note.id); selectNote(null); }}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Delete note"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="px-6 pt-4 pb-2 border-b border-gray-100">
        {editingTitle ? (
          <input
            autoFocus
            className="text-2xl font-bold text-gray-800 w-full outline-none border-b-2 border-blue-500 pb-1 bg-transparent"
            value={note.title}
            onChange={(e) => updateNote(note.id, { title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
          />
        ) : (
          <h1
            className="text-2xl font-bold text-gray-800 cursor-text hover:bg-gray-50 rounded px-1 -mx-1 py-0.5"
            onClick={() => setEditingTitle(true)}
          >
            {note.title}
          </h1>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">Updated {formatDate(note.updatedAt)}</span>
          <span className="text-xs text-gray-500">Docs {note.attachments.length}</span>
          <span className="text-xs text-gray-500">Drawings {note.drawings.length}</span>
          {note.handwritingIndex && <span className="text-xs text-indigo-600">OCR indexed</span>}
          <div className="flex gap-1 flex-wrap">
            {note.tags.map((tag) => (
              <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
          {note.linkedNoteIds.length > 0 && (
            <span className="text-xs text-gray-400">🔗 {note.linkedNoteIds.length} linked</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className={`overflow-y-auto px-6 py-4 ${splitMode ? 'w-[60%]' : 'w-full'}`}>
          <EditorContent editor={editor} />
          <div className="mt-6">
            <HandwritingPad note={note} />
          </div>
        </div>
        {splitMode && <DocumentWorkspace note={note} compact />}
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
      className={`p-1.5 rounded hover:bg-gray-100 ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
    >
      {children}
    </button>
  );
}
