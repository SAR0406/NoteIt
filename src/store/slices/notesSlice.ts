'use client';

import { useStore } from '@/store/useStore';

export function useNotesSlice() {
  return useStore((s) => ({
    notes: s.notes,
    selectedNoteId: s.selectedNoteId,
    searchQuery: s.searchQuery,
    activeTag: s.activeTag,
    selectedSystemSection: s.selectedSystemSection,
    notesSort: s.notesSort,
    notesFilter: s.notesFilter,
    setSearchQuery: s.setSearchQuery,
    setActiveTag: s.setActiveTag,
    setSelectedSystemSection: s.setSelectedSystemSection,
    setNotesSort: s.setNotesSort,
    setNotesFilter: s.setNotesFilter,
    selectNote: s.selectNote,
    addNote: s.addNote,
    deleteNote: s.deleteNote,
    restoreNote: s.restoreNote,
    toggleFavorite: s.toggleFavorite,
    togglePin: s.togglePin,
  }));
}
