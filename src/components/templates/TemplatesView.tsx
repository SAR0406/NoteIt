'use client';
import React from 'react';
import { useStore } from '@/store/useStore';
import { TEMPLATES } from '@/lib/templates';
import { TemplateType } from '@/types';
import { LayoutTemplate, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export function TemplatesView() {
  const { addNote, selectNote, setActiveView, selectedTopicId, selectedSubjectId, selectedNotebookId } = useStore();

  const templateKeys = Object.keys(TEMPLATES) as TemplateType[];

  const handleCreate = (templateType: TemplateType) => {
    const t = TEMPLATES[templateType];
    const note = addNote({
      topicId: selectedTopicId,
      subjectId: selectedSubjectId,
      notebookId: selectedNotebookId,
      title: `${t.name} — ${new Date().toLocaleDateString()}`,
      templateType,
    });
    selectNote(note.id);
    setActiveView('note-editor');
    toast.success(`${t.name} created!`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <LayoutTemplate className="text-green-500" size={28} /> Medical Templates
        </h1>
        <p className="text-gray-500 text-sm mb-8">Pre-made templates for common MBBS note types</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateKeys.map((key) => {
            const t = TEMPLATES[key];
            return (
              <div
                key={key}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6 flex flex-col"
              >
                <div className="text-4xl mb-3">{t.icon}</div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">{t.name}</h2>
                <p className="text-sm text-gray-500 flex-1 mb-4">
                  {key === 'blank' && 'Start with a completely blank note.'}
                  {key === 'soap' && 'Structured clinical SOAP note format. Perfect for ward rounds and case presentations.'}
                  {key === 'case-sheet' && 'Complete patient case sheet template with all clinical sections.'}
                  {key === 'anatomy' && 'Structured anatomy notes with location, relations, blood supply, and nerve supply.'}
                  {key === 'pharmacology' && 'Comprehensive pharmacology notes covering MOA, pharmacokinetics, and high-yield points.'}
                </p>
                <button
                  onClick={() => handleCreate(key)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium"
                >
                  <Plus size={16} /> Create Note
                </button>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="font-bold text-blue-800 mb-3">💡 MBBS Study Tips</h2>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>📌 <strong>SOAP notes</strong> — use for every clinical case you encounter in wards</li>
            <li>🫀 <strong>Anatomy template</strong> — always include clinical relevance + high-yield points</li>
            <li>💊 <strong>Pharmacology</strong> — focus on MOA + side effects for exams</li>
            <li>🔁 <strong>After making notes</strong> — generate flashcards using the AI tool for spaced repetition</li>
            <li>🔗 <strong>Link related notes</strong> — e.g., Kidney anatomy → RAAS → Antihypertensives</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
