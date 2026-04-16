'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useSyncSlice } from '@/store/slices/syncSlice';
import { SyncView } from '@/components/sync/SyncView';

export function SyncPanel() {
  const { syncPanelOpen, setSyncPanelOpen } = useSyncSlice();

  if (!syncPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] bg-black/30" onClick={() => setSyncPanelOpen(false)}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white border-l border-[var(--border)] shadow-2xl flex flex-col"
      >
        <div className="h-14 border-b border-[var(--border)] px-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sync details</h2>
          <button onClick={() => setSyncPanelOpen(false)} className="p-1.5 rounded hover:bg-[var(--surface-muted)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <SyncView mode="panel" />
        </div>
      </aside>
    </div>
  );
}
