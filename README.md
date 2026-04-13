# NoteIt — MBBS All-in-One Note-Taking App

A comprehensive note-taking web application designed specifically for MBBS/medical students. Built with Next.js 14, TypeScript, and TailwindCSS.

## 🚀 Features

| Feature | Description |
|---------|-------------|
| ✍️ **Rich Text Editor** | Bold, italic, headings, lists, code, blockquotes via Tiptap |
| 📚 **Smart Organization** | Notebooks → Subjects → Topics hierarchy |
| 🏷️ **Medical Tags** | Tag notes with #Anatomy, #Pharma, #Pathology, etc. |
| 🧠 **Flashcards + SM-2** | Spaced repetition with Again/Hard/Good/Easy review |
| 🔗 **Note Linking** | Obsidian-style bi-directional note links |
| 🕸️ **Graph View** | Visual canvas showing note connections |
| 🎧 **Audio Recording** | Record lectures with timestamped annotations |
| 🎨 **Medical Templates** | SOAP Note, Case Sheet, Anatomy, Pharmacology |
| 🤖 **AI Tools** | Auto-summarize notes, generate flashcards from headings |
| 🔍 **Full-text Search** | Search by title, content, or tags |
| 💾 **Auto-save** | All data persisted to localStorage, no login needed |
| 📌 **Pin & Favorite** | Quickly access important notes |

## 🏗️ Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🧰 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Editor**: Tiptap (rich text)
- **State**: Zustand + localStorage persistence
- **Icons**: Lucide React
- **Flashcard Algorithm**: SM-2 (SuperMemo 2)

## 📁 Project Structure

```
src/
  app/           # Next.js app router
  components/
    layout/      # Sidebar
    notes/       # NotesList + NoteEditor
    flashcards/  # FlashcardsView + FlashcardReview
    graph/       # GraphView (canvas)
    audio/       # AudioView (MediaRecorder API)
    templates/   # TemplatesView
    search/      # SearchView
  store/         # Zustand store
  types/         # TypeScript types
  lib/           # Utils, templates, SM-2 algorithm
```
