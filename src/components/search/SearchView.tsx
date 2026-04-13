'use client';
import React from 'react';
import { useStore } from '@/store/useStore';
import { Search, Tag } from 'lucide-react';
import { Note } from '@/types';
import { formatDate } from '@/lib/utils';

export function SearchView() {
  const { notes, subjects, notebooks, topics, searchQuery, setSearchQuery, activeTag, setActiveTag, selectNote, setActiveView } = useStore();

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();

  const getFilteredNotes = (): Note[] => {
    let filtered = notes;
    if (activeTag) {
      filtered = filtered.filter((n) => n.tags.includes(activeTag));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.replace(/<[^>]+>/g, ' ').toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return filtered;
  };

  const getContext = (note: Note) => {
    const nb = notebooks.find((n) => n.id === note.notebookId);
    const sub = subjects.find((s) => s.id === note.subjectId);
    const topic = topics.find((t) => t.id === note.topicId);
    return [nb?.name, sub?.name, topic?.name].filter(Boolean).join(' › ');
  };

  const results = getFilteredNotes();

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="text-gray-500" size={26} /> Search
        </h1>

        {/* Search box */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm mb-5">
          <Search size={18} className="text-gray-400" />
          <input
            autoFocus
            className="flex-1 outline-none text-gray-800 text-base"
            placeholder="Search by title, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          )}
        </div>

        {/* Tag filters */}
        <div className="flex gap-2 flex-wrap mb-5">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
              !activeTag ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                activeTag === tag ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results */}
        <p className="text-sm text-gray-500 mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>

        <div className="space-y-3">
          {results.map((note) => {
            const preview = note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            // Highlight query in preview
            const q = searchQuery.toLowerCase();
            const idx = q ? preview.toLowerCase().indexOf(q) : -1;
            const snippet = idx >= 0
              ? preview.slice(Math.max(0, idx - 40), idx + 100)
              : preview.slice(0, 120);

            return (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-sm hover:border-blue-300"
                onClick={() => { selectNote(note.id); setActiveView('note-editor'); }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 mb-0.5">{note.title}</h3>
                    {getContext(note) && (
                      <p className="text-xs text-blue-500 mb-1">{getContext(note)}</p>
                    )}
                    {snippet && <p className="text-sm text-gray-600 line-clamp-2">{snippet}{snippet.length < preview.length ? '…' : ''}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">{formatDate(note.updatedAt)}</span>
                      <div className="flex gap-1 flex-wrap">
                        {note.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {results.length === 0 && (searchQuery || activeTag) && (
            <div className="text-center py-12 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p>No notes found for &ldquo;{searchQuery || activeTag}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
