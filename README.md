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
| 🤖 **AI Tools (NVIDIA NIM)** | AI summarize, quiz, and flashcard generation with OCR/handwriting context |
| 🔍 **Full-text Search** | Search by title, content, or tags |
| 💾 **Auto-save** | All data persisted to localStorage, no login needed |
| 📌 **Pin & Favorite** | Quickly access important notes |

## 🏗️ Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### AI setup (NVIDIA NIM)

```bash
cp .env.example .env.local
```

Configure:

- `NVIDIA_API_KEY`: your NIM API key
- `NVIDIA_NIM_MODEL`: default `openai/gpt-oss-120b`
- `NVIDIA_NIM_USE_CASE`: default `Retrieval Augmented Generation` (best fit for MBBS note + OCR context)

## 🧰 Tech Stack

- **Framework**: Next.js 16 (App Router)
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
