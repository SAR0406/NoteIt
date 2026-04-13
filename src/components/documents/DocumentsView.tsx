'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { FileText } from 'lucide-react';
import { DocumentWorkspace } from './DocumentWorkspace';

export function DocumentsView() {
  const { notes, selectedNoteId } = useStore();
  const note = notes.find((n) => n.id === selectedNoteId);

  if (!note) {
    return (
      <div className="flex-1 grid place-items-center bg-gray-50 text-gray-400">
        <div className="text-center">
          <FileText size={42} className="mx-auto mb-2 opacity-30" />
          <p>Select a note from the list to manage PDFs/slides.</p>
        </div>
      </div>
    );
  }

  return <DocumentWorkspace note={note} />;
}
