/**
 * HoruScope - Durable snapshot store (Node-only; never bundled for the browser).
 *
 * The server's authoritative state (user accounts, access requests) is
 * serialized as one JSON snapshot. A SnapshotStore persists that blob durably
 * so state survives Cloud Run instance replacement (the local filesystem alone
 * cannot — it is ephemeral per instance).
 *
 * Backends:
 *  - FileSnapshotStore: local JSON file (dev / single-box deploys).
 *  - TursoSnapshotStore: libSQL/Turso hosted database, one row holding the
 *    snapshot. Needs TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 *
 * A single JSON blob (rather than relational tables) is a deliberate tradeoff
 * for this app's scale — single operator, low write volume. Last-writer-wins
 * applies if multiple instances ever write concurrently.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface SnapshotStore {
  /** Human-readable backend name for logs. */
  name: string;
  /** Returns the raw JSON snapshot, or null when nothing is stored yet. */
  load(): Promise<string | null>;
  /** Persists the raw JSON snapshot. Must never throw — log and continue. */
  save(json: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local file backend
// ---------------------------------------------------------------------------

export class FileSnapshotStore implements SnapshotStore {
  readonly name: string;

  constructor(private readonly filePath: string) {
    this.name = `file (${filePath})`;
  }

  async load(): Promise<string | null> {
    try {
      if (!fs.existsSync(this.filePath)) return null;
      return fs.readFileSync(this.filePath, 'utf8');
    } catch (err) {
      console.error(`[STORAGE] File store load failed:`, (err as Error)?.message || err);
      return null;
    }
  }

  async save(json: string): Promise<void> {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, json);
    } catch (err) {
      console.error(`[STORAGE] File store save failed:`, (err as Error)?.message || err);
    }
  }
}

// ---------------------------------------------------------------------------
// Turso (libSQL) backend — one table, one row.
// ---------------------------------------------------------------------------

const TURSO_TABLE = 'horuscope_state';
const TURSO_ROW_ID = 'primary';

export class TursoSnapshotStore implements SnapshotStore {
  readonly name = 'turso';
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
          `CREATE TABLE IF NOT EXISTS ${TURSO_TABLE} (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updated_at TEXT NOT NULL)`,
        );
      })().catch((err) => {
        console.error('[STORAGE] Turso init failed:', (err as Error)?.message || err);
        this.ready = null;
        throw err;
      });
    }
    return this.ready;
  }

  async load(): Promise<string | null> {
    try {
      await this.ensureReady();
      const client = await this.getClient();
      const rs = await client.execute({
        sql: `SELECT snapshot FROM ${TURSO_TABLE} WHERE id = ?`,
        args: [TURSO_ROW_ID],
      });
      const row = rs.rows?.[0] as any;
      return row?.snapshot ? String(row.snapshot) : null;
    } catch (err) {
      console.error('[STORAGE] Turso load failed:', (err as Error)?.message || err);
      return null;
    }
  }

  async save(json: string): Promise<void> {
    try {
      await this.ensureReady();
      const client = await this.getClient();
      await client.execute({
        sql: `INSERT INTO ${TURSO_TABLE} (id, snapshot, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at`,
        args: [TURSO_ROW_ID, json, new Date().toISOString()],
      });
    } catch (err) {
      console.error('[STORAGE] Turso save failed:', (err as Error)?.message || err);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSnapshotStore(filePath: string): SnapshotStore {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (url && token) {
    console.log('[STORAGE] Using Turso snapshot backend.');
    return new TursoSnapshotStore(url, token);
  }
  console.log('[STORAGE] TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set — using local file backend.');
  return new FileSnapshotStore(filePath);
}
