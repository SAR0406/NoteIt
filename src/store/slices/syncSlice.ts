'use client';

import { useStore } from '@/store/useStore';

export function useSyncSlice() {
  return useStore((s) => ({
    syncStatus: s.syncStatus,
    syncPanelOpen: s.syncPanelOpen,
    setSyncStatus: s.setSyncStatus,
    setSyncPanelOpen: s.setSyncPanelOpen,
  }));
}
