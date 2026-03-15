import { useSessions } from '../hooks/useSessions';
import type { Session } from '../lib/sessionTypes';

interface SessionsPanelProps {
  onClose: () => void;
}

function formatRelativeTime(isoString: string | undefined): string {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusDot({ status }: { status: Session['status'] }) {
  const colorClass =
    status === 'active'
      ? 'bg-green-400'
      : status === 'paused'
      ? 'bg-yellow-400'
      : 'bg-slate-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${colorClass} flex-shrink-0`} />;
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-green-900/60 text-green-300'
      : status === 'paused'
      ? 'bg-yellow-900/60 text-yellow-300'
      : 'bg-slate-700 text-slate-400';
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{status}</span>
  );
}

export function SessionsPanel({ onClose }: SessionsPanelProps) {
  const { sessions, loading, error, launchSession, updateSession, deleteSession } = useSessions();

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-white font-semibold text-sm">Claude Sessions</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-lg px-1"
          aria-label="Close sessions panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <p className="text-slate-500 text-sm text-center py-8">Loading sessions...</p>
        )}

        {!loading && error && (
          <div className="bg-slate-800 border border-slate-700 rounded p-3 text-slate-400 text-xs">
            <p className="font-medium text-slate-300 mb-1">Backend offline</p>
            <p>Start the backend server to manage Claude sessions:</p>
            <pre className="mt-1 text-slate-500 font-mono text-xs">cd server &amp;&amp; npm run dev</pre>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">No sessions yet</p>
        )}

        {!loading &&
          !error &&
          sessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <StatusDot status={session.status} />
                <span className="font-mono text-xs text-slate-200 flex-1 truncate">
                  {session.name}
                </span>
                <StatusBadge status={session.status} />
              </div>

              {session.taskIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {session.taskIds.map((tid) => (
                    <span
                      key={tid}
                      className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono"
                    >
                      {tid}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-slate-500 text-xs">
                Last launched: {formatRelativeTime(session.lastLaunchedAt)}
              </p>

              {session.notes && (
                <p className="text-slate-400 text-xs italic truncate">{session.notes}</p>
              )}

              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => launchSession(session.id)}
                  className="flex items-center gap-1 bg-blue-700 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded transition-colors"
                >
                  ▶ {session.lastLaunchedAt ? 'Resume' : 'Launch'}
                </button>

                {session.status !== 'paused' && session.status !== 'ended' && (
                  <button
                    onClick={() => updateSession(session.id, { status: 'paused' })}
                    className="bg-yellow-900/50 hover:bg-yellow-800/60 text-yellow-300 text-xs px-2 py-1 rounded transition-colors"
                  >
                    Pause
                  </button>
                )}

                {session.status !== 'ended' && (
                  <button
                    onClick={() => updateSession(session.id, { status: 'ended' })}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded transition-colors"
                  >
                    End
                  </button>
                )}

                {session.status === 'ended' && (
                  <button
                    onClick={() => updateSession(session.id, { status: 'active' })}
                    className="bg-green-900/50 hover:bg-green-800/60 text-green-300 text-xs px-2 py-1 rounded transition-colors"
                  >
                    Reactivate
                  </button>
                )}

                <button
                  onClick={() => deleteSession(session.id)}
                  className="ml-auto text-slate-600 hover:text-red-400 text-xs px-1.5 py-1 rounded transition-colors"
                  title="Delete session"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
