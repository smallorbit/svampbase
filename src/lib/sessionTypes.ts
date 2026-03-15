export type SessionStatus = 'active' | 'paused' | 'ended';

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
  lastLaunchedAt?: string;
  notes?: string;
}
