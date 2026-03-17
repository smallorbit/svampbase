import type { JournalEntry } from '../lib/types';

const BASE = 'http://localhost:3001';

export async function fetchEntries(): Promise<JournalEntry[]> {
  const res = await fetch(`${BASE}/journal`);
  if (!res.ok) throw new Error('Failed to fetch journal entries');
  return res.json();
}

export async function createEntry(content: string): Promise<JournalEntry> {
  const res = await fetch(`${BASE}/journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to create entry');
  return res.json();
}

export async function updateEntry(id: string, content: string): Promise<JournalEntry> {
  const res = await fetch(`${BASE}/journal/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update entry');
  return res.json();
}

export async function deleteEntryApi(id: string): Promise<void> {
  const res = await fetch(`${BASE}/journal/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete entry');
}
