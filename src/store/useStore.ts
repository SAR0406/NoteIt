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

interface Actions {
  // Navigation
  setActiveView: (view: AppView) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setActiveTag: (tag: string | null) => void;
  selectNotebook: (id: string | null) => void;
  selectSubject: (id: string | null) => void;
  selectTopic: (id: string | null) => void;
  selectNote: (id: string | null) => void;

  // Notebooks
  addNotebook: (name: string, color: string) => Notebook;
  updateNotebook: (id: string, patch: Partial<Notebook>) => void;
  deleteNotebook: (id: string) => void;

  // Subjects
  addSubject: (notebookId: string, name: string) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Topics
  addTopic: (subjectId: string, name: string) => Topic;
  updateTopic: (id: string, patch: Partial<Topic>) => void;
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
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;
  addTagToNote: (noteId: string, tag: string) => void;
  removeTagFromNote: (noteId: string, tag: string) => void;
  linkNotes: (noteId: string, targetId: string) => void;
  unlinkNote: (noteId: string, targetId: string) => void;

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
      color: '#3b82f6',
      icon: '🫀',
      subjectIds: [SAMPLE_SUBJECT_ID],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'nb-pharma',
      name: 'Pharmacology',
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
  searchQuery: '',
  activeTag: null,
};

export const useStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveView: (view) => set({ activeView: view }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setActiveTag: (tag) => set({ activeTag: tag }),
      selectNotebook: (id) => set({ selectedNotebookId: id, selectedSubjectId: null, selectedTopicId: null }),
      selectSubject: (id) => set({ selectedSubjectId: id, selectedTopicId: null }),
      selectTopic: (id) => set({ selectedTopicId: id }),
      selectNote: (id) => set({ selectedNoteId: id }),

      // Notebooks
      addNotebook: (name, color) => {
        const nb: Notebook = {
          id: generateId(),
          name,
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
          notes: s.notes
            .filter((n) => n.id !== id)
            .map((n) => ({
              ...n,
              linkedNoteIds: n.linkedNoteIds.filter((lid) => lid !== id),
            })),
          topics: s.topics.map((t) => ({ ...t, noteIds: t.noteIds.filter((nid) => nid !== id) })),
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
        const headings = note.content.match(/<h[23][^>]*>([^<]+)<\/h[23]>/g) || [];
        headings.slice(0, 5).forEach((h) => {
          const text = h.replace(/<[^>]+>/g, '').trim();
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
      version: 1,
    }
  )
);
