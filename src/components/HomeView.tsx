'use client';
import React from 'react';
import { useStore } from '@/store/useStore';
import {
  Brain, BookOpen, Plus, ChevronRight, Files, Mic,
  Flame, CalendarClock, Target, Sparkles, BarChart3,
} from 'lucide-react';
import { formatDate, isDue } from '@/lib/utils';
import { PillButton, SectionCard, StatCard } from '@/components/ui/primitives';

// TODO: Replace with per-user exam schedule from persisted profile/settings.
const DEFAULT_EXAM_COUNTDOWN_DAYS = 12;

export function HomeView() {
  const {
    notes, flashcards, notebooks, setActiveView, selectNote,
    addNote, selectedTopicId, selectedSubjectId, selectedNotebookId,
  } = useStore();
  const activeNotes = notes.filter((n) => !n.isTrashed);

  const dueCards = flashcards.filter((fc) => isDue(fc.dueDate));
  const recentNotes = [...activeNotes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  const latestNote = recentNotes[0];

  const weakTopics = (() => {
    const counts: Record<string, number> = {};
    dueCards.forEach((card) => {
      card.tags.forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
  })();

  const reviewPressure = dueCards.length > 50 ? 'High' : dueCards.length > 20 ? 'Moderate' : 'Balanced';
  const countdownDays = DEFAULT_EXAM_COUNTDOWN_DAYS;

  const handleNewNote = () => {
    const note = addNote({ topicId: selectedTopicId, subjectId: selectedSubjectId, notebookId: selectedNotebookId });
    selectNote(note.id);
    setActiveView('note-editor');
  };

  return (
    <div className="flex-1 overflow-y-auto app-bg p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="surface-card-accent rounded-3xl p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                👋 Good Evening, Student
              </h1>
              <p className="text-[var(--text-secondary)] text-sm md:text-base">Today’s control center for writing, recall, and revision momentum.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="chip chip-active"><CalendarClock size={12} /> Anatomy exam in {countdownDays} days</span>
                <span className="chip"><Target size={12} /> Revision pressure: {reviewPressure}</span>
                <span className="chip"><Sparkles size={12} /> {activeNotes.length} notes · {flashcards.length} cards · {notebooks.length} groups</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <PillButton className="pill-button-active" onClick={handleNewNote}><Plus size={14} /> New Note</PillButton>
              <PillButton onClick={() => setActiveView('audio')}><Mic size={14} /> Record Lecture</PillButton>
              <PillButton onClick={() => setActiveView('documents')}><Files size={14} /> Import PDF</PillButton>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Total Notes" value={activeNotes.length} icon={<BookOpen size={16} className="text-[var(--primary-600)]" />} />
          <StatCard label="Cards Due Today" value={dueCards.length} icon={<Brain size={16} className="text-[var(--accent-600)]" />} />
          <StatCard label="Study Streak Signal" value={`${Math.min(100, 60 + Math.round(activeNotes.length / 2))}%`} icon={<Flame size={16} className="text-[var(--warning-600)]" />} />
          <StatCard label="Knowledge Links" value={activeNotes.filter((n) => n.linkedNoteIds.length > 0).length} icon={<BarChart3 size={16} className="text-[var(--success-600)]" />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Continue Studying"
            subtitle={latestNote ? `Last updated ${formatDate(latestNote.updatedAt)}` : 'Jump back into your last active note'}
            action={latestNote ? (
              <button
                onClick={() => {
                  selectNote(latestNote.id);
                  setActiveView('note-editor');
                }}
                className="tab-button tab-button-active"
              >
                Open <ChevronRight size={12} />
              </button>
            ) : undefined}
          >
            {latestNote ? (
              <button
                onClick={() => {
                  selectNote(latestNote.id);
                  setActiveView('note-editor');
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-left hover:border-[var(--border-strong)]"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{latestNote.title}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                  {latestNote.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'No content yet'}
                </p>
              </button>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No notes yet — create your first note to begin.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Flashcards Due Today"
            subtitle={dueCards.length > 0 ? `${dueCards.length} cards are ready` : 'All caught up'}
            tone={dueCards.length > 0 ? 'warning' : 'success'}
            action={dueCards.length > 0 ? (
              <button onClick={() => setActiveView('flashcard-review')} className="pill-button pill-button-active">
                Start Session
              </button>
            ) : undefined}
          >
            {dueCards.length > 0 ? (
              <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                {dueCards.slice(0, 5).map((fc) => (
                  <p key={fc.id} className="truncate">• {fc.front}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--success-600)]">No cards due right now.</p>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Weak Topics" subtitle="Most frequent due areas">
            {weakTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setActiveView('flashcards');
                    }}
                    className="chip chip-active"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No weak signals yet. Continue writing and reviewing for insights.</p>
            )}
          </SectionCard>

          <SectionCard title="Quick Actions" subtitle="One-tap jump to essential workflows" tone="accent">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'New Note', action: handleNewNote },
                { label: 'Review Cards', action: () => setActiveView('flashcard-review') },
                { label: 'Open Subjects', action: () => setActiveView('subjects') },
                { label: 'Open Documents', action: () => setActiveView('documents') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Recent Notes" subtitle="Fast return to active contexts">
          <div className="grid gap-2 md:grid-cols-2">
            {recentNotes.slice(0, 6).map((note) => (
              <button
                key={note.id}
                onClick={() => { selectNote(note.id); setActiveView('note-editor'); }}
                className="rounded-xl border border-[var(--border)] bg-white p-3 text-left hover:border-[var(--border-strong)]"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{note.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Updated {formatDate(note.updatedAt)}</p>
              </button>
            ))}
            {recentNotes.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No notes yet.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
