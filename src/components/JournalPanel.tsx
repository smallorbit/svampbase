import { useState, useRef, useEffect, useCallback } from 'react';
import type { JournalEntry, Task } from '../lib/types';
import { useJournal } from '../hooks/useJournal';

interface JournalPanelProps {
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  allTasks: Task[];
}

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------- Mention autocomplete ----------

/** Returns the partial #TASK... token immediately before the cursor, or null. */
function getMentionQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor);
  const match = before.match(/#(TASK[\w-]*)$/);
  return match ? match[1] : null;
}

function MentionTextarea({
  value,
  onChange,
  onExternalKeyDown,
  allTasks,
  textareaRef: externalRef,
  placeholder,
  rows,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onExternalKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  allTasks: Task[];
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const taRef = (externalRef ?? internalRef) as React.RefObject<HTMLTextAreaElement>;

  const [query, setQuery] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const matches = query === null ? [] : allTasks.filter((t) => {
    const q = query.toUpperCase();
    return t.id.includes(q) || t.title.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 8);

  // Recalculate query on value / selection change
  function refreshQuery() {
    const ta = taRef.current;
    if (!ta) return;
    const q = getMentionQuery(ta.value, ta.selectionStart);
    setQuery(q);
    setActiveIdx(0);
  }

  function insertMention(task: Task) {
    const ta = taRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    // Replace the partial #TASK... token before the cursor
    const replaced = before.replace(/#(TASK[\w-]*)$/, `#${task.id}`);
    const newValue = replaced + after;
    onChange(newValue);
    setQuery(null);
    // Restore focus and move cursor to end of inserted token
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const newCursor = replaced.length;
      ta.setSelectionRange(newCursor, newCursor);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % matches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(matches[activeIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setQuery(null);
        return;
      }
    }
    onExternalKeyDown?.(e);
  }

  const dismissOnClickOutside = useCallback((e: MouseEvent) => {
    if (taRef.current && !taRef.current.contains(e.target as Node)) {
      setQuery(null);
    }
  }, [taRef]);

  useEffect(() => {
    document.addEventListener('mousedown', dismissOnClickOutside);
    return () => document.removeEventListener('mousedown', dismissOnClickOutside);
  }, [dismissOnClickOutside]);

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); refreshQuery(); }}
        onKeyDown={handleKeyDown}
        onSelect={refreshQuery}
        onClick={refreshQuery}
        placeholder={placeholder}
        rows={rows ?? 5}
        className={className}
      />

      {query !== null && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
          {matches.map((task, idx) => (
            <button
              key={task.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(task); }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`w-full text-left px-3 py-2 flex items-baseline gap-2 transition-colors ${
                idx === activeIdx ? 'bg-blue-600/40' : 'hover:bg-slate-700'
              }`}
            >
              <span className="font-mono text-xs text-blue-300 flex-shrink-0">{task.id}</span>
              <span className="text-sm text-slate-200 truncate">{task.title}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 border-t border-slate-700 flex items-center gap-2">
            <kbd className="text-[10px] text-slate-500 bg-slate-700 px-1 rounded">↑↓</kbd>
            <span className="text-[10px] text-slate-600">navigate</span>
            <kbd className="text-[10px] text-slate-500 bg-slate-700 px-1 rounded">↵</kbd>
            <span className="text-[10px] text-slate-600">select</span>
            <kbd className="text-[10px] text-slate-500 bg-slate-700 px-1 rounded">Esc</kbd>
            <span className="text-[10px] text-slate-600">dismiss</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Entry rendering ----------

/** Render content with #TASK-XXX references as clickable chips */
function EntryContent({
  content,
  allTasks,
  onOpenTask,
}: {
  content: string;
  allTasks: Task[];
  onOpenTask: (task: Task) => void;
}) {
  const taskRefPattern = /#(TASK-\d+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = taskRefPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
    }
    const taskId = match[1];
    const task = allTasks.find((t) => t.id === taskId);
    if (task) {
      parts.push(
        <button
          key={match.index}
          onClick={() => onOpenTask(task)}
          className="inline-flex items-center gap-1 bg-blue-900/50 hover:bg-blue-800/70 text-blue-300 hover:text-blue-200 text-xs font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          title={task.title}
        >
          {taskId}
        </button>
      );
    } else {
      parts.push(
        <span key={match.index} className="text-slate-500 font-mono text-xs">{match[0]}</span>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
  }

  return <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{parts}</p>;
}

function EntryCard({
  entry,
  allTasks,
  onOpenTask,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  allTasks: Task[];
  onOpenTask: (task: Task) => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wasEdited = entry.updatedAt !== entry.createdAt;

  return (
    <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-slate-300">{formatEntryDate(entry.createdAt)}</span>
          <span className="text-xs text-slate-500 ml-2">{formatEntryTime(entry.createdAt)}</span>
          {wasEdited && <span className="text-xs text-slate-600 ml-2">· edited</span>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(entry)}
            className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
            title="Edit entry"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(entry.id)}
                className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
              title="Delete entry"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <EntryContent content={entry.content} allTasks={allTasks} onOpenTask={onOpenTask} />
    </div>
  );
}

// ---------- Main panel ----------

export function JournalPanel({ onClose, onOpenTask, allTasks }: JournalPanelProps) {
  const { entries, loading, addEntry, editEntry, removeEntry } = useJournal();
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (composing && textareaRef.current) textareaRef.current.focus();
  }, [composing]);

  useEffect(() => {
    if (editingEntry && editTextareaRef.current) editTextareaRef.current.focus();
  }, [editingEntry]);

  async function handleSubmit() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await addEntry(draft.trim());
      setDraft('');
      setComposing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    if (!editingEntry || !editDraft.trim()) return;
    setSaving(true);
    try {
      await editEntry(editingEntry.id, editDraft.trim());
      setEditingEntry(null);
      setEditDraft('');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: JournalEntry) {
    setEditingEntry(entry);
    setEditDraft(entry.content);
  }

  function cancelEdit() {
    setEditingEntry(null);
    setEditDraft('');
  }

  const taClass = (bg: string) =>
    `w-full ${bg} border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 resize-none outline-none transition-colors`;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h2 className="text-white font-semibold text-sm">Journal</h2>
        </div>
        <div className="flex items-center gap-2">
          {!composing && (
            <button
              onClick={() => setComposing(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
            >
              + New Entry
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Compose area */}
      {composing && (
        <div className="px-4 py-3 border-b border-slate-700 flex-shrink-0 flex flex-col gap-2">
          <p className="text-xs text-slate-500">
            Type <code className="bg-slate-700 px-1 rounded text-slate-300">#TASK</code> to reference a task.
          </p>
          <MentionTextarea
            value={draft}
            onChange={setDraft}
            onExternalKeyDown={(e) => {
              if (e.key === 'Escape') { setComposing(false); setDraft(''); }
            }}
            allTasks={allTasks}
            textareaRef={textareaRef}
            placeholder="Reflect on wins, challenges, blockers..."
            rows={5}
            className={taClass('bg-slate-800')}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setComposing(false); setDraft(''); }}
              className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!draft.trim() || saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading && (
          <p className="text-slate-500 text-sm text-center py-8">Loading…</p>
        )}

        {!loading && entries.length === 0 && (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-slate-500 text-sm">No entries yet.</p>
            <p className="text-slate-600 text-xs">Start by adding a new entry above.</p>
          </div>
        )}

        {entries.map((entry) =>
          editingEntry?.id === entry.id ? (
            <div key={entry.id} className="bg-slate-800 rounded-lg p-4 flex flex-col gap-2">
              <span className="text-xs text-slate-400">{formatEntryDate(entry.createdAt)}</span>
              <MentionTextarea
                value={editDraft}
                onChange={setEditDraft}
                onExternalKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                allTasks={allTasks}
                textareaRef={editTextareaRef}
                rows={5}
                className={taClass('bg-slate-700')}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editDraft.trim() || saving}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <EntryCard
              key={entry.id}
              entry={entry}
              allTasks={allTasks}
              onOpenTask={onOpenTask}
              onEdit={startEdit}
              onDelete={removeEntry}
            />
          )
        )}
      </div>
    </div>
  );
}
