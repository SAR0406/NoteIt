'use client';
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Brain, Plus, Trash2, ChevronRight, Clock, CheckCircle, Star, RotateCcw } from 'lucide-react';
import { Flashcard } from '@/types';
import { formatDate, isDue } from '@/lib/utils';
import toast from 'react-hot-toast';

export function FlashcardsView() {
  const { flashcards, addFlashcard, deleteFlashcard, setActiveView, notes } = useStore();
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
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Brain className="text-purple-500" size={28} /> Flashcards
            </h1>
            <p className="text-gray-500 text-sm mt-1">Active Recall + Spaced Repetition (SM-2)</p>
          </div>
          <div className="flex gap-2">
            {due.length > 0 && (
              <button
                onClick={() => setActiveView('flashcard-review')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium"
              >
                <RotateCcw size={16} /> Review {due.length} due
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
            >
              <Plus size={16} /> New Card
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Cards" value={flashcards.length} color="bg-blue-50 border-blue-200" icon="📚" />
          <StatCard title="Due Now" value={due.length} color="bg-orange-50 border-orange-200" icon="⏰" />
          <StatCard title="Upcoming" value={upcoming.length} color="bg-green-50 border-green-200" icon="✅" />
        </div>

        {/* New card form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">New Flashcard</h3>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-purple-400 mb-3 resize-none"
              placeholder="Front (question)..."
              rows={2}
              value={front}
              onChange={(e) => setFront(e.target.value)}
            />
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-purple-400 mb-3 resize-none"
              placeholder="Back (answer)..."
              rows={3}
              value={back}
              onChange={(e) => setBack(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                Add Card
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setSelectedTag('')}
              className={`text-xs px-3 py-1 rounded-full border ${!selectedTag ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:border-purple-400'}`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                className={`text-xs px-3 py-1 rounded-full border ${selectedTag === tag ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:border-purple-400'}`}
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
          <div className="text-center py-16 text-gray-400">
            <Brain size={48} className="mx-auto mb-3 opacity-30" />
            <p>No flashcards yet. Create one or generate from a note!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-600">{title}</p>
        </div>
      </div>
    </div>
  );
}

function FlashcardItem({ fc }: { fc: Flashcard }) {
  const { deleteFlashcard } = useStore();
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow relative group"
      onClick={() => setFlipped(!flipped)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-1 flex-wrap">
          {fc.tags.map((t) => (
            <span key={t} className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); deleteFlashcard(fc.id); }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {flipped ? (
        <div>
          <p className="text-xs font-semibold text-purple-500 mb-1">ANSWER</p>
          <p className="text-sm text-gray-700">{fc.back}</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-1">QUESTION — click to reveal</p>
          <p className="text-sm font-medium text-gray-800">{fc.front}</p>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">Due: {formatDate(fc.dueDate)} · Rep: {fc.repetitions}</p>
    </div>
  );
}
