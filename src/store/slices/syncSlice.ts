'use client';

import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';

export function useSyncSlice() {
  return useStore(useShallow((s) => ({
    syncStatus: s.syncStatus,
    syncPanelOpen: s.syncPanelOpen,
    setSyncStatus: s.setSyncStatus,
    setSyncPanelOpen: s.setSyncPanelOpen,
  })));
}
