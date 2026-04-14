'use client';

import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { BookOpen, Plus, ChevronRight, FolderOpen } from 'lucide-react';
import { Chip, PillButton, SectionCard } from '@/components/ui/primitives';

const YEAR_LABELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
const MIN_ACADEMIC_YEAR = 1;
const MAX_ACADEMIC_YEAR = 4;

const SUBJECT_COLOR_BY_NAME: Record<string, string> = {
  anatomy: '#3b5bdb',
  physiology: '#0f9d75',
  biochemistry: '#7c3aed',
  pathology: '#d97706',
  pharmacology: '#9333ea',
  microbiology: '#0891b2',
};

export function SubjectsView() {
  const {
    notebooks,
    subjects,
    topics,
    setActiveView,
    selectNotebook,
    selectSubject,
    addNotebook,
  } = useStore();

  const yearBuckets = useMemo(() => {
    const buckets: Array<typeof notebooks> = [[], [], [], []];
    notebooks.forEach((nb) => {
      const year = nb.academicYear ?? MIN_ACADEMIC_YEAR;
      const bucket = Math.min(Math.max(year, MIN_ACADEMIC_YEAR), MAX_ACADEMIC_YEAR) - 1;
      buckets[bucket].push(nb);
    });
    return buckets;
  }, [notebooks]);

  const subjectColor = (name: string, fallback: string) => {
    const key = name.toLowerCase();
    const matched = Object.keys(SUBJECT_COLOR_BY_NAME).find((k) => key.includes(k));
    return matched ? SUBJECT_COLOR_BY_NAME[matched] : fallback;
  };

  const openNotebook = (id: string) => {
    selectNotebook(id);
    setActiveView('notes');
  };

  const openSubject = (notebookId: string, subjectId: string) => {
    selectNotebook(notebookId);
    selectSubject(subjectId);
    setActiveView('notes');
  };

  return (
    <div className="flex-1 overflow-y-auto app-bg p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="surface-card-accent rounded-3xl px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Subjects</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Structured academic flow: Year → Subject → Notebook
              </p>
            </div>
            <PillButton
              className="pill-button-active"
              onClick={() => {
                addNotebook('New Subject Group', '#4c6ef5');
              }}
            >
              <Plus size={14} /> New Notebook
            </PillButton>
          </div>
        </div>

        {yearBuckets.map((bucket, index) => (
          <SectionCard
            key={YEAR_LABELS[index]}
            title={YEAR_LABELS[index]}
            subtitle={bucket.length === 0 ? 'No subjects yet' : `${bucket.length} notebook groups`}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {bucket.map((nb) => {
                const nbSubjects = subjects.filter((s) => nb.subjectIds.includes(s.id));
                return (
                  <div key={nb.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                    <button
                      onClick={() => openNotebook(nb.id)}
                      className="mb-2 flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{nb.icon}</span>
                        <span className="font-medium text-[var(--text-primary)]">{nb.name}</span>
                      </div>
                      <ChevronRight size={14} className="text-[var(--text-muted)]" />
                    </button>

                    <div className="flex flex-wrap gap-1.5">
                      {nbSubjects.length === 0 && <Chip>No subjects</Chip>}
                      {nbSubjects.map((sub) => {
                        const subTopics = topics.filter((t) => sub.topicIds.includes(t.id));
                        const color = subjectColor(sub.name, nb.color);
                        return (
                          <button
                            key={sub.id}
                            onClick={() => openSubject(nb.id, sub.id)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                          >
                            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                            {sub.name}
                            <span className="text-[10px] text-[var(--text-muted)]">({subTopics.length})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {bucket.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--text-muted)]">
                <FolderOpen size={20} className="mx-auto mb-2" />
                Start by adding notebook groups and subjects for this academic year.
              </div>
            )}
          </SectionCard>
        ))}

        <SectionCard title="Smart Organization Tips" subtitle="Designed for long MBBS workflows" tone="accent">
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-center gap-2"><BookOpen size={14} /> Keep one notebook group per major branch.</li>
            <li className="flex items-center gap-2"><BookOpen size={14} /> Use subject color tags for memory reinforcement.</li>
            <li className="flex items-center gap-2"><BookOpen size={14} /> Enter Notes view to reorder topics and build revision flow.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
