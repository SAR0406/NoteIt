'use client';
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Brain, X, CheckCircle } from 'lucide-react';
import { isDue } from '@/lib/utils';
import { PillButton, SectionCard } from '@/components/ui/primitives';

export function FlashcardReview() {
  const { flashcards, reviewFlashcard, setActiveView } = useStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionCards] = useState(() =>
    flashcards.filter((fc) => isDue(fc.dueDate)).map((fc) => fc.id)
  );

  if (sessionCards.length === 0 || done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center app-bg text-center px-4">
        <CheckCircle size={64} className="text-[var(--success-600)] mb-4" />
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Session Complete! 🎉</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          {sessionCards.length === 0
            ? 'No cards due right now. Come back later!'
            : `You reviewed ${sessionCards.length} card${sessionCards.length !== 1 ? 's' : ''}!`}
        </p>
        <PillButton
          onClick={() => setActiveView('flashcards')}
          className="pill-button-active"
        >
          Back to Flashcards
        </PillButton>
      </div>
    );
  }

  const currentId = sessionCards[currentIdx];
  const card = flashcards.find((fc) => fc.id === currentId);
  if (!card) return null;

  const progress = currentIdx / sessionCards.length;

  const handleRate = (difficulty: 'again' | 'hard' | 'good' | 'easy') => {
    reviewFlashcard(card.id, difficulty);
    setRevealed(false);
    if (currentIdx + 1 >= sessionCards.length) {
      setDone(true);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col app-bg p-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="surface-card-accent rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Brain className="text-[var(--accent-600)]" size={20} /> Review Session
          </h2>
          <button onClick={() => setActiveView('flashcards')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <SectionCard title="Session Progress" subtitle="Stay calm and rate honestly" className="mb-6">
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>{currentIdx + 1} / {sessionCards.length}</span>
            <span>{Math.round(progress * 100)}% done · {sessionCards.length - currentIdx - 1} remaining</span>
          </div>
          <div className="h-2 bg-[var(--primary-100)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary-500)] rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </SectionCard>

        {/* Card */}
        <div className="flex-1 flex flex-col">
          <div className="surface-card rounded-2xl p-8 text-center mb-6 flex-1 flex flex-col items-center justify-center min-h-[200px]">
            {card.tags.length > 0 && (
              <div className="flex gap-1 mb-4">
                {card.tags.map((t) => (
                  <span key={t} className="chip chip-active">{t}</span>
                ))}
              </div>
            )}
            <p className="text-lg font-semibold text-[var(--text-primary)] mb-4">{card.front}</p>

            {revealed && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] w-full">
                <p className="text-xs font-semibold text-[var(--accent-600)] mb-2 uppercase">Answer</p>
                <p className="text-[var(--text-secondary)]">{card.back}</p>
              </div>
            )}
          </div>

          {/* Buttons */}
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-4 bg-[var(--text-primary)] text-white rounded-xl hover:bg-[#1f2937] font-medium text-lg"
            >
              Reveal Answer
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Again', difficulty: 'again' as const, color: 'bg-[#eef2ff] text-[#334155] hover:bg-[#e2e8f0]', emoji: '🔁' },
                { label: 'Hard', difficulty: 'hard' as const, color: 'bg-[#f8fafc] text-[#334155] hover:bg-[#eef2ff]', emoji: '😓' },
                { label: 'Good', difficulty: 'good' as const, color: 'bg-[#eaf7ff] text-[#1d4ed8] hover:bg-[#dbeafe]', emoji: '👍' },
                { label: 'Easy', difficulty: 'easy' as const, color: 'bg-[#e8fbf5] text-[#0f766e] hover:bg-[#d1fae5]', emoji: '⚡' },
              ].map(({ label, difficulty, color, emoji }) => (
                <button
                  key={difficulty}
                  onClick={() => handleRate(difficulty)}
                  className={`${color} rounded-xl py-3 font-medium flex flex-col items-center gap-1 border border-[var(--border)]`}
                >
                  <span>{emoji}</span>
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
