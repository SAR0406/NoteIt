export type NoteType = 'text' | 'pdf' | 'audio' | 'drawing';

export interface NoteAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  annotationLayerDataUrl: string | null;
  indexedText: string;
  createdAt: string;
}

export interface DrawingLayer {
  id: string;
  name: string;
  dataUrl: string;
  indexedText: string;
  createdAt: string;
}

export interface Notebook {
  id: string;
  name: string;
  color: string;
  icon: string;
  subjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  notebookId: string;
  name: string;
  topicIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  noteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  topicId: string | null;
  subjectId: string | null;
  notebookId: string | null;
  title: string;
  content: string; // HTML from Tiptap
  type: NoteType;
  tags: string[];
  linkedNoteIds: string[];
  audioUrl: string | null;
  audioTimestamps: AudioTimestamp[];
  templateType: TemplateType | null;
  attachments: NoteAttachment[];
  drawings: DrawingLayer[];
  handwritingIndex: string;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AudioTimestamp {
  time: number; // seconds
  text: string;
}

export type TemplateType = 'soap' | 'case-sheet' | 'anatomy' | 'pharmacology' | 'blank';

export interface Flashcard {
  id: string;
  noteId: string | null;
  front: string;
  back: string;
  tags: string[];
  dueDate: string;
  interval: number; // days
  easeFactor: number;
  repetitions: number;
  createdAt: string;
  updatedAt: string;
}

export type FlashcardDifficulty = 'again' | 'hard' | 'good' | 'easy';

export interface AppState {
  notebooks: Notebook[];
  subjects: Subject[];
  topics: Topic[];
  notes: Note[];
  flashcards: Flashcard[];
  activeView: AppView;
  selectedNotebookId: string | null;
  selectedSubjectId: string | null;
  selectedTopicId: string | null;
  selectedNoteId: string | null;
  sidebarOpen: boolean;
  searchQuery: string;
  activeTag: string | null;
}

export type AppView =
  | 'home'
  | 'notes'
  | 'note-editor'
  | 'flashcards'
  | 'flashcard-review'
  | 'graph'
  | 'templates'
  | 'audio'
  | 'search'
  | 'documents'
  | 'sync';
