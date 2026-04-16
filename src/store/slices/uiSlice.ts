'use client';

import { useStore } from '@/store/useStore';

export function useUiSlice() {
  return useStore((s) => ({
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
  }));
}
