import { useState, useEffect, useCallback } from 'react';
import type { Session, SessionStatus } from '../lib/sessionTypes';
import * as sessionsApi from '../api/sessions';

export function useSessions(taskId?: string) {
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionsApi.getSessions();
      setAllSessions(data);
      setError(null);
    } catch {
      setError('Backend offline');
      setAllSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, taskId]);

  const sessions = taskId
    ? allSessions.filter((s) => s.taskIds.includes(taskId))
    : allSessions;

  const createSession = useCallback(
    async (data: { name?: string; taskIds: string[]; notes?: string; launch?: boolean }) => {
      const session = await sessionsApi.createSession(data);
      setAllSessions((prev) => [...prev, session]);
      return session;
    },
    []
  );

  const updateSession = useCallback(
    async (id: string, data: Partial<Pick<Session, 'status' | 'taskIds' | 'notes' | 'name'>>) => {
      const updated = await sessionsApi.updateSession(id, data);
      setAllSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      return updated;
    },
    []
  );

  const deleteSession = useCallback(async (id: string) => {
    await sessionsApi.deleteSession(id);
    setAllSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const launchSession = useCallback(async (id: string) => {
    const updated = await sessionsApi.launchSession(id);
    setAllSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    return updated;
  }, []);

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    launchSession,
    refresh: fetchSessions,
  };
}

export type { Session, SessionStatus };
