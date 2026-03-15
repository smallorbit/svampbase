export type SessionStatus = 'active' | 'paused' | 'ended';

export interface Session {
  id: string;           // UUID (crypto.randomUUID)
  name: string;         // passed to claude -n / --resume (e.g. "svampbase-abc123")
  status: SessionStatus;
  taskIds: string[];    // linked Svampbase task IDs (e.g. ["TASK-001", "TASK-003"])
  createdAt: string;    // ISO
  updatedAt: string;    // ISO
  lastLaunchedAt?: string; // ISO — last time a Terminal window was opened
  notes?: string;
}
