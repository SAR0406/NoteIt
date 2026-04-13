import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoteIt — MBBS Note-Taking App",
  description: "All-in-one MBBS note-taking app with rich editor, flashcards, audio recording, note linking, templates and AI tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
