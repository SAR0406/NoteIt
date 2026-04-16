'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AppState,
  AppView,
  Notebook,
  Subject,
  Topic,
  Note,
  Flashcard,
  FlashcardDifficulty,
} from '@/types';
import { generateId, sm2 } from '@/lib/utils';
import { TEMPLATES } from '@/lib/templates';
import { sanitizeModelText } from '@/lib/ai/text';

interface Actions {
  // Navigation
  setActiveView: (view: AppView) => void;
  setSidebarOpen: (open: boolean) => void;
  setNotesListOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setActiveTag: (tag: string | null) => void;
  setSelectedSystemSection: (section: AppState['selectedSystemSection']) => void;
  setNotesSort: (sort: AppState['notesSort']) => void;
  setNotesFilter: (filter: AppState['notesFilter']) => void;
  setLayoutSidebarWidth: (width: number) => void;
  setLayoutNotesWidth: (width: number) => void;
  setSyncStatus: (status: AppState['syncStatus']) => void;
  setSyncPanelOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setEditorFocusMode: (enabled: boolean) => void;
  selectNotebook: (id: string | null) => void;
  selectSubject: (id: string | null) => void;
  selectTopic: (id: string | null) => void;
  selectNote: (id: string | null) => void;

  // Notebooks
  addNotebook: (name: string, color: string, academicYear?: 1 | 2 | 3 | 4) => Notebook;
  updateNotebook: (id: string, patch: Partial<Notebook>) => void;
  deleteNotebook: (id: string) => void;

  // Subjects
  addSubject: (notebookId: string, name: string) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  moveSubject: (id: string, targetNotebookId: string) => void;
  deleteSubject: (id: string) => void;

  // Topics
  addTopic: (subjectId: string, name: string) => Topic;
  updateTopic: (id: string, patch: Partial<Topic>) => void;
  moveTopic: (id: string, targetSubjectId: string) => void;
  deleteTopic: (id: string) => void;

  // Notes
  addNote: (opts: {
    topicId?: string | null;
    subjectId?: string | null;
    notebookId?: string | null;
    title?: string;
    templateType?: Note['templateType'];
  }) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;
  addTagToNote: (noteId: string, tag: string) => void;
  removeTagFromNote: (noteId: string, tag: string) => void;
  linkNotes: (noteId: string, targetId: string) => void;
  unlinkNote: (noteId: string, targetId: string) => void;
  addAttachmentToNote: (noteId: string, attachment: {
    name: string;
    mimeType: string;
    dataUrl: string;
    indexedText?: string;
  }) => void;
  removeAttachmentFromNote: (noteId: string, attachmentId: string) => void;
  updateAttachmentAnnotation: (noteId: string, attachmentId: string, annotationLayerDataUrl: string | null) => void;
  addDrawingToNote: (noteId: string, drawing: { name: string; dataUrl: string; indexedText?: string }) => void;
  removeDrawingFromNote: (noteId: string, drawingId: string) => void;
  setHandwritingIndex: (noteId: string, handwritingIndex: string) => void;

  // Flashcards
  addFlashcard: (front: string, back: string, noteId?: string | null, tags?: string[]) => Flashcard;
  updateFlashcard: (id: string, patch: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => void;
  reviewFlashcard: (id: string, difficulty: FlashcardDifficulty) => void;
  generateFlashcardsFromNote: (noteId: string) => void;

  // AI / summarize
  summarizeNote: (noteId: string) => void;
  generateQuizFromNote: (noteId: string) => void;
}

const SAMPLE_NOTEBOOK_ID = 'nb-anatomy';
const SAMPLE_SUBJECT_ID = 'sub-upper-limb';
const SAMPLE_TOPIC_ID = 'top-brachial-plexus';
const SAMPLE_NOTE_ID = 'note-brachial-intro';

const now = new Date().toISOString();

const initialState: AppState = {
  notebooks: [
    {
      id: SAMPLE_NOTEBOOK_ID,
      name: 'Anatomy',
      academicYear: 1,
      color: '#3b82f6',
      icon: '🫀',
      subjectIds: [SAMPLE_SUBJECT_ID],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'nb-pharma',
      name: 'Pharmacology',
      academicYear: 2,
      color: '#8b5cf6',
      icon: '💊',
      subjectIds: ['sub-autonomic'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  subjects: [
    {
      id: SAMPLE_SUBJECT_ID,
      notebookId: SAMPLE_NOTEBOOK_ID,
      name: 'Upper Limb',
      topicIds: [SAMPLE_TOPIC_ID],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sub-autonomic',
      notebookId: 'nb-pharma',
      name: 'Autonomic Pharmacology',
      topicIds: ['top-adrenergic'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  topics: [
    {
      id: SAMPLE_TOPIC_ID,
      subjectId: SAMPLE_SUBJECT_ID,
      name: 'Brachial Plexus',
      noteIds: [SAMPLE_NOTE_ID],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'top-adrenergic',
      subjectId: 'sub-autonomic',
      name: 'Adrenergic Drugs',
      noteIds: ['note-adrenaline'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  notes: [
    {
      id: SAMPLE_NOTE_ID,
      topicId: SAMPLE_TOPIC_ID,
      subjectId: SAMPLE_SUBJECT_ID,
      notebookId: SAMPLE_NOTEBOOK_ID,
      title: 'Brachial Plexus Overview',
      content: TEMPLATES.anatomy.content,
      type: 'text',
      tags: ['#Anatomy', '#Upper-Limb'],
      linkedNoteIds: ['note-adrenaline'],
      audioUrl: null,
      audioTimestamps: [],
      templateType: 'anatomy',
      attachments: [],
      drawings: [],
      canvasStickers: [],
      handwritingIndex: '',
      isFavorite: true,
      isPinned: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'note-adrenaline',
      topicId: 'top-adrenergic',
      subjectId: 'sub-autonomic',
      notebookId: 'nb-pharma',
      title: 'Adrenaline (Epinephrine)',
      content: TEMPLATES.pharmacology.content,
      type: 'text',
      tags: ['#Pharmacology', '#Autonomic'],
      linkedNoteIds: [SAMPLE_NOTE_ID],
      audioUrl: null,
      audioTimestamps: [],
      templateType: 'pharmacology',
      attachments: [],
      drawings: [],
      canvasStickers: [],
      handwritingIndex: '',
      isFavorite: false,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
  flashcards: [
    {
      id: 'fc-1',
      noteId: SAMPLE_NOTE_ID,
      front: 'What are the roots of the Brachial Plexus?',
      back: 'C5, C6, C7, C8, T1',
      tags: ['#Anatomy'],
      dueDate: now,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'fc-2',
      noteId: SAMPLE_NOTE_ID,
      front: 'Which nerve supplies the deltoid muscle?',
      back: 'Axillary nerve (C5, C6)',
      tags: ['#Anatomy'],
      dueDate: now,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'fc-3',
      noteId: 'note-adrenaline',
      front: 'What is the mechanism of action of Adrenaline?',
      back: 'Non-selective adrenergic agonist (α1, α2, β1, β2). Increases HR, BP, bronchodilation, glycogenolysis.',
      tags: ['#Pharmacology'],
      dueDate: now,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      createdAt: now,
      updatedAt: now,
    },
  ],
  activeView: 'home',
  selectedNotebookId: null,
  selectedSubjectId: null,
  selectedTopicId: null,
  selectedNoteId: null,
  sidebarOpen: true,
  notesListOpen: true,
  searchQuery: '',
  activeTag: null,
  selectedSystemSection: null,
  notesSort: 'recent',
  notesFilter: 'all',
  layoutSidebarWidth: 292,
  layoutNotesWidth: 320,
  syncStatus: 'synced',
  syncPanelOpen: false,
  commandPaletteOpen: false,
  editorFocusMode: false,
};

export const useStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveView: (view) => set({ activeView: view }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setNotesListOpen: (open) => set({ notesListOpen: open }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setActiveTag: (tag) => set({ activeTag: tag }),
      setSelectedSystemSection: (selectedSystemSection) => set({ selectedSystemSection }),
      setNotesSort: (notesSort) => set({ notesSort }),
      setNotesFilter: (notesFilter) => set({ notesFilter }),
      setLayoutSidebarWidth: (width) => set({ layoutSidebarWidth: Math.min(420, Math.max(220, width)) }),
      setLayoutNotesWidth: (width) => set({ layoutNotesWidth: Math.min(460, Math.max(260, width)) }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      setSyncPanelOpen: (syncPanelOpen) => set({ syncPanelOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setEditorFocusMode: (editorFocusMode) => set({ editorFocusMode }),
      selectNotebook: (id) => set({ selectedNotebookId: id, selectedSubjectId: null, selectedTopicId: null }),
      selectSubject: (id) => set({ selectedSubjectId: id, selectedTopicId: null }),
      selectTopic: (id) => set({ selectedTopicId: id }),
      selectNote: (id) => set({ selectedNoteId: id }),

      // Notebooks
      addNotebook: (name, color, academicYear = 1) => {
        const nb: Notebook = {
          id: generateId(),
          name,
          academicYear,
          color,
          icon: '📓',
          subjectIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ notebooks: [...s.notebooks, nb] }));
        return nb;
      },
      updateNotebook: (id, patch) =>
        set((s) => ({
          notebooks: s.notebooks.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
          ),
        })),
      deleteNotebook: (id) =>
        set((s) => {
          const nb = s.notebooks.find((n) => n.id === id);
          if (!nb) return s;
          const subIds = nb.subjectIds;
          const topIds = s.subjects.filter((sub) => subIds.includes(sub.id)).flatMap((sub) => sub.topicIds);
          const noteIds = s.topics.filter((t) => topIds.includes(t.id)).flatMap((t) => t.noteIds);
          return {
            notebooks: s.notebooks.filter((n) => n.id !== id),
            subjects: s.subjects.filter((sub) => !subIds.includes(sub.id)),
            topics: s.topics.filter((t) => !topIds.includes(t.id)),
            notes: s.notes.filter((n) => !noteIds.includes(n.id)),
          };
        }),

      // Subjects
      addSubject: (notebookId, name) => {
        const sub: Subject = {
          id: generateId(),
          notebookId,
          name,
          topicIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          subjects: [...s.subjects, sub],
          notebooks: s.notebooks.map((nb) =>
            nb.id === notebookId
              ? { ...nb, subjectIds: [...nb.subjectIds, sub.id], updatedAt: new Date().toISOString() }
              : nb
          ),
        }));
        return sub;
      },
      updateSubject: (id, patch) =>
        set((s) => ({
          subjects: s.subjects.map((sub) =>
            sub.id === id ? { ...sub, ...patch, updatedAt: new Date().toISOString() } : sub
          ),
        })),
      moveSubject: (id, targetNotebookId) =>
        set((s) => {
          const subject = s.subjects.find((sub) => sub.id === id);
          if (!subject || subject.notebookId === targetNotebookId) return s;
          const targetNotebook = s.notebooks.find((nb) => nb.id === targetNotebookId);
          if (!targetNotebook) return s;
          return {
            subjects: s.subjects.map((sub) =>
              sub.id === id ? { ...sub, notebookId: targetNotebookId, updatedAt: new Date().toISOString() } : sub
            ),
            notebooks: s.notebooks.map((nb) => {
              if (nb.id === subject.notebookId) {
                return {
                  ...nb,
                  subjectIds: nb.subjectIds.filter((subId) => subId !== id),
                  updatedAt: new Date().toISOString(),
                };
              }
              if (nb.id === targetNotebookId && !nb.subjectIds.includes(id)) {
                return {
                  ...nb,
                  subjectIds: [...nb.subjectIds, id],
                  updatedAt: new Date().toISOString(),
                };
              }
              return nb;
            }),
            notes: s.notes.map((note) =>
              note.subjectId === id ? { ...note, notebookId: targetNotebookId, updatedAt: new Date().toISOString() } : note
            ),
          };
        }),
      deleteSubject: (id) =>
        set((s) => {
          const sub = s.subjects.find((x) => x.id === id);
          if (!sub) return s;
          const topIds = sub.topicIds;
          const noteIds = s.topics.filter((t) => topIds.includes(t.id)).flatMap((t) => t.noteIds);
          return {
            subjects: s.subjects.filter((x) => x.id !== id),
            notebooks: s.notebooks.map((nb) =>
              nb.id === sub.notebookId
                ? { ...nb, subjectIds: nb.subjectIds.filter((x) => x !== id) }
                : nb
            ),
            topics: s.topics.filter((t) => !topIds.includes(t.id)),
            notes: s.notes.filter((n) => !noteIds.includes(n.id)),
          };
        }),

      // Topics
      addTopic: (subjectId, name) => {
        const topic: Topic = {
          id: generateId(),
          subjectId,
          name,
          noteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          topics: [...s.topics, topic],
          subjects: s.subjects.map((sub) =>
            sub.id === subjectId
              ? { ...sub, topicIds: [...sub.topicIds, topic.id], updatedAt: new Date().toISOString() }
              : sub
          ),
        }));
        return topic;
      },
      updateTopic: (id, patch) =>
        set((s) => ({
          topics: s.topics.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
          ),
        })),
      moveTopic: (id, targetSubjectId) =>
        set((s) => {
          const topic = s.topics.find((t) => t.id === id);
          if (!topic || topic.subjectId === targetSubjectId) return s;
          const targetSubject = s.subjects.find((sub) => sub.id === targetSubjectId);
          if (!targetSubject) return s;
          return {
            topics: s.topics.map((t) =>
              t.id === id ? { ...t, subjectId: targetSubjectId, updatedAt: new Date().toISOString() } : t
            ),
            subjects: s.subjects.map((sub) => {
              if (sub.id === topic.subjectId) {
                return {
                  ...sub,
                  topicIds: sub.topicIds.filter((topicId) => topicId !== id),
                  updatedAt: new Date().toISOString(),
                };
              }
              if (sub.id === targetSubjectId && !sub.topicIds.includes(id)) {
                return {
                  ...sub,
                  topicIds: [...sub.topicIds, id],
                  updatedAt: new Date().toISOString(),
                };
              }
              return sub;
            }),
            notes: s.notes.map((note) =>
              note.topicId === id
                ? {
                    ...note,
                    subjectId: targetSubjectId,
                    notebookId: targetSubject.notebookId,
                    updatedAt: new Date().toISOString(),
                  }
                : note
            ),
          };
        }),
      deleteTopic: (id) =>
        set((s) => {
          const topic = s.topics.find((t) => t.id === id);
          if (!topic) return s;
          const noteIds = topic.noteIds;
          return {
            topics: s.topics.filter((t) => t.id !== id),
            subjects: s.subjects.map((sub) =>
              sub.id === topic.subjectId
                ? { ...sub, topicIds: sub.topicIds.filter((x) => x !== id) }
                : sub
            ),
            notes: s.notes.filter((n) => !noteIds.includes(n.id)),
          };
        }),

      // Notes
      addNote: ({ topicId = null, subjectId = null, notebookId = null, title = 'Untitled Note', templateType = 'blank' }) => {
        const note: Note = {
          id: generateId(),
          topicId,
          subjectId,
          notebookId,
          title,
          content: TEMPLATES[templateType ?? 'blank']?.content ?? '',
          type: 'text',
          tags: [],
          linkedNoteIds: [],
          audioUrl: null,
          audioTimestamps: [],
          templateType: templateType ?? null,
          attachments: [],
          drawings: [],
          canvasStickers: [],
          handwritingIndex: '',
          isFavorite: false,
          isPinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => {
          const updatedTopics = topicId
            ? s.topics.map((t) =>
                t.id === topicId ? { ...t, noteIds: [...t.noteIds, note.id] } : t
              )
            : s.topics;
          return { notes: [...s.notes, note], topics: updatedTopics };
        });
        return note;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
          ),
        })),
      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, isTrashed: true, updatedAt: new Date().toISOString() }
              : { ...n, linkedNoteIds: n.linkedNoteIds.filter((lid) => lid !== id) }
          ),
        })),
      restoreNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, isTrashed: false, updatedAt: new Date().toISOString() } : n
          ),
        })),
      toggleFavorite: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n)),
        })),
      togglePin: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)),
        })),
      addTagToNote: (noteId, tag) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId && !n.tags.includes(tag) ? { ...n, tags: [...n.tags, tag] } : n
          ),
        })),
      removeTagFromNote: (noteId, tag) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, tags: n.tags.filter((t) => t !== tag) } : n
          ),
        })),
      linkNotes: (noteId, targetId) =>
        set((s) => ({
          notes: s.notes.map((n) => {
            if (n.id === noteId && !n.linkedNoteIds.includes(targetId))
              return { ...n, linkedNoteIds: [...n.linkedNoteIds, targetId] };
            if (n.id === targetId && !n.linkedNoteIds.includes(noteId))
              return { ...n, linkedNoteIds: [...n.linkedNoteIds, noteId] };
            return n;
          }),
        })),
      unlinkNote: (noteId, targetId) =>
        set((s) => ({
          notes: s.notes.map((n) => {
            if (n.id === noteId) return { ...n, linkedNoteIds: n.linkedNoteIds.filter((x) => x !== targetId) };
            if (n.id === targetId) return { ...n, linkedNoteIds: n.linkedNoteIds.filter((x) => x !== noteId) };
            return n;
          }),
        })),
      addAttachmentToNote: (noteId, attachment) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  attachments: [
                    ...(n.attachments ?? []),
                    {
                      id: generateId(),
                      name: attachment.name,
                      mimeType: attachment.mimeType,
                      dataUrl: attachment.dataUrl,
                      annotationLayerDataUrl: null,
                      indexedText: attachment.indexedText ?? '',
                      createdAt: new Date().toISOString(),
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : n
          ),
        })),
      removeAttachmentFromNote: (noteId, attachmentId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  attachments: (n.attachments ?? []).filter((a) => a.id !== attachmentId),
                  updatedAt: new Date().toISOString(),
                }
              : n
          ),
        })),
      updateAttachmentAnnotation: (noteId, attachmentId, annotationLayerDataUrl) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  attachments: (n.attachments ?? []).map((a) =>
                    a.id === attachmentId ? { ...a, annotationLayerDataUrl } : a
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : n
          ),
        })),
      addDrawingToNote: (noteId, drawing) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  drawings: [
                    ...(n.drawings ?? []),
                    {
                      id: generateId(),
                      name: drawing.name,
                      dataUrl: drawing.dataUrl,
                      indexedText: drawing.indexedText ?? '',
                      createdAt: new Date().toISOString(),
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : n
          ),
        })),
      removeDrawingFromNote: (noteId, drawingId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  drawings: (n.drawings ?? []).filter((d) => d.id !== drawingId),
                  updatedAt: new Date().toISOString(),
                }
              : n
          ),
        })),
      setHandwritingIndex: (noteId, handwritingIndex) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, handwritingIndex, updatedAt: new Date().toISOString() } : n
          ),
        })),

      // Flashcards
      addFlashcard: (front, back, noteId = null, tags = []) => {
        const fc: Flashcard = {
          id: generateId(),
          noteId,
          front,
          back,
          tags,
          dueDate: new Date().toISOString(),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ flashcards: [...s.flashcards, fc] }));
        return fc;
      },
      updateFlashcard: (id, patch) =>
        set((s) => ({
          flashcards: s.flashcards.map((fc) =>
            fc.id === id ? { ...fc, ...patch, updatedAt: new Date().toISOString() } : fc
          ),
        })),
      deleteFlashcard: (id) =>
        set((s) => ({ flashcards: s.flashcards.filter((fc) => fc.id !== id) })),
      reviewFlashcard: (id, difficulty) => {
        const fc = get().flashcards.find((f) => f.id === id);
        if (!fc) return;
        const result = sm2(difficulty, fc.repetitions, fc.interval, fc.easeFactor);
        set((s) => ({
          flashcards: s.flashcards.map((f) =>
            f.id === id ? { ...f, ...result, updatedAt: new Date().toISOString() } : f
          ),
        }));
      },
      generateFlashcardsFromNote: (noteId) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (!note) return;

        // Parse headings and create simple flashcards (AI simulation)
        const headings = (() => {
          if (typeof window === 'undefined') return [] as string[];
          const doc = new window.DOMParser().parseFromString(note.content, 'text/html');
          return Array.from(doc.querySelectorAll('h2, h3'))
            .map((node) => sanitizeModelText(node.textContent ?? ''))
            .filter(Boolean);
        })();

        headings.slice(0, 5).forEach((text) => {
          if (text && text.length > 3) {
            get().addFlashcard(
              `What do you know about: ${text}?`,
              `Refer to your notes on "${note.title}" — ${text} section.`,
              noteId,
              note.tags
            );
          }
        });
      },
      summarizeNote: (noteId) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (!note) return;
        const textContent = note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const sentences = textContent.split('.').filter((s) => s.trim().length > 20).slice(0, 5);
        // Escape HTML entities to prevent XSS
        const escape = (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const summary = `<h3>📝 AI Summary</h3><ul>${sentences.map((s) => `<li>${escape(s.trim())}.</li>`).join('')}</ul>`;
        get().updateNote(noteId, { content: note.content + '<hr>' + summary });
      },
      generateQuizFromNote: (noteId) => {
        get().generateFlashcardsFromNote(noteId);
      },
    }),
    {
      name: 'noteit-storage',
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Partial<AppState> | undefined;
        if (!state || !Array.isArray(state.notes)) return persisted as AppState;
        return {
          ...state,
            notes: state.notes.map((n) => ({
              ...n,
              attachments: n.attachments ?? [],
              drawings: n.drawings ?? [],
              handwritingIndex: n.handwritingIndex ?? '',
              isTrashed: n.isTrashed ?? false,
            })),
          };
        },
    }
  )
);
