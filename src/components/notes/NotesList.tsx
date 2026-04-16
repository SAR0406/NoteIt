'use client';
import React from 'react';
import { useStore } from '@/store/useStore';
import { Star, Plus, Edit3, RotateCcw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Note } from '@/types';
import { formatDate } from '@/lib/utils';
import { SegmentedControl } from '@/components/ui/primitives';

export function NotesList() {
  const {
    notes,
    topics,
    subjects,
    notebooks,
    selectedNotebookId,
    selectedSubjectId,
    selectedTopicId,
    selectNote,
    selectedNoteId,
    setActiveView,
    addNote,
    deleteNote,
    restoreNote,
    activeTag,
    searchQuery,
    selectedSystemSection,
    notesSort,
    notesFilter,
    setNotesSort,
    setNotesFilter,
  } = useStore();

  const allTags = Array.from(new Set(notes.filter((n) => !n.isTrashed).flatMap((n) => n.tags))).sort();

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

    if (selectedSystemSection === 'trash') {
      filtered = filtered.filter((n) => n.isTrashed);
    } else {
      filtered = filtered.filter((n) => !n.isTrashed);
    }

    if (selectedSystemSection === 'favorites') {
      filtered = filtered.filter((n) => n.isFavorite);
    }

    if (notesFilter === 'favorites') filtered = filtered.filter((n) => n.isFavorite);
    if (notesFilter === 'pinned') filtered = filtered.filter((n) => n.isPinned);

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

    const sorted = [...filtered];
    if (notesSort === 'title-asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      return sorted;
    }

    return sorted.sort((a, b) => {
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
    if (selectedSystemSection === 'trash') return 'Trash';
    if (selectedSystemSection === 'favorites') return 'Favorites';
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
    <div className="h-full bg-[var(--surface-muted)] border-r border-[var(--border)] flex flex-col overflow-hidden flex-shrink-0">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-white space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)] truncate">{getHeaderTitle()}</h2>
          {selectedSystemSection !== 'trash' && (
            <button
              onClick={handleAddNote}
              className="p-1.5 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-500)]"
              title="New note"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)]">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>

        <div className="flex items-center gap-2 flex-wrap">
          <SegmentedControl
            value={notesSort}
            onChange={(v) => setNotesSort(v as 'recent' | 'title-asc')}
            options={[{ label: 'Recent', value: 'recent' }, { label: 'A-Z', value: 'title-asc' }]}
          />
          <SegmentedControl
            value={notesFilter}
            onChange={(v) => setNotesFilter(v as 'all' | 'favorites' | 'pinned')}
            options={[{ label: 'All', value: 'all' }, { label: 'Fav', value: 'favorites' }, { label: 'Pinned', value: 'pinned' }]}
          />
          <select
            className="text-xs rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-[var(--text-secondary)]"
            onChange={(e) => useStore.getState().setActiveTag(e.target.value || null)}
            value={activeTag ?? ''}
            title="Filter by tag"
          >
            <option value="">All tags</option>
            {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <SlidersHorizontal size={13} className="text-[var(--text-muted)]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)]">
            <Edit3 size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No notes found</p>
            {selectedSystemSection !== 'trash' && (
              <button onClick={handleAddNote} className="mt-2 text-[var(--primary-600)] text-sm hover:underline">
                Create one
              </button>
            )}
          </div>
        )}

        {selectedSystemSection !== 'trash' && pinned.length > 0 && notesSort === 'recent' && (
          <div>
            <p className="px-4 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase bg-[var(--surface-accent)]">📌 Pinned</p>
            {pinned.map((note) => (
              <NoteCard key={note.id} note={note} context={getContext(note)} selected={note.id === selectedNoteId} onClick={() => { selectNote(note.id); setActiveView('note-editor'); }} onDelete={() => deleteNote(note.id)} />
            ))}
          </div>
        )}

        <div>
          {selectedSystemSection !== 'trash' && pinned.length > 0 && notesSort === 'recent' && <p className="px-4 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase bg-[var(--surface-accent)]">Notes</p>}
          {(notesSort === 'recent' ? rest : filtered).map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              context={getContext(note)}
              selected={note.id === selectedNoteId}
              onClick={() => { selectNote(note.id); setActiveView('note-editor'); }}
              onDelete={() => deleteNote(note.id)}
              onRestore={selectedSystemSection === 'trash' ? () => restoreNote(note.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note, context, selected, onClick, onDelete, onRestore }: { note: Note; context: string; selected: boolean; onClick: () => void; onDelete: () => void; onRestore?: () => void }) {
  const preview = note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  return (
    <div
      className={`px-4 py-3 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--surface-accent)] transition-all group ${
        selected ? 'bg-[var(--surface-accent)] border-l-2 border-l-[var(--primary-500)]' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {note.isFavorite && <Star size={11} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{note.title}</h3>
          </div>
          {context && <p className="text-xs text-[var(--primary-600)] mt-0.5 truncate">{context}</p>}
          {preview && <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{preview}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-[var(--text-muted)]">{formatDate(note.updatedAt)}</span>
            <div className="flex gap-1 flex-wrap">
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-xs bg-[var(--primary-100)] text-[var(--primary-600)] px-1.5 py-0.5 rounded-full">{tag}</span>
              ))}
              {note.tags.length > 2 && <span className="text-xs text-[var(--text-muted)]">+{note.tags.length - 2}</span>}
            </div>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onRestore ? (
            <button onClick={(e) => { e.stopPropagation(); onRestore(); }} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Restore">
              <RotateCcw size={13} />
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-red-50 text-red-500" title="Move to trash">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
