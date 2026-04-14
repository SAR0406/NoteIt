'use client';
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Brain, Plus, Trash2, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import { Flashcard } from '@/types';
import { formatDate, isDue } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Chip, PillButton, SectionCard, StatCard } from '@/components/ui/primitives';

export function FlashcardsView() {
  const { flashcards, addFlashcard, setActiveView } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const allTags = Array.from(new Set(flashcards.flatMap((fc) => fc.tags)));
  const filtered = selectedTag ? flashcards.filter((fc) => fc.tags.includes(selectedTag)) : flashcards;
  const due = filtered.filter((fc) => isDue(fc.dueDate));
  const upcoming = filtered.filter((fc) => !isDue(fc.dueDate));

  const handleAdd = () => {
    if (!front.trim() || !back.trim()) return;
    addFlashcard(front.trim(), back.trim(), null, []);
    setFront('');
    setBack('');
    setShowForm(false);
    toast.success('Flashcard added!');
  };

  return (
    <div className="flex-1 overflow-y-auto app-bg p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="surface-card-accent rounded-3xl px-6 py-5 mb-6">
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Brain className="text-[var(--accent-600)]" size={28} /> Flashcards
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Active recall + spaced repetition with calmer session flow</p>
          </div>
          <div className="flex gap-2">
            {due.length > 0 && (
              <PillButton
                onClick={() => setActiveView('flashcard-review')}
                className="pill-button-active"
              >
                <RotateCcw size={16} /> Review {due.length} due
              </PillButton>
            )}
            <PillButton
              onClick={() => setShowForm(!showForm)}
              className="pill-button-active"
            >
              <Plus size={16} /> New Card
            </PillButton>
          </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Cards" value={flashcards.length} icon={<span>📚</span>} />
          <StatCard label="Due Now" value={due.length} icon={<span>⏰</span>} />
          <StatCard label="Upcoming" value={upcoming.length} icon={<span>✅</span>} />
        </div>

        {/* New card form */}
        {showForm && (
          <SectionCard title="New Flashcard" className="mb-6">
            <textarea
              className="w-full border border-[var(--border)] rounded-xl p-3 text-sm outline-none focus:border-[var(--accent-600)] mb-3 resize-none"
              placeholder="Front (question)..."
              rows={2}
              value={front}
              onChange={(e) => setFront(e.target.value)}
            />
            <textarea
              className="w-full border border-[var(--border)] rounded-xl p-3 text-sm outline-none focus:border-[var(--accent-600)] mb-3 resize-none"
              placeholder="Back (answer)..."
              rows={3}
              value={back}
              onChange={(e) => setBack(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="pill-button pill-button-active">
                Add Card
              </button>
              <button onClick={() => setShowForm(false)} className="pill-button">
                Cancel
              </button>
            </div>
          </SectionCard>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button onClick={() => setSelectedTag('')} className={`pill-button ${!selectedTag ? 'pill-button-active' : ''}`}>All</button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                className={`pill-button ${selectedTag === tag ? 'pill-button-active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Due cards */}
        {due.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
              <Clock size={16} /> Due for Review ({due.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {due.map((fc) => (
                <FlashcardItem key={fc.id} fc={fc} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h2 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
              <CheckCircle size={16} /> Upcoming ({upcoming.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcoming.map((fc) => (
                <FlashcardItem key={fc.id} fc={fc} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Brain size={48} className="mx-auto mb-3 opacity-30" />
            <p>No flashcards yet. Create one or generate from a note!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FlashcardItem({ fc }: { fc: Flashcard }) {
  const { deleteFlashcard } = useStore();
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="surface-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow relative group"
      onClick={() => setFlipped(!flipped)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-1 flex-wrap">
          {fc.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); deleteFlashcard(fc.id); }}
          className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger-600)] ml-2"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {flipped ? (
        <div>
          <p className="text-xs font-semibold text-[var(--accent-600)] mb-1">ANSWER</p>
          <p className="text-sm text-[var(--text-secondary)]">{fc.back}</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">QUESTION — click to reveal</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{fc.front}</p>
        </div>
      )}
      <p className="text-xs text-[var(--text-muted)] mt-2">Due: {formatDate(fc.dueDate)} · Rep: {fc.repetitions}</p>
    </div>
  );
}
