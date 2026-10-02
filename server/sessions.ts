/**
 * HoruScope - Server-side session store (Node-only).
 *
 * Sessions are opaque 256-bit tokens persisted in Turso (table
 * horuscope_sessions) so they survive restarts and work across instances.
 * Falls back to an in-memory Map when Turso is not configured.
 *
 * A short-lived in-memory cache (30s) avoids a DB round-trip on every API
 * call; revocations invalidate the cache immediately.
 */

import { randomBytes } from 'node:crypto';

export interface SessionRecord {
  token: string;
  userId: string;
  email: string;
  role: string;
  createdAt: number;
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const CACHE_TTL_MS = 30 * 1000;

const SESSIONS_TABLE = 'horuscope_sessions';

interface SessionBackend {
  create(record: SessionRecord): Promise<void>;
  get(token: string): Promise<SessionRecord | null>;
  revoke(token: string): Promise<void>;
  revokeForUser(userId: string): Promise<void>;
}

class MemorySessionBackend implements SessionBackend {
  private sessions = new Map<string, SessionRecord>();
  async create(record: SessionRecord): Promise<void> {
    this.sessions.set(record.token, record);
  }
  async get(token: string): Promise<SessionRecord | null> {
    return this.sessions.get(token) || null;
  }
  async revoke(token: string): Promise<void> {
    this.sessions.delete(token);
  }
  async revokeForUser(userId: string): Promise<void> {
    for (const [t, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(t);
    }
  }
}

class TursoSessionBackend implements SessionBackend {
  private client: any = null;
  private ready: Promise<void> | null = null;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async getClient(): Promise<any> {
    if (this.client) return this.client;
    const { createClient } = await import('@libsql/client');
    this.client = createClient({ url: this.url, authToken: this.token });
    return this.client;
  }

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        const client = await this.getClient();
        await client.execute(
          `CREATE TABLE IF NOT EXISTS ${SESSIONS_TABLE} (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER NOT NULL)`
        );
        await client.execute(
          `CREATE INDEX IF NOT EXISTS idx_${SESSIONS_TABLE}_user ON ${SESSIONS_TABLE} (user_id)`
        );
      })().catch((err) => {
        console.error('[SESSIONS] Turso init failed:', (err as Error)?.message || err);
        this.ready = null;
        throw err;
      });
    }
    return this.ready;
  }

  async create(record: SessionRecord): Promise<void> {
    await this.ensureReady();
    const client = await this.getClient();
    await client.execute({
      sql: `INSERT OR REPLACE INTO ${SESSIONS_TABLE} (token, user_id, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [record.token, record.userId, record.email, record.role, record.createdAt],
    });
  }

  async get(token: string): Promise<SessionRecord | null> {
    try {
      await this.ensureReady();
      const client = await this.getClient();
      const rs = await client.execute({
        sql: `SELECT token, user_id, email, role, created_at FROM ${SESSIONS_TABLE} WHERE token = ?`,
        args: [token],
      });
      const row = rs.rows?.[0] as any;
      if (!row) return null;
      return {
        token: String(row.token),
        userId: String(row.user_id),
        email: String(row.email),
        role: String(row.role),
        createdAt: Number(row.created_at),
      };
    } catch (err) {
      console.error('[SESSIONS] get failed:', (err as Error)?.message || err);
      return null;
    }
  }

  async revoke(token: string): Promise<void> {
    try {
      await this.ensureReady();
      const client = await this.getClient();
      await client.execute({
        sql: `DELETE FROM ${SESSIONS_TABLE} WHERE token = ?`,
        args: [token],
      });
    } catch (err) {
      console.error('[SESSIONS] revoke failed:', (err as Error)?.message || err);
    }
  }

  async revokeForUser(userId: string): Promise<void> {
    try {
      await this.ensureReady();
      const client = await this.getClient();
      await client.execute({
        sql: `DELETE FROM ${SESSIONS_TABLE} WHERE user_id = ?`,
        args: [userId],
      });
    } catch (err) {
      console.error('[SESSIONS] revokeForUser failed:', (err as Error)?.message || err);
    }
  }

  /** Delete expired sessions opportunistically. */
  async pruneExpired(): Promise<void> {
    try {
      await this.ensureReady();
      const client = await this.getClient();
      await client.execute({
        sql: `DELETE FROM ${SESSIONS_TABLE} WHERE created_at < ?`,
        args: [Date.now() - SESSION_TTL_MS],
      });
    } catch {
      // best effort
    }
  }
}

class SessionStore {
  private backend: SessionBackend;
  private cache = new Map<string, { record: SessionRecord; cachedAt: number }>();
  private pruneTimer: NodeJS.Timeout | null = null;

  constructor() {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (url && token) {
      console.log('[SESSIONS] Using Turso session backend.');
      const turso = new TursoSessionBackend(url, token);
      this.backend = turso;
      // Prune expired sessions hourly (best effort).
      this.pruneTimer = setInterval(() => void turso.pruneExpired(), 60 * 60 * 1000);
      this.pruneTimer.unref?.();
    } else {
      console.log('[SESSIONS] Turso not configured — sessions live in process memory only.');
      this.backend = new MemorySessionBackend();
    }
  }

  async create(userId: string, email: string, role: string): Promise<SessionRecord> {
    const record: SessionRecord = {
      token: randomBytes(32).toString('hex'),
      userId,
      email,
      role,
      createdAt: Date.now(),
    };
    await this.backend.create(record);
    this.cache.set(record.token, { record, cachedAt: Date.now() });
    return record;
  }

  async get(token: string | undefined | null): Promise<SessionRecord | null> {
    if (!token) return null;
    const cached = this.cache.get(token);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      const record = cached.record;
      if (Date.now() - record.createdAt > SESSION_TTL_MS) {
        this.cache.delete(token);
        await this.backend.revoke(token);
        return null;
      }
      return record;
    }
    const record = await this.backend.get(token);
    if (!record) {
      this.cache.delete(token);
      return null;
    }
    if (Date.now() - record.createdAt > SESSION_TTL_MS) {
      this.cache.delete(token);
      await this.backend.revoke(token);
      return null;
    }
    this.cache.set(token, { record, cachedAt: Date.now() });
    return record;
  }

  async revoke(token: string | undefined | null): Promise<void> {
    if (!token) return;
    this.cache.delete(token);
    await this.backend.revoke(token);
  }

  async revokeForUser(userId: string): Promise<void> {
    for (const [t, s] of this.cache) {
      if (s.record.userId === userId) this.cache.delete(t);
    }
    await this.backend.revokeForUser(userId);
  }
}

export const sessionStore = new SessionStore();
