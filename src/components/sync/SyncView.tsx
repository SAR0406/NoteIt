'use client';

import React, { useRef } from 'react';
import { useStore } from '@/store/useStore';
import { CloudUpload, Download, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function SyncView() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const notebooks = useStore((s) => s.notebooks);
  const subjects = useStore((s) => s.subjects);
  const topics = useStore((s) => s.topics);
  const notes = useStore((s) => s.notes);
  const flashcards = useStore((s) => s.flashcards);

  const exportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        notebooks,
        subjects,
        topics,
        notes,
        flashcards,
      },
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `noteit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exported');
  };

  const importBackup: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        data?: {
          notebooks: unknown;
          subjects: unknown;
          topics: unknown;
          notes: unknown;
          flashcards: unknown;
        };
      };
      if (!parsed?.data) throw new Error('Invalid backup format');
      localStorage.setItem(
        'noteit-storage',
        JSON.stringify({
          state: parsed.data,
          version: 2,
        })
      );
      toast.success('Backup imported. Reloading...');
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error('Failed to import backup');
    } finally {
      event.currentTarget.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Cross-device Sync</h1>
        <p className="text-sm text-gray-500 mb-8">Use encrypted local backups to move notes between iPad, phone, and laptop.</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Download size={18} className="text-blue-600" />
              Export backup
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Download all notes, PDFs, drawings, flashcards and links into one JSON file.
            </p>
            <button onClick={exportBackup} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
              Export now
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <CloudUpload size={18} className="text-green-600" />
              Import backup
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Restore a backup exported from NoteIt on another device.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
            >
              Import file
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importBackup} />
          </div>
        </div>

        <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            Safety checklist
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Always export before importing on the same device.</li>
            <li>• Keep at least one weekly backup for exam season.</li>
            <li>• Use secure cloud storage (Drive/iCloud) to sync backup files.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
