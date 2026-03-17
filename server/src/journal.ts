import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const JOURNAL_FILE = path.join(DATA_DIR, 'journal.json');

export interface StoredJournalEntry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function readEntries(): StoredJournalEntry[] {
  if (!fs.existsSync(JOURNAL_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf-8')) as StoredJournalEntry[];
  } catch {
    return [];
  }
}

function writeEntries(entries: StoredJournalEntry[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(JOURNAL_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export function getAllEntries(): StoredJournalEntry[] {
  return readEntries();
}

export function getEntry(id: string): StoredJournalEntry | undefined {
  return readEntries().find((e) => e.id === id);
}

export function upsertEntry(entry: StoredJournalEntry): StoredJournalEntry {
  const entries = readEntries();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry; else entries.push(entry);
  writeEntries(entries);
  return entry;
}

export function deleteEntry(id: string): boolean {
  const entries = readEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  entries.splice(idx, 1);
  writeEntries(entries);
  return true;
}
