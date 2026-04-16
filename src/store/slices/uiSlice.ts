'use client';

import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';

export function useUiSlice() {
  return useStore(useShallow((s) => ({
    activeView: s.activeView,
    sidebarOpen: s.sidebarOpen,
    notesListOpen: s.notesListOpen,
    editorFocusMode: s.editorFocusMode,
    layoutSidebarWidth: s.layoutSidebarWidth,
    layoutNotesWidth: s.layoutNotesWidth,
    commandPaletteOpen: s.commandPaletteOpen,
    setActiveView: s.setActiveView,
    setSidebarOpen: s.setSidebarOpen,
    setNotesListOpen: s.setNotesListOpen,
    setEditorFocusMode: s.setEditorFocusMode,
    setLayoutSidebarWidth: s.setLayoutSidebarWidth,
    setLayoutNotesWidth: s.setLayoutNotesWidth,
    setCommandPaletteOpen: s.setCommandPaletteOpen,
  })));
}
