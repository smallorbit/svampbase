export type SessionStatus = 'active' | 'paused' | 'ended';

export interface Session {
  id: string;           // UUID (crypto.randomUUID)
  name: string;
  status: SessionStatus;
  taskIds: string[];    // linked Svampbase task IDs (e.g. ["TASK-001", "TASK-003"])
  folderPath: string;   // absolute path to the session's workspace folder
  projectPath?: string; // original working directory for imported sessions (used as cwd on resume)
  createdAt: string;    // ISO
  updatedAt: string;    // ISO
  lastLaunchedAt?: string; // ISO — last time a Terminal window was opened
  notes?: string;
}

export interface SessionFile {
  name: string;
  size: number;
  uploadedAt: string; // ISO — file mtime
}
