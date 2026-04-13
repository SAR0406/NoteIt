'use client';
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Brain, X, ChevronRight, CheckCircle } from 'lucide-react';
import { isDue } from '@/lib/utils';
import toast from 'react-hot-toast';

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
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Complete! 🎉</h2>
        <p className="text-gray-500 mb-6">
          {sessionCards.length === 0
            ? 'No cards due right now. Come back later!'
            : `You reviewed ${sessionCards.length} card${sessionCards.length !== 1 ? 's' : ''}!`}
        </p>
        <button
          onClick={() => setActiveView('flashcards')}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium"
        >
          Back to Flashcards
        </button>
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
    <div className="flex-1 flex flex-col bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <Brain className="text-purple-500" size={20} /> Review Session
          </h2>
          <button onClick={() => setActiveView('flashcards')} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{currentIdx + 1} / {sessionCards.length}</span>
            <span>{Math.round(progress * 100)}% done</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center mb-6 flex-1 flex flex-col items-center justify-center min-h-[200px]">
            {card.tags.length > 0 && (
              <div className="flex gap-1 mb-4">
                {card.tags.map((t) => (
                  <span key={t} className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
            <p className="text-lg font-semibold text-gray-800 mb-4">{card.front}</p>

            {revealed && (
              <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                <p className="text-xs font-semibold text-purple-500 mb-2 uppercase">Answer</p>
                <p className="text-gray-700">{card.back}</p>
              </div>
            )}
          </div>

          {/* Buttons */}
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-4 bg-gray-800 text-white rounded-xl hover:bg-gray-700 font-medium text-lg"
            >
              Reveal Answer
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Again', difficulty: 'again' as const, color: 'bg-red-500 hover:bg-red-600', emoji: '🔁' },
                { label: 'Hard', difficulty: 'hard' as const, color: 'bg-orange-500 hover:bg-orange-600', emoji: '😓' },
                { label: 'Good', difficulty: 'good' as const, color: 'bg-blue-500 hover:bg-blue-600', emoji: '👍' },
                { label: 'Easy', difficulty: 'easy' as const, color: 'bg-green-500 hover:bg-green-600', emoji: '⚡' },
              ].map(({ label, difficulty, color, emoji }) => (
                <button
                  key={difficulty}
                  onClick={() => handleRate(difficulty)}
                  className={`${color} text-white rounded-xl py-3 font-medium flex flex-col items-center gap-1`}
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
