import type { Session, SessionStatus } from '../lib/sessionTypes';

const BASE_URL = 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export function getSessions(): Promise<Session[]> {
  return apiFetch<Session[]>('/sessions');
}

export function createSession(data: {
  name?: string;
  taskIds: string[];
  notes?: string;
  launch?: boolean;
}): Promise<Session> {
  return apiFetch<Session>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSession(
  id: string,
  data: Partial<Pick<Session, 'status' | 'taskIds' | 'notes' | 'name'>>
): Promise<Session> {
  return apiFetch<Session>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSession(id: string): Promise<void> {
  return apiFetch<void>(`/sessions/${id}`, { method: 'DELETE' });
}

export function launchSession(id: string): Promise<Session> {
  return apiFetch<Session>(`/sessions/${id}/launch`, { method: 'POST' });
}

export type { Session, SessionStatus };
