'use client';
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  Plus, ChevronRight, ChevronDown, Search,
  Layers, Brain, Mic, Link2, FileText, Home, Menu, X,
  Trash2, LayoutTemplate, Files, Cloud
} from 'lucide-react';
import { NOTEBOOK_COLORS } from '@/lib/templates';

export function Sidebar() {
  const {
    sidebarOpen, setSidebarOpen, notebooks, subjects, topics, notes,
    addNotebook, addSubject, addTopic, deleteNotebook, deleteSubject, deleteTopic,
    activeView, setActiveView, selectedNotebookId, selectedSubjectId,
    selectNotebook, selectSubject, selectTopic, flashcards,
    activeTag, setActiveTag, searchQuery, setSearchQuery,
  } = useStore();

  const [expandedNbs, setExpandedNbs] = useState<Set<string>>(new Set(['nb-anatomy', 'nb-pharma']));
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [addingNotebook, setAddingNotebook] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [addingSubjectFor, setAddingSubjectFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));
  const dueCount = flashcards.filter((fc) => new Date(fc.dueDate) <= new Date()).length;

  const toggleNb = (id: string) => {
    setExpandedNbs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSub = (id: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 bg-white shadow-lg rounded-lg p-2 hover:bg-gray-50"
      >
        <Menu size={20} />
      </button>
    );
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Brain size={22} className="text-blue-400" />
          <span className="font-bold text-lg">NoteIt</span>
          <span className="text-xs text-gray-400 font-normal">MBBS</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-400" />
          <input
            className="bg-transparent text-sm text-white placeholder-gray-400 outline-none flex-1 min-w-0"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveView('search'); }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Main Nav */}
        <nav className="px-2 py-2 space-y-1">
          <NavItem icon={<Home size={16} />} label="Home" active={activeView === 'home'} onClick={() => setActiveView('home')} />
          <NavItem
            icon={<Brain size={16} />}
            label="Flashcards"
            active={activeView === 'flashcards' || activeView === 'flashcard-review'}
            onClick={() => setActiveView('flashcards')}
            badge={dueCount > 0 ? String(dueCount) : undefined}
          />
          <NavItem icon={<Link2 size={16} />} label="Note Graph" active={activeView === 'graph'} onClick={() => setActiveView('graph')} />
          <NavItem icon={<Files size={16} />} label="Documents" active={activeView === 'documents'} onClick={() => setActiveView('documents')} />
          <NavItem icon={<Mic size={16} />} label="Audio Notes" active={activeView === 'audio'} onClick={() => setActiveView('audio')} />
          <NavItem icon={<LayoutTemplate size={16} />} label="Templates" active={activeView === 'templates'} onClick={() => setActiveView('templates')} />
          <NavItem icon={<Cloud size={16} />} label="Sync" active={activeView === 'sync'} onClick={() => setActiveView('sync')} />
        </nav>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setActiveTag(activeTag === tag ? null : tag); setActiveView('search'); }}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    activeTag === tag
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-gray-600 text-gray-300 hover:border-blue-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notebooks */}
        <div className="px-2 py-2 border-t border-gray-700">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs text-gray-500 uppercase font-semibold">Notebooks</span>
            <button
              onClick={() => setAddingNotebook(true)}
              className="text-gray-400 hover:text-white"
              title="Add notebook"
            >
              <Plus size={14} />
            </button>
          </div>

          {addingNotebook && (
            <form
              className="px-2 mb-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (newNbName.trim()) {
                  addNotebook(newNbName.trim(), NOTEBOOK_COLORS[Math.floor(Math.random() * NOTEBOOK_COLORS.length)]);
                  setNewNbName('');
                  setAddingNotebook(false);
                }
              }}
            >
              <input
                autoFocus
                className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 outline-none"
                placeholder="Notebook name..."
                value={newNbName}
                onChange={(e) => setNewNbName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setAddingNotebook(false)}
              />
            </form>
          )}

          {notebooks.map((nb) => {
            const nbSubjects = subjects.filter((s) => nb.subjectIds.includes(s.id));
            const expanded = expandedNbs.has(nb.id);
            return (
              <div key={nb.id}>
                <div
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-700 group ${
                    selectedNotebookId === nb.id ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => { toggleNb(nb.id); selectNotebook(nb.id); setActiveView('notes'); }}
                >
                  <button
                    className="text-gray-400 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); toggleNb(nb.id); }}
                  >
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <span className="text-base leading-none">{nb.icon}</span>
                  <span className="flex-1 text-sm truncate">{nb.name}</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: nb.color }} />
                  <button
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.id); }}
                    title="Delete notebook"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {expanded && (
                  <div className="ml-4">
                    {nbSubjects.map((sub) => {
                      const subTopics = topics.filter((t) => sub.topicIds.includes(t.id));
                      const subExpanded = expandedSubs.has(sub.id);
                      return (
                        <div key={sub.id}>
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer hover:bg-gray-700 group ${
                              selectedSubjectId === sub.id ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => { toggleSub(sub.id); selectSubject(sub.id); setActiveView('notes'); }}
                          >
                            <button onClick={(e) => { e.stopPropagation(); toggleSub(sub.id); }} className="text-gray-400">
                              {subExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </button>
                            <Layers size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="flex-1 text-xs truncate">{sub.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <button
                                className="text-gray-500 hover:text-blue-400"
                                onClick={(e) => { e.stopPropagation(); setAddingTopicFor(sub.id); }}
                                title="Add topic"
                              >
                                <Plus size={11} />
                              </button>
                              <button
                                className="text-gray-500 hover:text-red-400"
                                onClick={(e) => { e.stopPropagation(); deleteSubject(sub.id); }}
                                title="Delete subject"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {addingTopicFor === sub.id && (
                            <form
                              className="ml-4 px-1 mb-1"
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (newTopicName.trim()) {
                                  addTopic(sub.id, newTopicName.trim());
                                  setNewTopicName('');
                                  setAddingTopicFor(null);
                                  setExpandedSubs((prev) => new Set([...prev, sub.id]));
                                }
                              }}
                            >
                              <input
                                autoFocus
                                className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1 outline-none"
                                placeholder="Topic name..."
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Escape' && setAddingTopicFor(null)}
                              />
                            </form>
                          )}

                          {subExpanded && (
                            <div className="ml-4">
                              {subTopics.map((topic) => (
                                <div
                                  key={topic.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-gray-700 group"
                                  onClick={() => { selectTopic(topic.id); setActiveView('notes'); }}
                                >
                                  <FileText size={11} className="text-gray-500 flex-shrink-0" />
                                  <span className="flex-1 text-xs truncate text-gray-300">{topic.name}</span>
                                  <span className="text-xs text-gray-600 group-hover:hidden">
                                    {topic.noteIds.length}
                                  </span>
                                  <button
                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                                    onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {addingSubjectFor === nb.id ? (
                      <form
                        className="px-2 mb-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newSubName.trim()) {
                            addSubject(nb.id, newSubName.trim());
                            setNewSubName('');
                            setAddingSubjectFor(null);
                          }
                        }}
                      >
                        <input
                          autoFocus
                          className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1 outline-none"
                          placeholder="Subject name..."
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && setAddingSubjectFor(null)}
                        />
                      </form>
                    ) : (
                      <button
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-300 w-full"
                        onClick={() => setAddingSubjectFor(nb.id)}
                      >
                        <Plus size={11} /> Add subject
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500 text-center">
        NoteIt MBBS v1.0
      </div>
    </aside>
  );
}

function NavItem({
  icon, label, active, onClick, badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}
