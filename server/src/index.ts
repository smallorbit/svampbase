import express from 'express';
import cors from 'cors';
import { getAllSessions, getSession, upsertSession, deleteSession } from './sessions';
import { launchNewSession, resumeSession } from './terminal';
import type { Session, SessionStatus } from './types';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

function randomChars(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// GET /sessions — list all
app.get('/sessions', (_req, res) => {
  res.json(getAllSessions());
});

// POST /sessions — create
app.post('/sessions', (req, res) => {
  const { name, taskIds, notes, launch } = req.body as {
    name?: string;
    taskIds?: string[];
    notes?: string;
    launch?: boolean;
  };

  const now = new Date().toISOString();
  const sessionName = name?.trim() || `svampbase-${randomChars(8)}`;

  const session: Session = {
    id: crypto.randomUUID(),
    name: sessionName,
    status: 'active',
    taskIds: taskIds ?? [],
    createdAt: now,
    updatedAt: now,
    notes: notes,
  };

  upsertSession(session);

  if (launch) {
    try {
      launchNewSession(session.name);
      session.lastLaunchedAt = new Date().toISOString();
      session.status = 'active';
      upsertSession(session);
    } catch (err) {
      // Terminal launch failed — session still created
      console.error('Terminal launch failed:', err);
    }
  }

  res.status(201).json(session);
});

// GET /sessions/:id
app.get('/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

// PATCH /sessions/:id
app.patch('/sessions/:id', (req, res) => {
  const existing = getSession(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const { status, taskIds, notes, name } = req.body as {
    status?: SessionStatus;
    taskIds?: string[];
    notes?: string;
    name?: string;
  };

  const updated: Session = {
    ...existing,
    ...(status !== undefined && { status }),
    ...(taskIds !== undefined && { taskIds }),
    ...(notes !== undefined && { notes }),
    ...(name !== undefined && { name }),
    updatedAt: new Date().toISOString(),
  };

  upsertSession(updated);
  res.json(updated);
});

// DELETE /sessions/:id
app.delete('/sessions/:id', (req, res) => {
  const deleted = deleteSession(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.status(204).send();
});

// POST /sessions/:id/launch
app.post('/sessions/:id/launch', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const isFirstLaunch = !session.lastLaunchedAt;
  const now = new Date().toISOString();

  try {
    if (isFirstLaunch) {
      launchNewSession(session.name);
    } else {
      resumeSession(session.name);
    }
  } catch (err) {
    console.error('Terminal launch failed:', err);
    res.status(500).json({ error: 'Failed to launch terminal' });
    return;
  }

  const updated: Session = {
    ...session,
    status: 'active',
    lastLaunchedAt: now,
    updatedAt: now,
  };

  upsertSession(updated);
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`Svampbase server running on http://localhost:${PORT}`);
});
