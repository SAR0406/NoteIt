'use client';

import React from 'react';
import { SectionCard, Chip, PillButton } from '@/components/ui/primitives';
import { Users, PenTool, Share2, Sparkles } from 'lucide-react';

const participants = ['Sarthak', 'Rahul', 'Aditi'];

export function CollaborationView() {
  return (
    <div className="flex-1 overflow-y-auto app-bg p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="surface-card-accent rounded-3xl px-6 py-5">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Collaboration Mode</h1>
          <p className="text-sm text-[var(--text-secondary)]">Phase-2 room surface for study groups, shared notes, and live revision sessions.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Room: Anatomy Batch 2026" subtitle="Live participant presence and synced artifacts">
            <div className="mb-3 flex flex-wrap gap-2">
              {participants.map((name) => (
                <Chip key={name} active>{name}</Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <PillButton className="pill-button-active"><Users size={14} /> Invite</PillButton>
              <PillButton><Share2 size={14} /> Share flashcard deck</PillButton>
              <PillButton><PenTool size={14} /> Start shared canvas</PillButton>
            </div>
          </SectionCard>

          <SectionCard title="Shared Canvas" subtitle="Real-time drawing + note pinning scaffold" tone="accent">
            <div className="grid h-56 place-items-center rounded-xl border border-dashed border-[var(--border-strong)] bg-white text-sm text-[var(--text-muted)]">
              <div className="text-center">
                <PenTool size={18} className="mx-auto mb-2" />
                Collaborative canvas runtime hooks can attach here.
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="AI Group Assistant" subtitle="Queued / generating / retry / fallback status pattern" tone="success">
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <p className="flex items-center gap-2"><Sparkles size={14} className="text-[var(--accent-600)]" /> Generate group quiz from selected highlights</p>
            <p>• State model ready: queued → generating → partial success → retry/fallback</p>
            <p>• Shared result can be pushed to notes and flashcards in one action</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
