'use client';

import React from 'react';
import { Bell, Command, Menu, PanelLeft, PanelLeftClose, PanelRight, Search, UserCircle2 } from 'lucide-react';
import { useUiSlice } from '@/store/slices/uiSlice';
import { useSyncSlice } from '@/store/slices/syncSlice';

interface TopBarProps {
  isMobile?: boolean;
  onMenuPress?: () => void;
  onNotesPress?: () => void;
}

export function TopBar({ isMobile = false, onMenuPress, onNotesPress }: TopBarProps) {
  const {
    sidebarOpen,
    notesListOpen,
    editorFocusMode,
    setSidebarOpen,
    setNotesListOpen,
    setCommandPaletteOpen,
    setEditorFocusMode,
  } = useUiSlice();
  const { syncStatus, setSyncPanelOpen } = useSyncSlice();

  const syncTone = syncStatus === 'synced'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : syncStatus === 'syncing'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200';

  const syncLabel = syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Error';

  // ── Mobile top bar ──
  if (isMobile) {
    return (
      <header
        className="h-14 border-b border-[var(--border)] bg-white/90 backdrop-blur-sm flex items-center px-3 gap-2"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          className="p-2 rounded-lg hover:bg-[var(--surface-muted)] shrink-0"
          onClick={onMenuPress}
          title="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Search (compact on mobile) */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
        >
          <Search size={14} />
          <span className="truncate text-xs">Search…</span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {onNotesPress && (
            <button
              className="p-2 rounded-lg hover:bg-[var(--surface-muted)]"
              onClick={onNotesPress}
              title="Notes list"
            >
              <PanelRight size={17} />
            </button>
          )}
          <button
            onClick={() => setSyncPanelOpen(true)}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${syncTone}`}
            title="Sync status"
          >
            {syncStatus === 'synced' ? '✓' : syncStatus === 'syncing' ? '⟳' : '!'}
          </button>
          <button className="p-1.5 rounded-full hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]" title="Profile">
            <UserCircle2 size={22} />
          </button>
        </div>
      </header>
    );
  }

  // ── Desktop top bar ──
  return (
    <header className="h-14 border-b border-[var(--border)] bg-white/90 backdrop-blur-sm flex items-center px-4 gap-2">
      <button
        className="p-2 rounded-lg hover:bg-[var(--surface-muted)]"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />}
      </button>
      <button
        className="p-2 rounded-lg hover:bg-[var(--surface-muted)]"
        onClick={() => setNotesListOpen(!notesListOpen)}
        title={notesListOpen ? 'Collapse notes list' : 'Expand notes list'}
      >
        <PanelRight size={17} />
      </button>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="ml-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
      >
        <Search size={14} />
        <span className="hidden md:inline">Search notes, tags, actions...</span>
        <span className="md:hidden text-xs">Search…</span>
        <span className="ml-1 inline-flex items-center rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] hidden md:inline-flex">
          <Command size={10} className="mr-0.5" />K
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setEditorFocusMode(!editorFocusMode)}
          className={`hidden sm:flex px-2.5 py-1.5 rounded-lg text-xs font-medium border ${editorFocusMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]'}`}
        >
          {editorFocusMode ? 'Exit Focus' : 'Focus Mode'}
        </button>
        <button
          onClick={() => setSyncPanelOpen(true)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${syncTone}`}
          title="Open sync details"
        >
          <span className="hidden sm:inline">{syncLabel}</span>
          <span className="sm:hidden">{syncStatus === 'synced' ? '✓' : syncStatus === 'syncing' ? '⟳' : '!'}</span>
        </button>
        <button className="p-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]" title="Notifications">
          <Bell size={16} />
        </button>
        <button className="p-1 rounded-full hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]" title="Profile">
          <UserCircle2 size={24} />
        </button>
      </div>
    </header>
  );
}

  const {
    sidebarOpen,
    notesListOpen,
    editorFocusMode,
    setSidebarOpen,
    setNotesListOpen,
    setCommandPaletteOpen,
    setEditorFocusMode,
  } = useUiSlice();
  const { syncStatus, setSyncPanelOpen } = useSyncSlice();

  const syncTone = syncStatus === 'synced'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : syncStatus === 'syncing'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200';

  const syncLabel = syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Error';

  return (
    <header className="h-14 border-b border-[var(--border)] bg-white/90 backdrop-blur-sm flex items-center px-4 gap-2">
      <button
        className="p-2 rounded-lg hover:bg-[var(--surface-muted)]"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />}
      </button>
      <button
        className="p-2 rounded-lg hover:bg-[var(--surface-muted)]"
        onClick={() => setNotesListOpen(!notesListOpen)}
        title={notesListOpen ? 'Collapse notes list' : 'Expand notes list'}
      >
        <PanelRight size={17} />
      </button>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="ml-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
      >
        <Search size={14} />
        Search notes, tags, actions...
        <span className="ml-1 inline-flex items-center rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px]">
          <Command size={10} className="mr-0.5" />K
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setEditorFocusMode(!editorFocusMode)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${editorFocusMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]'}`}
        >
          {editorFocusMode ? 'Exit Focus' : 'Focus Mode'}
        </button>
        <button
          onClick={() => setSyncPanelOpen(true)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${syncTone}`}
          title="Open sync details"
        >
          {syncLabel}
        </button>
        <button className="p-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]" title="Notifications">
          <Bell size={16} />
        </button>
        <button className="p-1 rounded-full hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]" title="Profile">
          <UserCircle2 size={24} />
        </button>
      </div>
    </header>
  );
}
