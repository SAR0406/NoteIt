'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  Plus, ChevronRight, ChevronDown, Search,
  Layers, Brain, Mic, Link2, FileText, Home,
  Trash2, LayoutTemplate, Files, GraduationCap, BarChart3, Users, Star,
  Pencil,
} from 'lucide-react';
import { NOTEBOOK_COLORS } from '@/lib/templates';

type MenuTarget =
  | { type: 'notebook'; id: string }
  | { type: 'subject'; id: string }
  | { type: 'topic'; id: string }
  | null;

export function Sidebar() {
  const {
    notebooks,
    subjects,
    topics,
    notes,
    addNotebook,
    addSubject,
    addTopic,
    updateNotebook,
    updateSubject,
    updateTopic,
    moveSubject,
    moveTopic,
    deleteNotebook,
    deleteSubject,
    deleteTopic,
    activeView,
    setActiveView,
    selectedNotebookId,
    selectedSubjectId,
    selectNotebook,
    selectSubject,
    selectTopic,
    flashcards,
    activeTag,
    setActiveTag,
    searchQuery,
    setSearchQuery,
    setSelectedSystemSection,
    selectedSystemSection,
  } = useStore();

  const [expandedNbs, setExpandedNbs] = useState<Set<string>>(new Set(notebooks.map((n) => n.id)));
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [addingNotebook, setAddingNotebook] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [addingSubjectFor, setAddingSubjectFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [menuTarget, setMenuTarget] = useState<MenuTarget>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const allTags = Array.from(new Set(notes.filter((n) => !n.isTrashed).flatMap((n) => n.tags))).sort();
  const dueCount = flashcards.filter((fc) => new Date(fc.dueDate) <= new Date()).length;

  useEffect(() => {
    const close = () => {
      setMenuTarget(null);
      setMenuPos(null);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

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

  const openContext = (e: React.MouseEvent, target: Exclude<MenuTarget, null>) => {
    e.preventDefault();
    setMenuTarget(target);
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const renameTarget = () => {
    if (!menuTarget) return;
    if (menuTarget.type === 'notebook') {
      renameNotebook(menuTarget.id);
    }
    if (menuTarget.type === 'subject') {
      renameSubject(menuTarget.id);
    }
    if (menuTarget.type === 'topic') {
      renameTopic(menuTarget.id);
    }
    setMenuTarget(null);
    setMenuPos(null);
  };

  const renameNotebook = (id: string) => {
    const current = notebooks.find((n) => n.id === id);
    const value = window.prompt('Rename notebook', current?.name ?? '');
    if (value?.trim()) updateNotebook(id, { name: value.trim() });
  };

  const renameSubject = (id: string) => {
    const current = subjects.find((s) => s.id === id);
    const value = window.prompt('Rename subject', current?.name ?? '');
    if (value?.trim()) updateSubject(id, { name: value.trim() });
  };

  const renameTopic = (id: string) => {
    const current = topics.find((t) => t.id === id);
    const value = window.prompt('Rename topic', current?.name ?? '');
    if (value?.trim()) updateTopic(id, { name: value.trim() });
  };

  const moveTarget = () => {
    if (!menuTarget) return;
    if (menuTarget.type === 'subject') {
      const options = notebooks.map((n) => `${n.id}: ${n.name}`).join('\n');
      const target = window.prompt(`Move subject to notebook. Enter target notebook ID:\n${options}`);
      if (target?.trim()) moveSubject(menuTarget.id, target.trim());
    }
    if (menuTarget.type === 'topic') {
      const options = subjects.map((s) => `${s.id}: ${s.name}`).join('\n');
      const target = window.prompt(`Move topic to subject. Enter target subject ID:\n${options}`);
      if (target?.trim()) moveTopic(menuTarget.id, target.trim());
    }
    setMenuTarget(null);
    setMenuPos(null);
  };

  const deleteTarget = () => {
    if (!menuTarget) return;
    if (menuTarget.type === 'notebook') deleteNotebook(menuTarget.id);
    if (menuTarget.type === 'subject') deleteSubject(menuTarget.id);
    if (menuTarget.type === 'topic') deleteTopic(menuTarget.id);
    setMenuTarget(null);
    setMenuPos(null);
  };

  return (
    <aside className="bg-[#0c1536] text-white flex flex-col h-full overflow-hidden flex-shrink-0 border-r border-[#1f2b57]">
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#223265] bg-[#0a1330]">
        <div className="flex items-center gap-2">
          <Brain size={22} className="text-indigo-300" />
          <span className="font-bold text-lg">NoteIt</span>
          <span className="text-xs text-indigo-200/70 font-normal">MBBS</span>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-[#223265]">
        <div className="flex items-center gap-2 bg-[#111d46] rounded-xl px-3 py-2 border border-[#243264]">
          <Search size={14} className="text-indigo-200/60" />
          <input
            className="bg-transparent text-sm text-white placeholder-indigo-200/40 outline-none flex-1 min-w-0"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedSystemSection(null); setActiveView('search'); }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 py-2 space-y-1">
          <NavItem icon={<Home size={16} />} label="Home" active={activeView === 'home'} onClick={() => setActiveView('home')} />
          <NavItem icon={<FileText size={16} />} label="All Notes" active={activeView === 'notes' && !activeTag} onClick={() => { setSelectedSystemSection('all'); setActiveTag(null); setActiveView('notes'); }} />
          <NavItem icon={<Star size={16} />} label="Favorites" active={activeView === 'notes' && selectedSystemSection === 'favorites'} onClick={() => { setSelectedSystemSection('favorites'); setActiveTag(null); setActiveView('notes'); }} />
          <NavItem icon={<Layers size={16} />} label="Tags" active={activeView === 'search'} onClick={() => { setSelectedSystemSection(null); setActiveView('search'); }} />
          <NavItem icon={<Trash2 size={16} />} label="Trash" active={activeView === 'notes' && selectedSystemSection === 'trash'} onClick={() => { setSelectedSystemSection('trash'); setActiveTag(null); setActiveView('notes'); }} />
          <NavItem icon={<GraduationCap size={16} />} label="Subjects" active={activeView === 'subjects'} onClick={() => setActiveView('subjects')} />
          <NavItem icon={<Brain size={16} />} label="Flashcards" active={activeView === 'flashcards' || activeView === 'flashcard-review'} onClick={() => setActiveView('flashcards')} badge={dueCount > 0 ? String(dueCount) : undefined} />
          <NavItem icon={<Link2 size={16} />} label="Note Graph" active={activeView === 'graph'} onClick={() => setActiveView('graph')} />
          <NavItem icon={<Files size={16} />} label="Documents" active={activeView === 'documents'} onClick={() => setActiveView('documents')} />
          <NavItem icon={<Mic size={16} />} label="Audio Notes" active={activeView === 'audio'} onClick={() => setActiveView('audio')} />
          <NavItem icon={<BarChart3 size={16} />} label="Progress" active={activeView === 'progress'} onClick={() => setActiveView('progress')} />
          <NavItem icon={<Users size={16} />} label="Collaboration" active={activeView === 'collaboration'} onClick={() => setActiveView('collaboration')} />
          <NavItem icon={<LayoutTemplate size={16} />} label="Templates" active={activeView === 'templates'} onClick={() => setActiveView('templates')} />
        </nav>

        {allTags.length > 0 && (
          <div className="px-3 py-2 border-t border-[#223265]">
            <p className="text-[11px] text-indigo-200/50 uppercase font-semibold mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setActiveTag(activeTag === tag ? null : tag); setSelectedSystemSection(null); setActiveView('search'); }}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    activeTag === tag
                      ? 'bg-indigo-500 border-indigo-400 text-white'
                      : 'border-[#3a4b84] text-indigo-100/90 hover:border-indigo-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-2 py-2 border-t border-[#223265]">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] text-indigo-200/50 uppercase font-semibold">Notebooks</span>
            <button
              onClick={() => setAddingNotebook(true)}
              className="text-indigo-200/70 hover:text-white"
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
                className="w-full bg-[#111d46] border border-[#29386b] text-white text-sm rounded px-2 py-1 outline-none"
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
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#111d46] group ${selectedNotebookId === nb.id ? 'bg-[#111d46]' : ''}`}
                  onClick={() => { toggleNb(nb.id); selectNotebook(nb.id); setSelectedSystemSection('all'); setActiveView('notes'); }}
                  onContextMenu={(e) => openContext(e, { type: 'notebook', id: nb.id })}
                >
                  <button className="text-indigo-200/60 flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleNb(nb.id); }}>
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <span className="text-base leading-none">{nb.icon}</span>
                  <span className="flex-1 text-sm truncate">{nb.name}</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: nb.color }} />
                  <button className="opacity-0 group-hover:opacity-100 text-indigo-200/60 hover:text-indigo-300 flex-shrink-0" onClick={(e) => { e.stopPropagation(); renameNotebook(nb.id); }} title="Rename notebook"><Pencil size={12} /></button>
                  <button className="opacity-0 group-hover:opacity-100 text-indigo-200/50 hover:text-red-300 flex-shrink-0" onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.id); }} title="Delete notebook"><Trash2 size={12} /></button>
                </div>

                {expanded && (
                  <div className="ml-4">
                    {nbSubjects.map((sub) => {
                      const subTopics = topics.filter((t) => sub.topicIds.includes(t.id));
                      const subExpanded = expandedSubs.has(sub.id);
                      return (
                        <div key={sub.id}>
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer hover:bg-[#111d46] group ${selectedSubjectId === sub.id ? 'bg-[#111d46]' : ''}`}
                            onClick={() => { toggleSub(sub.id); selectSubject(sub.id); setSelectedSystemSection('all'); setActiveView('notes'); }}
                            onContextMenu={(e) => openContext(e, { type: 'subject', id: sub.id })}
                          >
                            <button onClick={(e) => { e.stopPropagation(); toggleSub(sub.id); }} className="text-indigo-200/60">
                              {subExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </button>
                            <Layers size={12} className="text-indigo-200/70 flex-shrink-0" />
                            <span className="flex-1 text-xs truncate">{sub.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <button className="text-indigo-200/60 hover:text-indigo-300" onClick={(e) => { e.stopPropagation(); setAddingTopicFor(sub.id); }} title="Add topic"><Plus size={11} /></button>
                              <button className="text-indigo-200/60 hover:text-indigo-300" onClick={(e) => { e.stopPropagation(); renameSubject(sub.id); }} title="Rename subject"><Pencil size={11} /></button>
                              <button className="text-indigo-200/60 hover:text-red-300" onClick={(e) => { e.stopPropagation(); deleteSubject(sub.id); }} title="Delete subject"><Trash2 size={11} /></button>
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
                                className="w-full bg-[#111d46] border border-[#29386b] text-white text-xs rounded px-2 py-1 outline-none"
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
                                  className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-[#111d46] group"
                                  onClick={() => { selectTopic(topic.id); setSelectedSystemSection('all'); setActiveView('notes'); }}
                                  onContextMenu={(e) => openContext(e, { type: 'topic', id: topic.id })}
                                >
                                  <FileText size={11} className="text-indigo-200/40 flex-shrink-0" />
                                  <span className="flex-1 text-xs truncate text-indigo-100/90">{topic.name}</span>
                                  <span className="text-xs text-indigo-200/40 group-hover:hidden">{topic.noteIds.length}</span>
                                  <button className="opacity-0 group-hover:opacity-100 text-indigo-200/60 hover:text-indigo-300" onClick={(e) => { e.stopPropagation(); renameTopic(topic.id); }}><Pencil size={10} /></button>
                                  <button className="opacity-0 group-hover:opacity-100 text-indigo-200/50 hover:text-red-300" onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}><Trash2 size={10} /></button>
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
                          className="w-full bg-[#111d46] border border-[#29386b] text-white text-xs rounded px-2 py-1 outline-none"
                          placeholder="Subject name..."
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && setAddingSubjectFor(null)}
                        />
                      </form>
                    ) : (
                      <button className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-200/60 hover:text-indigo-100 w-full" onClick={() => setAddingSubjectFor(nb.id)}>
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

      <div className="px-4 py-3 border-t border-[#223265] text-xs text-indigo-200/50 text-center">Calm study mode · NoteIt MBBS</div>

      {menuTarget && menuPos && (
        <div
          className="fixed z-[95] w-44 rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] shadow-xl py-1"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button onClick={renameTarget} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-muted)]">Rename</button>
          {menuTarget.type !== 'notebook' && (
            <button onClick={moveTarget} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-muted)]">Move</button>
          )}
          <button onClick={deleteTarget} className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600">Delete</button>
        </div>
      )}
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
        active ? 'bg-indigo-500 text-white' : 'text-indigo-100/90 hover:bg-[#111d46] hover:text-white'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{badge}</span>
      )}
    </button>
  );
}
