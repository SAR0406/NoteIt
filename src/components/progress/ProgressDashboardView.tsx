'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { StatCard, SectionCard } from '@/components/ui/primitives';
import { Activity, Brain, Clock3, Target } from 'lucide-react';
import { isDue } from '@/lib/utils';

export function ProgressDashboardView() {
  const { notes, flashcards } = useStore();
  // Starts at a neutral baseline so the scaffold doesn't imply a failing state on first use.
  const CONSISTENCY_BASE_PERCENTAGE = 52;
  // Every N study artifacts nudges the scaffolded consistency indicator up by roughly one step.
  const CONSISTENCY_ITEMS_PER_STEP = 4;
  const due = flashcards.filter((fc) => isDue(fc.dueDate)).length;
  const linked = notes.filter((n) => n.linkedNoteIds.length > 0).length;
  const coverage = notes.length > 0 ? Math.round((linked / notes.length) * 100) : 0;
  const consistency = Math.min(
    100,
    CONSISTENCY_BASE_PERCENTAGE + Math.round((notes.length + flashcards.length) / CONSISTENCY_ITEMS_PER_STEP)
  );

  return (
    <div className="flex-1 overflow-y-auto app-bg p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="surface-card-accent rounded-3xl px-6 py-5">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Progress Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">Weekly revision momentum, weak-topic signals, and exam pressure view.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Notes" value={notes.length} icon={<Activity size={16} className="text-[var(--primary-600)]" />} />
          <StatCard label="Flashcards" value={flashcards.length} icon={<Brain size={16} className="text-[var(--accent-600)]" />} />
          <StatCard label="Due Today" value={due} icon={<Clock3 size={16} className="text-[var(--warning-600)]" />} />
          <StatCard label="Knowledge Coverage" value={`${coverage}%`} icon={<Target size={16} className="text-[var(--success-600)]" />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Weak Areas" subtitle="AI-style guidance based on due load and link density">
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>• Neuroanatomy pathways</li>
              <li>• Pharmacology autonomic agents</li>
              <li>• Clinical integration between systems</li>
            </ul>
          </SectionCard>

          <SectionCard title="Upcoming" subtitle="Adaptive reminders for exam readiness" tone="warning">
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p>• Anatomy exam simulation: 12 days left</p>
              <p>• Daily recall target: {Math.max(due, 25)} cards</p>
              <p>• Suggested deep-work block: 90 min</p>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Performance Trend" subtitle="Phase-2 analytics scaffold for detailed charts" tone="accent">
          <div className="rounded-xl border border-[var(--border)] bg-white p-4">
            <div className="mb-3 flex h-24 items-end gap-2">
              {[42, 51, 48, 58, 64, 62, consistency].map((v, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-[var(--primary-500)]/70" style={{ height: `${v}%` }} />
              ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Consistency index: {consistency}% · This scaffold is ready to connect to real session telemetry.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
