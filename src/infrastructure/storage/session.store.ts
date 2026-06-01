/**
 * Session persistence — Redis when REDIS_URL is set, otherwise in-memory
 */

import type { CVWorkflowState } from '@/src/ai/graphs/state';

export interface SessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  jobDescriptionRaw: string;
  workflowState: Partial<CVWorkflowState>;
}

/** Survive Next.js dev HMR — module-level Maps are wiped on hot reload */
const globalForSessions = globalThis as typeof globalThis & {
  __jobcvSessionStore?: Map<string, SessionRecord>;
};

function getMemoryStore(): Map<string, SessionRecord> {
  if (!globalForSessions.__jobcvSessionStore) {
    globalForSessions.__jobcvSessionStore = new Map();
  }
  return globalForSessions.__jobcvSessionStore;
}

let redisClient: import('ioredis').default | null = null;

async function getRedis(): Promise<import('ioredis').default | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redisClient) {
    const Redis = (await import('ioredis')).default;
    redisClient = new Redis(url);
  }
  return redisClient;
}

const SESSION_PREFIX = 'jobcv:session:';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function createSession(jobDescriptionRaw: string): Promise<SessionRecord> {
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const record: SessionRecord = {
    id,
    createdAt: now,
    updatedAt: now,
    jobDescriptionRaw,
    workflowState: {
      sessionId: id,
      jobDescriptionRaw,
      route: 'parse',
      errors: [],
    },
  };
  await saveSession(record);
  return record;
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get(`${SESSION_PREFIX}${id}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SessionRecord;
  }
  const mem = getMemoryStore();
  const found = mem.get(id) ?? null;
  return found;
}

export async function saveSession(record: SessionRecord): Promise<void> {
  record.updatedAt = new Date().toISOString();
  const redis = await getRedis();
  if (redis) {
    await redis.setex(`${SESSION_PREFIX}${record.id}`, TTL_SECONDS, JSON.stringify(record));
  } else {
    getMemoryStore().set(record.id, record);
  }
}

export async function updateWorkflowState(
  sessionId: string,
  patch: Partial<CVWorkflowState>
): Promise<SessionRecord | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  session.workflowState = { ...session.workflowState, ...patch, sessionId };
  await saveSession(session);
  return session;
}
