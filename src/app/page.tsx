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
import {
  Home, BookOpen, Brain, Mic, BarChart3, Files, PanelLeft, PanelRight,
} from 'lucide-react';

const getPanelStyles = (width: number, limits: { min: number; max: number }) => ({
  width,
  minWidth: limits.min,
  maxWidth: limits.max,
});

// ── Mobile bottom nav items ──────────────────────────────────────────────────
const MOBILE_NAV = [
  { view: 'home'       as const, icon: Home,    label: 'Home'    },
  { view: 'notes'      as const, icon: BookOpen, label: 'Notes'   },
  { view: 'flashcards' as const, icon: Brain,   label: 'Cards'   },
  { view: 'audio'      as const, icon: Mic,     label: 'Audio'   },
  { view: 'documents'  as const, icon: Files,   label: 'Docs'    },
];

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
    setSidebarOpen,
    setNotesListOpen,
    setActiveView,
  } = useStore();

  const [dragging, setDragging] = React.useState<'sidebar' | 'notes' | null>(null);
  // Mobile: track if we are on a narrow viewport
  const [isMobile, setIsMobile] = React.useState(false);
  const [mobileDrawer, setMobileDrawer] = React.useState<'sidebar' | 'notes' | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  // Desktop drag-resize
  React.useEffect(() => {
    if (!dragging || isMobile) return;
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
  }, [dragging, getNotesPaneWidthFromClientX, isMobile, setLayoutNotesWidth, setLayoutSidebarWidth]);

  // Close mobile drawer when view changes
  React.useEffect(() => {
    setMobileDrawer(null);
  }, [activeView]);

  // ── Mobile layout ──
  if (isMobile) {
    return (
      <div className="h-screen overflow-hidden app-bg flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Toaster position="top-right" />
        <TopBar isMobile onMenuPress={() => setMobileDrawer('sidebar')} onNotesPress={() => setMobileDrawer('notes')} />

        {/* Drawers */}
        {mobileDrawer && (
          <div className="drawer-overlay" onClick={() => setMobileDrawer(null)} />
        )}
        {mobileDrawer === 'sidebar' && (
          <div className="drawer" style={{ width: Math.min(300, window.innerWidth - 48) }}>
            <Sidebar />
          </div>
        )}
        {mobileDrawer === 'notes' && (activeView === 'notes' || activeView === 'note-editor' || activeView === 'documents') && (
          <div className="drawer" style={{ width: Math.min(300, window.innerWidth - 48) }}>
            <NotesList />
          </div>
        )}

        {/* Main content — push bottom for nav bar */}
        <div className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
          {activeView === 'home'             && <HomeView />}
          {activeView === 'subjects'         && <SubjectsView />}
          {(activeView === 'notes' || activeView === 'note-editor') && <NoteEditor />}
          {activeView === 'flashcards'       && <FlashcardsView />}
          {activeView === 'flashcard-review' && <FlashcardReview />}
          {activeView === 'graph'            && <GraphView />}
          {activeView === 'audio'            && <AudioView />}
          {activeView === 'templates'        && <TemplatesView />}
          {activeView === 'search'           && <SearchView />}
          {activeView === 'documents'        && <DocumentsView />}
          {activeView === 'progress'         && <ProgressDashboardView />}
          {activeView === 'collaboration'    && <CollaborationView />}
        </div>

        {/* Mobile bottom navigation */}
        <nav className="mobile-nav">
          {MOBILE_NAV.map(({ view, icon: Icon, label }) => {
            const active = activeView === view || (view === 'notes' && activeView === 'note-editor');
            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${
                  active
                    ? 'text-indigo-600'
                    : 'text-gray-400'
                }`}
              >
                <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 1.8} />
                <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-indigo-500 mt-0.5" />}
              </button>
            );
          })}
          {/* Progress & more */}
          <button
            onClick={() => setActiveView('progress')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${activeView === 'progress' ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <BarChart3 size={activeView === 'progress' ? 22 : 20} strokeWidth={activeView === 'progress' ? 2.5 : 1.8} />
            <span className={`text-[9px] font-semibold ${activeView === 'progress' ? 'text-indigo-600' : 'text-gray-400'}`}>Stats</span>
            {activeView === 'progress' && <div className="w-1 h-1 rounded-full bg-indigo-500 mt-0.5" />}
          </button>
        </nav>

        <SyncPanel />
        <CommandPalette />
      </div>
    );
  }

  // ── Desktop / Tablet layout ──
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
            <div
              className="w-1 cursor-col-resize bg-transparent hover:bg-indigo-200/60 transition-colors"
              onMouseDown={() => setDragging('sidebar')}
            />
          </>
        )}

        {showNotesList && (
          <>
            <div style={getPanelStyles(layoutNotesWidth, NOTES_WIDTH_LIMITS)} className="h-full">
              <NotesList />
            </div>
            <div
              className="w-1 cursor-col-resize bg-transparent hover:bg-indigo-200/60 transition-colors"
              onMouseDown={() => setDragging('notes')}
            />
          </>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeView === 'home'             && <HomeView />}
          {activeView === 'subjects'         && <SubjectsView />}
          {(activeView === 'notes' || activeView === 'note-editor') && <NoteEditor />}
          {activeView === 'flashcards'       && <FlashcardsView />}
          {activeView === 'flashcard-review' && <FlashcardReview />}
          {activeView === 'graph'            && <GraphView />}
          {activeView === 'audio'            && <AudioView />}
          {activeView === 'templates'        && <TemplatesView />}
          {activeView === 'search'           && <SearchView />}
          {activeView === 'documents'        && <DocumentsView />}
          {activeView === 'progress'         && <ProgressDashboardView />}
          {activeView === 'collaboration'    && <CollaborationView />}
        </div>
      </div>

      <SyncPanel />
      <CommandPalette />
    </div>
  );
}

