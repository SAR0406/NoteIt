'use client';
import React from 'react';
import { useStore } from '@/store/useStore';
import { Star, Plus, Edit3 } from 'lucide-react';
import { Note } from '@/types';
import { formatDate } from '@/lib/utils';

export function NotesList() {
  const {
    notes, topics, subjects, notebooks,
    selectedNotebookId, selectedSubjectId, selectedTopicId,
    selectNote, selectedNoteId, setActiveView, addNote,
    activeTag, searchQuery,
  } = useStore();

  const getFilteredNotes = (): Note[] => {
    let filtered = notes;

    if (selectedTopicId) {
      filtered = filtered.filter((n) => n.topicId === selectedTopicId);
    } else if (selectedSubjectId) {
      const sub = subjects.find((s) => s.id === selectedSubjectId);
      const topicIds = sub?.topicIds ?? [];
      filtered = filtered.filter((n) => n.subjectId === selectedSubjectId || topicIds.includes(n.topicId ?? ''));
    } else if (selectedNotebookId) {
      filtered = filtered.filter((n) => n.notebookId === selectedNotebookId);
    }

    if (activeTag) {
      filtered = filtered.filter((n) => n.tags.includes(activeTag));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)) ||
          n.handwritingIndex.toLowerCase().includes(q) ||
          n.attachments.some((a) => a.indexedText.toLowerCase().includes(q)) ||
          n.drawings.some((d) => d.indexedText.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  const getContext = (note: Note) => {
    const nb = notebooks.find((n) => n.id === note.notebookId);
    const sub = subjects.find((s) => s.id === note.subjectId);
    const topic = topics.find((t) => t.id === note.topicId);
    return [nb?.name, sub?.name, topic?.name].filter(Boolean).join(' › ');
  };

  const filtered = getFilteredNotes();
  const pinned = filtered.filter((n) => n.isPinned);
  const rest = filtered.filter((n) => !n.isPinned);

  const getHeaderTitle = () => {
    if (activeTag) return `Tag: ${activeTag}`;
    if (searchQuery) return `Search: "${searchQuery}"`;
    if (selectedTopicId) return topics.find((t) => t.id === selectedTopicId)?.name ?? 'Notes';
    if (selectedSubjectId) return subjects.find((s) => s.id === selectedSubjectId)?.name ?? 'Notes';
    if (selectedNotebookId) return notebooks.find((n) => n.id === selectedNotebookId)?.name ?? 'Notes';
    return 'All Notes';
  };

  const handleAddNote = () => {
    const note = addNote({
      topicId: selectedTopicId,
      subjectId: selectedSubjectId,
      notebookId: selectedNotebookId,
    });
    selectNote(note.id);
    setActiveView('note-editor');
  };

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-screen overflow-hidden flex-shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 truncate">{getHeaderTitle()}</h2>
          <button
            onClick={handleAddNote}
            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            title="New note"
          >
            <Plus size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Edit3 size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No notes found</p>
            <button onClick={handleAddNote} className="mt-2 text-blue-600 text-sm hover:underline">
              Create one
            </button>
          </div>
        )}

        {pinned.length > 0 && (
          <div>
            <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase bg-gray-100">📌 Pinned</p>
            {pinned.map((note) => (
              <NoteCard key={note.id} note={note} context={getContext(note)} selected={note.id === selectedNoteId} onClick={() => { selectNote(note.id); setActiveView('note-editor'); }} />
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <div>
            {pinned.length > 0 && <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase bg-gray-100">Notes</p>}
            {rest.map((note) => (
              <NoteCard key={note.id} note={note} context={getContext(note)} selected={note.id === selectedNoteId} onClick={() => { selectNote(note.id); setActiveView('note-editor'); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, context, selected, onClick }: { note: Note; context: string; selected: boolean; onClick: () => void }) {
  const preview = note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
        selected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {note.isFavorite && <Star size={11} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            <h3 className="text-sm font-medium text-gray-800 truncate">{note.title}</h3>
          </div>
          {context && <p className="text-xs text-blue-600 mt-0.5 truncate">{context}</p>}
          {preview && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preview}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-400">{formatDate(note.updatedAt)}</span>
            <div className="flex gap-1 flex-wrap">
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="text-xs text-gray-400">+{note.tags.length - 2}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
