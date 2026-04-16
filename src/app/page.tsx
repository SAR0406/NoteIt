'use client';
import React from 'react';
import { NOTES_WIDTH_LIMITS, SIDEBAR_WIDTH_LIMITS, useStore } from '@/store/useStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotesList } from '@/components/notes/NotesList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { FlashcardsView } from '@/components/flashcards/FlashcardsView';
import { FlashcardReview } from '@/components/flashcards/FlashcardReview';
import { GraphView } from '@/components/graph/GraphView';
import { AudioView } from '@/components/audio/AudioView';
import { TemplatesView } from '@/components/templates/TemplatesView';
import { SearchView } from '@/components/search/SearchView';
import { HomeView } from '@/components/HomeView';
import { DocumentsView } from '@/components/documents/DocumentsView';
import { SubjectsView } from '@/components/subjects/SubjectsView';
import { ProgressDashboardView } from '@/components/progress/ProgressDashboardView';
import { CollaborationView } from '@/components/collaboration/CollaborationView';
import { TopBar } from '@/components/layout/TopBar';
import { SyncPanel } from '@/components/sync/SyncPanel';
import { CommandPalette } from '@/components/search/CommandPalette';
import { Toaster } from 'react-hot-toast';

const getPanelStyles = (width: number, limits: { min: number; max: number }) => ({
  width,
  minWidth: limits.min,
  maxWidth: limits.max,
});

export default function AppPage() {
  const {
    activeView,
    sidebarOpen,
    notesListOpen,
    editorFocusMode,
    layoutSidebarWidth,
    layoutNotesWidth,
    setLayoutSidebarWidth,
    setLayoutNotesWidth,
    setCommandPaletteOpen,
    setSyncPanelOpen,
    setActiveView,
  } = useStore();
  const [dragging, setDragging] = React.useState<'sidebar' | 'notes' | null>(null);
  const showNotesList = (activeView === 'notes' || activeView === 'note-editor' || activeView === 'documents') && notesListOpen && !editorFocusMode;
  const showSidebar = sidebarOpen && !editorFocusMode;
  const getNotesPaneWidthFromClientX = React.useCallback(
    (clientX: number) => clientX - (showSidebar ? layoutSidebarWidth : 0),
    [layoutSidebarWidth, showSidebar]
  );

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setCommandPaletteOpen]);

  React.useEffect(() => {
    if (activeView === 'sync') {
      setSyncPanelOpen(true);
      setActiveView('home');
    }
  }, [activeView, setActiveView, setSyncPanelOpen]);

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (dragging === 'sidebar') setLayoutSidebarWidth(e.clientX);
      if (dragging === 'notes') setLayoutNotesWidth(getNotesPaneWidthFromClientX(e.clientX));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, getNotesPaneWidthFromClientX, setLayoutNotesWidth, setLayoutSidebarWidth]);

  return (
    <div className="h-screen overflow-hidden app-bg flex flex-col">
      <Toaster position="top-right" />
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <>
            <div style={getPanelStyles(layoutSidebarWidth, SIDEBAR_WIDTH_LIMITS)} className="h-full">
              <Sidebar />
            </div>
            <div className="w-1 cursor-col-resize bg-transparent hover:bg-indigo-200/60" onMouseDown={() => setDragging('sidebar')} />
          </>
        )}

        {showNotesList && (
          <>
            <div style={getPanelStyles(layoutNotesWidth, NOTES_WIDTH_LIMITS)} className="h-full">
              <NotesList />
            </div>
            <div className="w-1 cursor-col-resize bg-transparent hover:bg-indigo-200/60" onMouseDown={() => setDragging('notes')} />
          </>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeView === 'home' && <HomeView />}
          {activeView === 'subjects' && <SubjectsView />}
          {(activeView === 'notes' || activeView === 'note-editor') && <NoteEditor />}
          {activeView === 'flashcards' && <FlashcardsView />}
          {activeView === 'flashcard-review' && <FlashcardReview />}
          {activeView === 'graph' && <GraphView />}
          {activeView === 'audio' && <AudioView />}
          {activeView === 'templates' && <TemplatesView />}
          {activeView === 'search' && <SearchView />}
          {activeView === 'documents' && <DocumentsView />}
          {activeView === 'progress' && <ProgressDashboardView />}
          {activeView === 'collaboration' && <CollaborationView />}
        </div>
      </div>

      <SyncPanel />
      <CommandPalette />
    </div>
  );
}
