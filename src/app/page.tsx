'use client';
import { useStore } from '@/store/useStore';
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
import { Toaster } from 'react-hot-toast';

export default function AppPage() {
  const { activeView } = useStore();

  const showNotesList = activeView === 'notes' || activeView === 'note-editor';

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Toaster position="top-right" />
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Notes list panel (only for notes views) */}
        {showNotesList && <NotesList />}

        {/* Primary content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeView === 'home' && <HomeView />}
          {(activeView === 'notes' || activeView === 'note-editor') && <NoteEditor />}
          {activeView === 'flashcards' && <FlashcardsView />}
          {activeView === 'flashcard-review' && <FlashcardReview />}
          {activeView === 'graph' && <GraphView />}
          {activeView === 'audio' && <AudioView />}
          {activeView === 'templates' && <TemplatesView />}
          {activeView === 'search' && <SearchView />}
        </div>
      </div>
    </div>
  );
}
