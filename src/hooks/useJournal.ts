import { useState, useEffect, useCallback } from 'react';
import type { JournalEntry } from '../lib/types';
import { fetchEntries, createEntry, updateEntry, deleteEntryApi } from '../api/journal';

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries()
      .then((data) => setEntries(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addEntry = useCallback(async (content: string) => {
    const entry = await createEntry(content);
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const editEntry = useCallback(async (id: string, content: string) => {
    const updated = await updateEntry(id, content);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    await deleteEntryApi(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, addEntry, editEntry, removeEntry };
}
