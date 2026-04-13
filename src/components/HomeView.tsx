'use client';
import React from 'react';
import { useStore } from '@/store/useStore';
import { Brain, BookOpen, Star, LayoutTemplate, Mic, Link2, Plus, ChevronRight, Files, Cloud } from 'lucide-react';
import { formatDate, isDue } from '@/lib/utils';

export function HomeView() {
  const {
    notes, flashcards, notebooks, setActiveView, selectNote,
    addNote, selectedTopicId, selectedSubjectId, selectedNotebookId,
  } = useStore();

  const dueCards = flashcards.filter((fc) => isDue(fc.dueDate));
  const recentNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);

  const handleNewNote = () => {
    const note = addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId });
    selectNote(note.id);
    setActiveView('note-editor');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 text-white mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                <Brain size={32} /> NoteIt MBBS
              </h1>
              <p className="text-blue-100 text-lg">Your all-in-one medical study companion</p>
              <p className="text-blue-200 text-sm mt-1">
                {notes.length} notes · {flashcards.length} flashcards · {notebooks.length} notebooks
              </p>
            </div>
            <button
              onClick={handleNewNote}
              className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-xl font-medium hover:bg-blue-50 shadow-md"
            >
              <Plus size={18} /> New Note
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {[
            { icon: <BookOpen size={22} />, label: 'Browse Notes', view: 'notes' as const, color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
            { icon: <Brain size={22} />, label: dueCards.length > 0 ? `Review ${dueCards.length} Cards` : 'Flashcards', view: 'flashcards' as const, color: `bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 ${dueCards.length > 0 ? 'ring-2 ring-orange-300' : ''}` },
            { icon: <LayoutTemplate size={22} />, label: 'Templates', view: 'templates' as const, color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
            { icon: <Mic size={22} />, label: 'Audio Notes', view: 'audio' as const, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
            { icon: <Files size={22} />, label: 'PDF Workspace', view: 'documents' as const, color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
            { icon: <Cloud size={22} />, label: 'Sync Backup', view: 'sync' as const, color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
          ].map(({ icon, label, view, color }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`border rounded-2xl p-4 flex flex-col items-center gap-2 font-medium transition-colors ${color}`}
            >
              {icon}
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent notes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><BookOpen size={18} /> Recent Notes</h2>
              <button onClick={() => setActiveView('notes')} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                See all <ChevronRight size={12} />
              </button>
            </div>
            {recentNotes.length === 0 && <p className="text-gray-400 text-sm">No notes yet</p>}
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                  onClick={() => { selectNote(note.id); setActiveView('note-editor'); }}
                >
                  {note.isFavorite ? <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0" /> : <BookOpen size={14} className="text-gray-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{note.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(note.updatedAt)}</p>
                  </div>
                  {note.tags.slice(0, 1).map((tag) => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex-shrink-0">{tag}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Flashcards due + Graph */}
          <div className="space-y-4">
            {dueCards.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-orange-700 flex items-center gap-2"><Brain size={18} /> Cards Due</h2>
                  <button
                    onClick={() => setActiveView('flashcard-review')}
                    className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600"
                  >
                    Review Now
                  </button>
                </div>
                <p className="text-orange-600 text-sm">{dueCards.length} flashcard{dueCards.length !== 1 ? 's' : ''} ready for review</p>
                <div className="mt-2 space-y-1">
                  {dueCards.slice(0, 3).map((fc) => (
                    <p key={fc.id} className="text-xs text-orange-500 truncate">• {fc.front}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Linked notes / graph teaser */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><Link2 size={18} /> Note Connections</h2>
                <button onClick={() => setActiveView('graph')} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                  Open Graph <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {notes.filter((n) => n.linkedNoteIds.length > 0).slice(0, 4).map((note) => (
                  <div key={note.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700 truncate flex-1">{note.title}</span>
                    <span className="text-xs text-blue-500 flex-shrink-0">🔗 {note.linkedNoteIds.length}</span>
                  </div>
                ))}
                {notes.filter((n) => n.linkedNoteIds.length > 0).length === 0 && (
                  <p className="text-gray-400 text-sm">No linked notes yet. Open a note and use the 🔗 button.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji: '✍️', title: 'Rich Editor', desc: 'Bold, italic, headings, lists, code blocks' },
            { emoji: '🧠', title: 'Spaced Repetition', desc: 'SM-2 algorithm for optimal revision' },
            { emoji: '🔗', title: 'Note Linking', desc: 'Connect related topics like Obsidian' },
            { emoji: '🤖', title: 'AI Tools', desc: 'Summarize notes & generate flashcards' },
            { emoji: '🎧', title: 'Audio Sync', desc: 'Record lectures with timestamps' },
            { emoji: '🎨', title: 'Templates', desc: 'SOAP, Case Sheet, Anatomy, Pharma' },
            { emoji: '🔍', title: 'Full Search', desc: 'Search by content, title, or tags' },
            { emoji: '💾', title: 'Auto-save', desc: 'All data saved locally, no login needed' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="text-2xl mb-1">{emoji}</div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
