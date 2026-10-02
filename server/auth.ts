/**
 * HoruScope - Server-side authentication (Node-only).
 *
 * Passwords are verified here with the same salted SHA-256 key-stretching
 * scheme the client historically used. All trust decisions happen server-side.
 *
 * Sessions are opaque tokens persisted via server/sessions.ts (Turso when
 * configured, memory otherwise). The session travels as an httpOnly Secure
 * SameSite cookie; the Authorization Bearer header is still accepted for
 * programmatic API/MCP access.
 */

import { webcrypto, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { sessionStore } from './sessions.ts';

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
// Session cookies
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = 'horuscope_session';
const SESSION_COOKIE_MAX_AGE = 12 * 60 * 60; // 12h in seconds

export function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/${secure}; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}`
  );
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/${secure}; SameSite=Lax; Max-Age=0`
  );
}

function cookieToken(req: Request): string | null {
  const header = req.headers.cookie || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Session token from cookie (preferred) or Authorization header. */
export function requestToken(req: Request): string | null {
  return cookieToken(req) || bearerToken(req);
}

// ---------------------------------------------------------------------------
// Middleware factory — wired with a live user resolver to avoid import cycles
// ---------------------------------------------------------------------------

export interface LiveUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  session?: {
    token: string;
    userId: string;
    email: string;
    role: string;
  };
}

export function createAuthMiddleware(resolveUser: (userId: string) => LiveUser | undefined): {
  requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
  requireOwner: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
} {
  /**
   * Rejects unless a valid session exists AND the user still exists with
   * APPROVED status. The role is refreshed from the live user record, so
   * demotions and deletions take effect immediately (no stale privileges).
   */
  async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const session = await sessionStore.get(requestToken(req));
    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid session required.' });
      return;
    }
    const user = resolveUser(session.userId);
    if (!user || user.status !== 'APPROVED') {
      await sessionStore.revoke(session.token);
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Account is no longer active.' });
      return;
    }
    req.session = {
      token: session.token,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  }

  function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.session || req.session.role !== 'OWNER') {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Owner role required.' });
      return;
    }
    next();
  }

  return { requireAuth, requireOwner };
}

// Re-exported for routes that manage sessions directly.
export { sessionStore };
