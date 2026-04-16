'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { Command, FileText, Hash, Sparkles, X } from 'lucide-react';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    searchQuery,
    setSearchQuery,
    notes,
    setActiveTag,
    setActiveView,
    selectNote,
    setSelectedSystemSection,
  } = useStore();

  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (!commandPaletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  React.useEffect(() => {
    if (commandPaletteOpen) {
      setQuery(searchQuery);
    }
  }, [commandPaletteOpen, searchQuery]);

  if (!commandPaletteOpen) return null;

  const q = query.toLowerCase().trim();
  const visibleNotes = notes
    .filter((n) => !n.isTrashed)
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.replace(/<[^>]+>/g, ' ').toLowerCase().includes(q))
    .slice(0, 8);
  const tags = Array.from(new Set(notes.filter((n) => !n.isTrashed).flatMap((n) => n.tags))).filter((t) => !q || t.toLowerCase().includes(q)).slice(0, 6);

  const runSearch = () => {
    setSearchQuery(query);
    setSelectedSystemSection(null);
    setActiveView('search');
    setCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/45 backdrop-blur-[1px] flex items-start justify-center p-4 md:p-10">
      <div
        className="w-full max-w-2xl surface-card rounded-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <span id="command-palette-title" className="sr-only">Command palette</span>
          <Command size={16} className="text-[var(--text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            placeholder="Search notes, tags, or actions..."
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)]"
          />
          <button className="p-1 rounded hover:bg-[var(--surface-muted)]" onClick={() => setCommandPaletteOpen(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-2 space-y-3">
          <section>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Actions</p>
            <button
              onClick={runSearch}
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-muted)] text-sm flex items-center gap-2"
            >
              <Sparkles size={14} /> Search all notes for “{query || '...'}”
            </button>
            <button
              onClick={() => {
                setSelectedSystemSection('favorites');
                setActiveView('notes');
                setCommandPaletteOpen(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-muted)] text-sm"
            >
              Open Favorites
            </button>
          </section>

          <section>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Notes</p>
            {visibleNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  selectNote(note.id);
                  setActiveView('note-editor');
                  setCommandPaletteOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-muted)]"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <FileText size={14} /> {note.title}
                </div>
              </button>
            ))}
            {visibleNotes.length === 0 && <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No notes matched.</p>}
          </section>

          <section>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Tags</p>
            <div className="flex flex-wrap gap-2 px-2 pb-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTag(tag);
                    setSelectedSystemSection(null);
                    setActiveView('notes');
                    setCommandPaletteOpen(false);
                  }}
                  className="chip hover:border-[var(--border-strong)]"
                >
                  <Hash size={11} /> {tag}
                </button>
              ))}
              {tags.length === 0 && <p className="text-sm text-[var(--text-muted)]">No tags matched.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
