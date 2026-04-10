import { useMemo, useState } from 'react';
import type { Task, TaskStatus } from '../lib/types';
import { formatRelativeTime } from '../lib/utils';

const ACTIVE_STATUSES: TaskStatus[] = [
  'in-progress',
  'waiting-on-dependency',
  'waiting-on-response',
  'backburnered',
];

const TERMINAL_STATUSES: TaskStatus[] = ['completed', 'archived'];

const PAGE_SIZE = 50;

type DateRangePreset = '7d' | '30d' | '90d' | 'all';

interface HistoryPanelProps {
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
}

function getLastTerminalTimestamp(task: Task): number {
  const terminalEntries = task.history
    .filter((h) => TERMINAL_STATUSES.includes(h.toStatus))
    .map((h) => new Date(h.timestamp).getTime());
  if (terminalEntries.length === 0) {
    return new Date(task.updatedAt).getTime();
  }
  return Math.max(...terminalEntries);
}

function findReactivateStatus(task: Task): TaskStatus {
  for (let i = task.history.length - 1; i >= 0; i--) {
    const entry = task.history[i];
    if (ACTIVE_STATUSES.includes(entry.toStatus)) {
      return entry.toStatus;
    }
    if (entry.fromStatus && ACTIVE_STATUSES.includes(entry.fromStatus)) {
      return entry.fromStatus;
    }
  }
  return 'in-progress';
}

function isWithinDateRange(task: Task, preset: DateRangePreset): boolean {
  if (preset === 'all') return true;
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return getLastTerminalTimestamp(task) >= cutoff;
}

export function HistoryPanel({ tasks, onClose, onOpenTask, onUpdateTask }: HistoryPanelProps) {
  type TabId = 'completed' | 'archived';
  const [activeTab, setActiveTab] = useState<TabId>('completed');
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [page, setPage] = useState(1);

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed'),
    [tasks]
  );
  const archivedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'archived'),
    [tasks]
  );

  const allTags = useMemo(() => {
    const sourceTasks = activeTab === 'completed' ? completedTasks : archivedTasks;
    return Array.from(new Set(sourceTasks.flatMap((t) => t.tags ?? []))).sort();
  }, [activeTab, completedTasks, archivedTasks]);

  const filtered = useMemo(() => {
    const sourceTasks = activeTab === 'completed' ? completedTasks : archivedTasks;
    return sourceTasks
      .filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedTags.length > 0 && !selectedTags.every((tag) => t.tags?.includes(tag))) return false;
        if (!isWithinDateRange(t, dateRange)) return false;
        return true;
      })
      .sort((a, b) => getLastTerminalTimestamp(b) - getLastTerminalTimestamp(a));
  }, [activeTab, completedTasks, archivedTasks, search, selectedTags, dateRange]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const remaining = filtered.length - visible.length;

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setSelectedTags([]);
    setDateRange('all');
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  }

  function handleReactivate(task: Task) {
    const newStatus = findReactivateStatus(task);
    const now = new Date().toISOString();
    const historyEntry = {
      id: Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
      timestamp: now,
      fromStatus: task.status,
      toStatus: newStatus,
    };
    onUpdateTask({
      ...task,
      status: newStatus,
      updatedAt: now,
      completedAt: undefined,
      archivedAt: undefined,
      history: [...task.history, historyEntry],
    });
  }

  const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
  ];

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-100">History</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 px-4 flex-shrink-0">
        <button
          onClick={() => handleTabChange('completed')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'completed'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Completed ({completedTasks.length})
        </button>
        <button
          onClick={() => handleTabChange('archived')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'archived'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Archived ({archivedTasks.length})
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0 space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by title..."
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />

        {/* Date range presets */}
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => { setDateRange(preset.value); setPage(1); }}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                dateRange === preset.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-600 italic text-center mt-8">No tasks found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={() => onOpenTask(task)}
                onReactivate={() => handleReactivate(task)}
              />
            ))}

            {remaining > 0 && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-200 py-2 transition-colors"
              >
                Load more ({remaining} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onOpen: () => void;
  onReactivate: () => void;
}

function TaskCard({ task, onOpen, onReactivate }: TaskCardProps) {
  const lastTerminalTs = getLastTerminalTimestamp(task);
  const relativeTime = formatRelativeTime(new Date(lastTerminalTs).toISOString());

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <button
          onClick={onOpen}
          className="text-sm text-slate-200 hover:text-white text-left leading-snug flex-1 min-w-0"
          title={task.title}
        >
          {task.title}
        </button>
        <span className="text-xs text-slate-500 flex-shrink-0 mt-0.5">{relativeTime}</span>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-1.5">
        <button
          onClick={onOpen}
          className="text-xs text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors"
        >
          Open
        </button>
        <button
          onClick={onReactivate}
          className="text-xs text-blue-400 hover:text-blue-300 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors"
        >
          Reactivate
        </button>
      </div>
    </div>
  );
}
