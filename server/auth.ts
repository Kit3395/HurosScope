/**
 * HoruScope - Server-side authentication (Node-only).
 *
 * Replaces the previous client-side-only credential verification. Passwords
 * are verified here with the same salted SHA-256 key-stretching scheme the
 * client historically used, so pre-existing hashes keep verifying — but all
 * trust decisions now happen server-side and every /api route (except the
 * public login/health/access-request-submit endpoints) requires a Bearer
 * session token.
 *
 * Sessions are in-memory opaque tokens. They do not survive a server restart
 * by design — clients simply log in again.
 */

import { webcrypto, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const subtle = webcrypto.subtle;

// ---------------------------------------------------------------------------
// Password hashing — byte-for-byte compatible with src/security/crypto.ts
// ---------------------------------------------------------------------------

const PEPPER = 'HORUSCOPE_SOVEREIGN_AUTH_SALT_V1';
const HASH_ROUNDS = 1000;

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  let current: Uint8Array = enc.encode(`${salt}:${password}:${PEPPER}`);

  for (let i = 0; i < HASH_ROUNDS; i++) {
    const hashBuffer = await subtle.digest('SHA-256', current);
    const combined = new Uint8Array(hashBuffer.byteLength + salt.length);
    combined.set(new Uint8Array(hashBuffer), 0);
    combined.set(enc.encode(salt), hashBuffer.byteLength);
    current = combined;
  }

  const finalHash = await subtle.digest('SHA-256', current);
  return Array.from(new Uint8Array(finalHash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

export async function verifyPassword(
  passwordCandidate: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  if (!passwordCandidate || !salt || !expectedHash) return false;
  try {
    const candidateHash = await hashPassword(passwordCandidate, salt);
    const a = Buffer.from(candidateHash, 'utf8');
    const b = Buffer.from(expectedHash, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * The hardcoded password hash that shipped in the public repo (used for the
 * seeded owner and as the default for created users). Any account still
 * carrying it must be treated as compromised — it can never be logged in
 * with and is force-rotated from the bootstrap secret on boot.
 */
export const COMPROMISED_DEFAULT_HASH =
  'c3fd23514a9c3b03255bbc3a5cb1c01d21c5746778db75c41c467f454c6d87f5';

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface Session {
  token: string;
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  lastSeenAt: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const sessions = new Map<string, Session>();

export function createSession(userId: string, email: string, role: string): Session {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  const session: Session = { token, userId, email, role, createdAt: now, lastSeenAt: now };
  sessions.set(token, session);
  return session;
}

export function getSession(token: string | undefined | null): Session | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  session.lastSeenAt = Date.now();
  return session;
}

export function revokeSession(token: string | undefined | null): void {
  if (token) sessions.delete(token);
}

export function revokeSessionsForUser(userId: string): void {
  for (const [token, session] of sessions) {
    if (session.userId === userId) sessions.delete(token);
  }
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
  session?: Session;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Rejects the request unless a valid Bearer session token is present. */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const session = getSession(bearerToken(req));
  if (!session) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid session required.' });
    return;
  }
  req.session = session;
  next();
}

/** Rejects unless the session belongs to an OWNER. Must run after requireAuth. */
export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.session || req.session.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Owner role required.' });
    return;
  }
  next();
}
