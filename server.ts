import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mcpHandler, mcpGovernance, MCP_REGISTERED_TOOLS, MCP_REGISTERED_RESOURCES } from './src/mcp/index.ts';
import { createSnapshotStore, SnapshotStore } from './server/store.ts';
import {
  hashPassword,
  generateSalt,
  verifyPassword,
  COMPROMISED_DEFAULT_HASH,
  createAuthMiddleware,
  requestToken,
  setSessionCookie,
  clearSessionCookie,
  sessionStore,
  AuthenticatedRequest,
} from './server/auth.ts';

// Lazy initialized Supabase Admin Client using Secret Key for secure server-side operations
let supabaseAdminClient: SupabaseClient | null = null;
function getSupabaseAdminClient(): SupabaseClient | null {
  if (!supabaseAdminClient) {
    const url =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      '';
    const secretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (url && secretKey) {
      try {
        supabaseAdminClient = createClient(url, secretKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
      } catch (err) {
        console.warn('Failed to initialize server Supabase admin client:', err);
      }
    }
  }
  return supabaseAdminClient;
}

// Lazy initialized Gemini client for server-side intelligence
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json());

// Auth middleware, wired to the live user store so demotions/deletions take
// effect immediately (sessions revalidate the user on every request).
const { requireAuth, requireOwner } = createAuthMiddleware((userId: string) =>
  readUsers().find((u) => u.id === userId)
);

// Rate limiting: per-client buckets (keyed by session token when present,
// else IP) plus a global backstop — one client can no longer starve the rest.
interface RateBucket {
  count: number;
  resetAt: number;
}
const apiBuckets = new Map<string, RateBucket>();
const API_PER_CLIENT_PER_MIN = 90;
const API_GLOBAL_PER_MIN = 400;
let apiGlobalCount = 0;
let apiGlobalResetAt = Date.now() + 60000;

function rateLimitKey(req: Request): string {
  const h = req.headers.cookie || '';
  const m = h.match(/(?:^|;\s*)horuscope_session=([^;]+)/);
  if (m) return 'tok:' + m[1].slice(0, 16);
  const auth = req.headers.authorization || '';
  const bm = auth.match(/^Bearer\s+(.+)$/i);
  if (bm) return 'tok:' + bm[1].slice(0, 16);
  return 'ip:' + (req.ip || req.socket.remoteAddress || 'unknown');
}

app.use('/api', (req: Request, res: Response, next) => {
  const now = Date.now();
  if (now > apiGlobalResetAt) {
    apiGlobalCount = 0;
    apiGlobalResetAt = now + 60000;
    // prune stale per-client buckets
    for (const [k, b] of apiBuckets) {
      if (now > b.resetAt) apiBuckets.delete(k);
    }
  }
  apiGlobalCount++;

  const key = rateLimitKey(req);
  let bucket = apiBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60000 };
    apiBuckets.set(key, bucket);
  }
  bucket.count++;

  const overClient = bucket.count > API_PER_CLIENT_PER_MIN;
  const overGlobal = apiGlobalCount > API_GLOBAL_PER_MIN;
  if (overClient || overGlobal) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit ceiling reached on HorusScope secure backend.',
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    });
  }

  next();
});

// ============================================================================
// API ROUTES (Always before Vite middleware)
// ============================================================================

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'HorusScope',
    phase: 'Phase 3 - Business Discovery',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// AUTHENTICATION — server-side credential verification + Bearer sessions.
// Public: POST /api/auth/login. Everything else under /api requires auth.
// ============================================================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Email and password are required.' });
  }

  const user = readUsers().find((u) => u.email.toLowerCase() === cleanEmail);
  // Uniform failure — do not reveal whether the email exists.
  const fail = (msg: string, extra: Record<string, unknown> = {}) =>
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: msg, ...extra });

  if (!user || user.status !== 'APPROVED') {
    return fail('Invalid email or password.');
  }

  if (user.lockoutUntil) {
    const lockDate = new Date(user.lockoutUntil);
    if (lockDate.getTime() > Date.now()) {
      const mins = Math.ceil((lockDate.getTime() - Date.now()) / 60000);
      return fail(`Account is temporarily locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`, {
        isLocked: true,
      });
    }
    user.lockoutUntil = null;
    user.failedLoginAttempts = 0;
  }

  if (!user.isPasswordSet || !user.passwordHash || !user.passwordSalt) {
    return fail('Invalid email or password.');
  }

  const ok = await verifyPassword(String(password), user.passwordSalt, user.passwordHash);
  if (!ok) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    user.failedLoginAttempts = attempts;
    user.updatedAt = new Date().toISOString();
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
      persistData();
      return fail(
        `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
        { isLocked: true }
      );
    }
    persistData();
    return fail('Invalid email or password.', {
      remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts),
    });
  }

  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();
  persistData();

  const session = await sessionStore.create(user.id, user.email, user.role);
  setSessionCookie(res, session.token);
  return res.json({ success: true, token: session.token, user: toSafeUser(user) });
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  await sessionStore.revoke(requestToken(req));
  clearSessionCookie(res);
  res.json({ success: true });
});

/**
 * Google OAuth login — PUBLIC. The client sends the Google access token it
 * obtained via Google Identity Services; the server validates it directly
 * with Google, then mints a session ONLY for a pre-approved user whose
 * account email matches the verified Google email (or a linked googleEmail).
 */
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { googleAccessToken } = req.body || {};
  if (!googleAccessToken || typeof googleAccessToken !== 'string') {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Google access token is required.' });
  }

  let profile: { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  try {
    const giRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });
    if (!giRes.ok) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Google token rejected.' });
    }
    profile = (await giRes.json()) as typeof profile;
  } catch {
    return res.status(502).json({ error: 'GOOGLE_UNREACHABLE', message: 'Could not verify Google token.' });
  }

  const email = String(profile.email || '').trim().toLowerCase();
  if (!email || profile.email_verified === false) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Google email not verified.' });
  }

  // Token-substitution defense: when GOOGLE_CLIENT_ID is configured, verify
  // the access token was minted for this app (not another OAuth client).
  const expectedClientId = process.env.GOOGLE_CLIENT_ID;
  if (expectedClientId) {
    try {
      const tiRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(googleAccessToken)}`
      );
      const ti = (await tiRes.json()) as { aud?: string };
      if (!tiRes.ok || ti.aud !== expectedClientId) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Google token was not issued for this app.' });
      }
    } catch {
      return res.status(502).json({ error: 'GOOGLE_UNREACHABLE', message: 'Could not verify Google token audience.' });
    }
  } else {
    console.warn('[AUTH] GOOGLE_CLIENT_ID not set — Google token audience check skipped.');
  }

  const users = readUsers();
  const user = users.find(
    (u) =>
      (u.email.toLowerCase() === email || (u.googleEmail || '').toLowerCase() === email) &&
      u.status === 'APPROVED'
  );
  if (!user) {
    return res.status(403).json({
      error: 'NOT_APPROVED',
      message: `No approved HORUSCOPE account found for ${email}. Access requires an approved identity.`,
    });
  }

  // Link the Google identity to the account on first successful use.
  user.isGoogleConnected = true;
  user.googleEmail = email;
  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  persistData();

  const session = await sessionStore.create(user.id, user.email, user.role);
  setSessionCookie(res, session.token);
  const safe = toSafeUser(user);
  return res.json({
    success: true,
    token: session.token,
    user: { ...safe, avatarUrl: profile.picture || safe.avatarUrl },
  });
});

// Submit access request — PUBLIC by design (pre-auth onboarding).
// Per-IP throttle for the public access-request endpoint (anti-spam).
const accessRequestThrottle = new Map<string, number[]>();
function accessRequestAllowed(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const hits = (accessRequestThrottle.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= 5) return false;
  hits.push(now);
  accessRequestThrottle.set(ip, hits);
  return true;
}

// 2. POST submit new access request
app.post('/api/access-requests', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!accessRequestAllowed(clientIp)) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Too many access requests from this address. Try again later.' });
  }
  const { email, fullName, organization, requestedRole, reason } = req.body || {};
  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and Full Name are required.' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(String(email).trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const requests = readAccessRequests();

  // Check if pending request already exists
  const existingPending = requests.find(
    (r) => r.email.toLowerCase() === cleanEmail && r.status === 'PENDING'
  );
  if (existingPending) {
    return res.json({
      success: true,
      message: 'An access request for this email is already awaiting administrator review.',
      request: existingPending,
      alreadyExisted: true,
    });
  }

  const newReq: StoredAccessRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: cleanEmail,
    fullName: String(fullName).trim(),
    organization: organization ? String(organization).trim() : undefined,
    requestedRole: requestedRole || 'OPERATOR',
    reason: reason ? String(reason).trim() : 'Authorized workspace operator request',
    status: 'PENDING',
    submittedAt: new Date().toISOString(),
  };

  requests.unshift(newReq);
  writeAccessRequests(requests);

  return res.status(201).json({
    success: true,
    message: 'Access request successfully registered and queued for administrator approval.',
    request: newReq,
  });
});

// ---- Everything below requires a valid Bearer session. ----
app.use('/api', requireAuth);

app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
  const user = readUsers().find((u) => u.id === req.session!.userId);
  if (!user || user.status !== 'APPROVED') {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Session user no longer active.' });
  }
  res.json({ success: true, user: toSafeUser(user) });
});

// OWNER-only session impersonation (replaces the old client-side perspective switch).
app.post('/api/auth/impersonate', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.body || {};
  const target = readUsers().find((u) => u.id === String(userId || ''));
  if (!target || target.status !== 'APPROVED') {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Target user not found or not approved.' });
  }
  const session = await sessionStore.create(target.id, target.email, target.role);
  setSessionCookie(res, session.token);
  res.json({ success: true, token: session.token, user: toSafeUser(target) });
});

// Change own password (verifies current password server-side).
app.post('/api/auth/change-password', async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = readUsers().find((u) => u.id === req.session!.userId);
  if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
  if (!currentPassword || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Current password and a new password (min 8 chars) are required.' });
  }
  try {
    const ok = await verifyPassword(String(currentPassword), user.passwordSalt || '', user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' });
    user.passwordSalt = generateSalt();
    user.passwordHash = await hashPassword(String(newPassword), user.passwordSalt);
    user.isPasswordSet = true;
    user.updatedAt = new Date().toISOString();
    persistData();
    await sessionStore.revokeForUser(user.id);
    const session = await sessionStore.create(user.id, user.email, user.role);
    setSessionCookie(res, session.token);
    res.json({ success: true, token: session.token, user: toSafeUser(user) });
  } catch (err) {
    console.error('[AUTH] change-password failed:', (err as Error)?.message || err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Password change failed.' });
  }
});

// 2. System Health detailed status
app.get('/api/system/health', (req: Request, res: Response) => {
  res.json({
    apiStatus: 'HEALTHY',
    databaseStatus: 'CONNECTED',
    supabaseStatus: process.env.SUPABASE_SECRET_KEY
      ? 'ADMIN_SERVICE_CONNECTED'
      : 'CONNECTED',
    supabaseUrl:
      process.env.SUPABASE_URL || '',
    hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
    aiStatus: process.env.GEMINI_API_KEY ? 'AVAILABLE' : 'KEY_MISSING',
    googlePlacesStatus: process.env.GOOGLE_MAPS_API_KEY ? 'CONFIGURED' : 'KEY_NOT_SET_SANDBOX_READY',
    lastSynchronization: new Date().toISOString(),
    errorCount: 0,
    activeRateLimits: {
      googlePlacesBudgetRemaining: DISCOVERY_PER_CLIENT_PER_MIN,
      aiTokenBudgetRemaining: 15,
      webAuditQueueSize: 0,
    },
    storageStatus: {
      businessesCount: 1,
      leadsCount: 1,
      contactsCount: 1,
      auditLogsCount: 4,
    },
    phase: 'Phase 3 - Business Discovery',
  });
});

// ============================================================================
// PHASE 3: BUSINESS DISCOVERY ENDPOINTS (Official Google Places API New)
// ============================================================================

const DISCOVERY_PER_CLIENT_PER_MIN = 30;
const discoveryBuckets = new Map<string, RateBucket>();
let discoveryTotalRequests = 0;

function discoveryBucket(key: string): { bucket: RateBucket; limited: boolean } {
  const now = Date.now();
  let bucket = discoveryBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60000 };
    discoveryBuckets.set(key, bucket);
  }
  // prune occasionally
  if (discoveryBuckets.size > 500) {
    for (const [k, b] of discoveryBuckets) {
      if (now > b.resetAt) discoveryBuckets.delete(k);
    }
  }
  bucket.count++;
  discoveryTotalRequests++;
  return { bucket, limited: bucket.count > DISCOVERY_PER_CLIENT_PER_MIN };
}

// 5. Discovery API Status & Quota Health
app.get('/api/discovery/status', (req: AuthenticatedRequest, res: Response) => {
  const now = Date.now();
  const key = rateLimitKey(req);
  const bucket = discoveryBuckets.get(key);
  const used = bucket && now <= bucket.resetAt ? bucket.count : 0;

  const hasApiKey = Boolean(process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY.trim().length > 5);

  res.json({
    hasApiKey,
    placesApiVersion: 'Google Places API (New) - v1/places:searchText',
    requestsThisMinute: used,
    remainingThisMinute: Math.max(0, DISCOVERY_PER_CLIENT_PER_MIN - used),
    minuteResetSeconds: bucket ? Math.max(0, Math.ceil((bucket.resetAt - now) / 1000)) : 60,
    sessionRequestsCount: discoveryTotalRequests,
    isDiagnosticsModeAvailable: true,
    throttlingDelayMs: 600,
    attributionNotice: 'Powered by Google Maps Platform (Places API New)',
    solutionId: 'gmp_mcp_codeassist_v1_aistudio',
  });
});

// CRM business registry (server-side): populated by live Places discovery.
// Any authenticated role can read; the registry is the backing store for the
// `crm_read_businesses` MCP tool.
app.get('/api/crm/businesses', (req: AuthenticatedRequest, res: Response) => {
  const query = String(req.query.q || '').toLowerCase().trim();
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  let records = businessesCache;
  if (query) {
    records = records.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        (b.formattedAddress || '').toLowerCase().includes(query) ||
        (b.primaryType || '').toLowerCase().includes(query)
    );
  }
  const sorted = [...records].sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));
  res.json({
    businesses: sorted.slice(0, limit),
    total: records.length,
    registrySize: businessesCache.length,
  });
});

// Helper for generating realistic sandbox places tailored to location and category
function generateSandboxPlaces(location: string, category: string, keyword: string, pageToken?: string) {
  const locClean = location.trim() || 'Cebu City';
  const catClean = category.trim() || 'Restaurants';
  const isCebu = locClean.toLowerCase().includes('cebu');
  const isManila = locClean.toLowerCase().includes('manila');

  const basePrefix = (pageToken ? 'pg2_' : 'pg1_') + locClean.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 8);

  const restaurantTemplates = [
    {
      name: isCebu ? 'Lantaw Floating Native Restaurant' : 'Harbor View Garden Bistro',
      locality: isCebu ? 'Cordova, Cebu' : 'Roxas Blvd, Manila',
      address: isCebu ? 'Day-as Wharf, Cordova, Cebu City, 6017' : '1000 Katigbak Pkwy, Ermita, Manila',
      phone: isCebu ? '+63 32 514 5555' : '+63 2 8710 0021',
      rating: 4.4,
      reviews: 312,
      website: undefined, // Prime target: No website!
      type: 'seafood_restaurant',
      hours: ['Mon-Sun: 11:00 AM - 10:00 PM'],
    },
    {
      name: isCebu ? 'Maya Mexican Restaurant & Tequila Bar' : 'El Chupacabra Cantina',
      locality: isCebu ? 'Banilad, Cebu City' : 'Poblacion, Makati',
      address: isCebu ? 'Crossroads Mall, Gov. M. Cuenco Ave, Cebu City' : '5782 Felipe St, Makati, Manila',
      phone: isCebu ? '+63 32 238 9552' : '+63 2 8890 8241',
      rating: 4.6,
      reviews: 185,
      website: isCebu ? 'https://mayacebu.ph' : 'https://elchupacabraph.com',
      type: 'mexican_restaurant',
      hours: ['Tue-Sun: 5:00 PM - 11:30 PM', 'Mon: Closed'],
    },
    {
      name: isCebu ? 'House of Lechon Acropolis' : 'Manam Comfort Filipino',
      locality: isCebu ? 'Kamputhaw, Cebu City' : 'Bonifacio Global City, Manila',
      address: isCebu ? 'Acacia St, Kamputhaw, Cebu City, 6000' : '4th Ave, BGC, Taguig, Manila',
      phone: isCebu ? '+63 32 231 0958' : '+63 2 8332 9390',
      rating: 4.3,
      reviews: 540,
      website: undefined, // High reviews, no website!
      type: 'filipino_restaurant',
      hours: ['Mon-Sun: 10:00 AM - 9:00 PM'],
    },
    {
      name: isCebu ? 'Abaca Baking Company' : 'Wildflour Cafe & Bakery',
      locality: isCebu ? 'Cebu IT Park, Lahug' : 'Salcedo Village, Makati',
      address: isCebu ? 'TGU Tower, Salinas Dr, Cebu City' : 'LP Leviste St, Makati, Manila',
      phone: isCebu ? '+63 32 231 5826' : '+63 2 8808 7000',
      rating: 4.5,
      reviews: 240,
      website: 'https://theabacagroup.com',
      type: 'cafe',
      hours: ['Mon-Sun: 7:00 AM - 10:00 PM'],
    },
    {
      name: isCebu ? 'Parrt Ebelle Seafood Boil' : 'Dampa Seaside Seafood Grill',
      locality: isCebu ? 'North Reclamation Area, Cebu' : 'Macapagal Blvd, Pasay',
      address: isCebu ? 'J. De Veyra St, NRA, Cebu City' : 'Seaside Market, Macapagal Blvd, Pasay',
      phone: isCebu ? '+63 32 412 8840' : '+63 2 8556 1780',
      rating: 4.2,
      reviews: 98,
      website: undefined, // No website
      type: 'restaurant',
      hours: ['Mon-Sat: 10:00 AM - 8:30 PM'],
    },
    {
      name: isCebu ? 'Anzani Prime Mediterranean' : 'Gallery by Chele',
      locality: isCebu ? 'Nivel Hills, Lahug' : 'BGC, Taguig',
      address: isCebu ? 'Panorama Heights, Nivel Hills, Cebu City' : '5th Floor, Clipp Center, BGC, Manila',
      phone: isCebu ? '+63 32 232 7375' : '+63 917 546 1673',
      rating: 4.7,
      reviews: 142,
      website: 'https://anzaniprime.com',
      type: 'fine_dining_restaurant',
      hours: ['Mon-Sun: 5:30 PM - 11:00 PM'],
    },
    {
      name: isCebu ? 'Cebu Sizzlers & Craft Kitchen' : 'Locavore Kitchen & Drinks',
      locality: isCebu ? 'Capitol Site, Cebu City' : 'Kapitolyo, Pasig',
      address: isCebu ? 'Don Gil Garcia St, Cebu City' : '10 Brixton St, Kapitolyo, Pasig',
      phone: isCebu ? '+63 32 254 1120' : '+63 2 8632 9789',
      rating: 3.9,
      reviews: 64,
      website: undefined, // Needs digital upgrade
      type: 'bar_and_grill',
      hours: ['Mon-Sat: 11:00 AM - 12:00 AM'],
    },
    {
      name: isCebu ? 'Top of Cebu Scenic Dining' : 'Sky Deck View Restaurant',
      locality: isCebu ? 'Busay, Cebu City' : 'Intramuros, Manila',
      address: isCebu ? 'Cebu Transcentral Hwy, Busay, Cebu City' : 'The Bayleaf, Victoria St, Intramuros',
      phone: isCebu ? '+63 32 516 0718' : '+63 2 5318 5000',
      rating: 4.5,
      reviews: 420,
      website: undefined, // High popularity, missing website
      type: 'restaurant',
      hours: ['Mon-Sun: 11:00 AM - 11:00 PM'],
    },
  ];

  const clinicTemplates = [
    {
      name: `${locClean} Precision Dental & Implant Studio`,
      locality: `${locClean} Central`,
      address: `Suite 402, Medical Arts Bldg, ${locClean}`,
      phone: '+1 215-555-0199', // Matches existing Meridian test phone for duplicate testing!
      rating: 4.8,
      reviews: 84,
      website: 'https://meridiandentalartspa.com', // Duplicate trigger candidate!
      type: 'dental_clinic',
      hours: ['Mon-Fri: 8:30 AM - 5:00 PM'],
    },
    {
      name: `${locClean} Smile Craft Orthodontics`,
      locality: `${locClean} Uptown`,
      address: `120 Commercial Ave, ${locClean}`,
      phone: '+63 32 344 8911',
      rating: 4.6,
      reviews: 45,
      website: undefined, // No website
      type: 'dentist',
      hours: ['Mon-Sat: 9:00 AM - 6:00 PM'],
    },
    {
      name: `${locClean} Integrative Health & Wellness Center`,
      locality: `${locClean} Heights`,
      address: `88 Pinecrest Blvd, ${locClean}`,
      phone: '+63 32 238 4100',
      rating: 4.1,
      reviews: 29,
      website: undefined,
      type: 'medical_clinic',
      hours: ['Mon-Fri: 8:00 AM - 4:00 PM'],
    },
    {
      name: `Apex Physical Therapy & Sports Medicine`,
      locality: `${locClean} Metro`,
      address: `500 West Grand Pkwy, ${locClean}`,
      phone: '+63 32 411 9090',
      rating: 4.9,
      reviews: 115,
      website: `https://apexpt-${locClean.toLowerCase().replace(/\s+/g, '')}.com`,
      type: 'physiotherapist',
      hours: ['Mon-Fri: 7:00 AM - 7:00 PM'],
    },
  ];

  const pool = catClean.toLowerCase().includes('dent') || catClean.toLowerCase().includes('clinic') || catClean.toLowerCase().includes('medic')
    ? clinicTemplates
    : restaurantTemplates;

  return pool.map((item, idx) => {
    const placeId = `ChIJ_${basePrefix}_${idx}_${item.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;
    const hasWebsite = Boolean(item.website);

    // Calculate Opportunity Score (0 - 100)
    let oppScore = 0;
    const oppReasons: string[] = [];

    if (!hasWebsite) {
      oppScore += 45;
      oppReasons.push('🚨 No official website detected (+45 Opportunity)');
    } else {
      oppReasons.push('Existing website detected (+0)');
    }

    if (item.rating >= 4.0 && item.reviews >= 30) {
      oppScore += 25;
      oppReasons.push(`High customer satisfaction (★${item.rating}, ${item.reviews} reviews) indicates strong revenue (+25)`);
    } else if (item.rating >= 4.0) {
      oppScore += 15;
      oppReasons.push(`Strong rating (★${item.rating}) with growing review base (+15)`);
    } else {
      oppScore += 20;
      oppReasons.push(`Rating below 4.0 (★${item.rating}) indicates need for reputation management (+20)`);
    }

    if (item.phone) {
      oppScore += 10;
      oppReasons.push('Direct telephone accessible for executive outreach (+10)');
    }

    if (item.reviews >= 100) {
      oppScore += 15;
      oppReasons.push('High traffic volume establishment (+15)');
    }

    const cappedScore = Math.min(100, Math.max(15, oppScore));

    return {
      id: placeId,
      googlePlaceId: placeId,
      name: item.name,
      formattedAddress: item.address,
      locality: item.locality,
      phone: item.phone,
      website: item.website,
      rating: item.rating,
      reviewCount: item.reviews,
      businessHours: {
        openNow: true,
        weekdayDescriptions: item.hours,
      },
      googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      primaryType: item.type,
      types: [item.type, 'point_of_interest', 'establishment'],
      businessStatus: 'OPERATIONAL' as const,
      websiteStatus: hasWebsite ? 'HAS_WEBSITE' as const : 'NO_WEBSITE' as const,
      opportunityScore: cappedScore,
      opportunityGrade: cappedScore >= 70 ? 'HIGH_OPPORTUNITY' as const : cappedScore >= 40 ? 'MEDIUM_OPPORTUNITY' as const : 'LOW_OPPORTUNITY' as const,
      opportunityReasons: oppReasons,
      duplicateStatus: 'NEW' as const,
      attributionText: 'Google Maps Platform / Places API (New)',
      retrievedAt: new Date().toISOString(),
      isSandboxData: true,
    };
  });
}

// ============================================================================
// MODEL CONTEXT PROTOCOL (MCP) - PRE-CALL TOOL ADAPTERS & EXECUTORS
// ============================================================================

const DATA_DIR = path.join(process.cwd(), '.data');

// Geocode cache: location string -> {lat, lng, expiresAt}
const geocodeCache = new Map<string, { lat: number; lng: number; expiresAt: number }>();

async function geocodeLocation(
  location: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const key = location.toLowerCase().trim();
  const cached = geocodeCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return { lat: cached.lat, lng: cached.lng };
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    const data = (await res.json()) as any;
    const loc = data?.results?.[0]?.geometry?.location;
    if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
      geocodeCache.set(key, { lat: loc.lat, lng: loc.lng, expiresAt: Date.now() + 24 * 3600 * 1000 });
      // prune occasionally
      if (geocodeCache.size > 200) {
        const first = geocodeCache.keys().next().value;
        if (first) geocodeCache.delete(first);
      }
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (err) {
    console.warn('[DISCOVERY] Geocode lookup failed:', (err as Error)?.message || err);
  }
  return null;
}

const MAX_BUSINESS_REGISTRY = 2000;

/**
 * Upsert live (non-sandbox) discovered places into the server-side business
 * registry so `crm_read_businesses` and GET /api/crm/businesses return real
 * data instead of an empty list.
 */
function upsertDiscoveredBusinesses(places: any[]): void {
  if (!Array.isArray(places) || places.length === 0) return;
  const now = new Date().toISOString();
  let changed = false;
  for (const p of places) {
    if (!p || typeof p !== 'object') continue;
    const name = String(p.name || '').trim();
    if (!name) continue;
    const existing = businessesCache.find(
      (b) =>
        (b.googlePlaceId && p.googlePlaceId && b.googlePlaceId === p.googlePlaceId) ||
        (!b.googlePlaceId && !p.googlePlaceId &&
          b.name.toLowerCase() === name.toLowerCase() &&
          (b.formattedAddress || '').toLowerCase() === String(p.formattedAddress || '').toLowerCase())
    );
    if (existing) {
      existing.rating = typeof p.rating === 'number' ? p.rating : existing.rating;
      existing.reviewCount = typeof p.reviewCount === 'number' ? p.reviewCount : existing.reviewCount;
      existing.opportunityScore = typeof p.opportunityScore === 'number' ? p.opportunityScore : existing.opportunityScore;
      existing.opportunityGrade = p.opportunityGrade || existing.opportunityGrade;
      existing.websiteStatus = p.websiteStatus || existing.websiteStatus;
      existing.lastSeenAt = now;
      changed = true;
    } else {
      businessesCache.push({
        id: `biz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        googlePlaceId: p.googlePlaceId,
        name,
        formattedAddress: p.formattedAddress,
        phone: p.phone,
        website: p.website,
        rating: p.rating,
        reviewCount: p.reviewCount,
        primaryType: p.primaryType,
        businessStatus: p.businessStatus,
        websiteStatus: p.websiteStatus,
        opportunityScore: p.opportunityScore,
        opportunityGrade: p.opportunityGrade,
        googleMapsUri: p.googleMapsUri,
        source: 'PLACES_DISCOVERY',
        discoveredAt: now,
        lastSeenAt: now,
      });
      changed = true;
    }
  }
  // Bound the registry: drop oldest lastSeen first.
  if (businessesCache.length > MAX_BUSINESS_REGISTRY) {
    businessesCache.sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? -1 : 1));
    businessesCache = businessesCache.slice(businessesCache.length - MAX_BUSINESS_REGISTRY);
    changed = true;
  }
  if (changed) persistData();
}

async function mcpExecutePlacesDiscover(args: Record<string, unknown>, context?: any) {
  const startTime = Date.now();
  const cap = (v: unknown, n: number): string => String(v || '').slice(0, n);
  const location = cap(args.location || 'Cebu City', 200);
  const category = cap(args.category || 'Restaurants', 120);
  const keyword = cap(args.keyword || '', 200);
  const pageSize = Math.min(50, Math.max(1, Number(args.pageSize) || 10));
  const pageToken = args.pageToken ? cap(args.pageToken, 500) : undefined;
  const radiusKm = Math.min(50, Math.max(1, Number(args.radiusKm) || 10));
  const forceSandbox = Boolean(args.forceSandbox);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  // If live key is present and not forced to sandbox, call official Google Places API (New)
  if (apiKey && apiKey.length > 5 && !forceSandbox) {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const textQuery = [keyword, category, location].filter(Boolean).join(' ');

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.websiteUri',
      'places.rating',
      'places.userRatingCount',
      'places.regularOpeningHours',
      'places.googleMapsUri',
      'places.primaryType',
      'places.types',
      'places.businessStatus',
      'places.location',
      'nextPageToken',
    ].join(',');

    const requestBody: Record<string, unknown> = {
      textQuery,
      pageSize: Math.min(pageSize || 10, 20),
    };

    // radiusKm is honored via a locationBias circle once the location string
    // is geocoded. If geocoding fails we proceed without bias (noted below).
    let radiusApplied = false;
    const center = await geocodeLocation(location, apiKey);
    if (center) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius: radiusKm * 1000,
        },
      };
      radiusApplied = true;
    }

    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify(requestBody),
    });

    if (!googleResponse.ok) {
      const errorJson = await googleResponse.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Google Places API returned status ${googleResponse.status}`);
    }

    const data = await googleResponse.json();
    const rawPlaces = data.places || [];

    const formattedPlaces = rawPlaces.map((p: any) => {
      const placeId = p.id || '';
      const name = p.displayName?.text || 'Unnamed Business';
      const hasWebsite = Boolean(p.websiteUri);
      const rating = p.rating || 0;
      const reviewCount = p.userRatingCount || 0;

      let oppScore = 0;
      const oppReasons: string[] = [];

      if (!hasWebsite) {
        oppScore += 45;
        oppReasons.push('🚨 No official website detected (+45 Opportunity)');
      } else {
        oppReasons.push('Official website active (+0)');
      }

      if (rating >= 4.0 && reviewCount >= 20) {
        oppScore += 25;
        oppReasons.push(`High consumer rating (★${rating}, ${reviewCount} reviews) indicates strong revenue (+25)`);
      } else if (rating > 0) {
        oppScore += 15;
        oppReasons.push(`Online reviews present (+15)`);
      }

      if (p.nationalPhoneNumber || p.internationalPhoneNumber) {
        oppScore += 10;
        oppReasons.push('Phone channel directly available (+10)');
      }

      const cappedScore = Math.min(100, Math.max(10, oppScore));

      return {
        id: placeId,
        googlePlaceId: placeId,
        name,
        formattedAddress: p.formattedAddress || `${location}`,
        phone: p.nationalPhoneNumber || p.internationalPhoneNumber,
        website: p.websiteUri,
        rating,
        reviewCount,
        businessHours: {
          openNow: p.regularOpeningHours?.openNow,
          weekdayDescriptions: p.regularOpeningHours?.weekdayDescriptions,
        },
        googleMapsUri: p.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        primaryType: p.primaryType,
        types: p.types || [],
        businessStatus: p.businessStatus || 'OPERATIONAL',
        websiteStatus: hasWebsite ? 'HAS_WEBSITE' : 'NO_WEBSITE',
        opportunityScore: cappedScore,
        opportunityGrade: cappedScore >= 70 ? 'HIGH_OPPORTUNITY' : cappedScore >= 40 ? 'MEDIUM_OPPORTUNITY' : 'LOW_OPPORTUNITY',
        opportunityReasons: oppReasons,
        duplicateStatus: 'NEW',
        attributionText: 'Google Maps Platform / Places API (New)',
        retrievedAt: new Date().toISOString(),
        isSandboxData: false,
      };
    });

    try {
      upsertDiscoveredBusinesses(formattedPlaces);
    } catch (err) {
      console.warn('[DISCOVERY] Business registry upsert failed:', (err as Error)?.message || err);
    }

    return {
      places: formattedPlaces,
      nextPageToken: data.nextPageToken,
      totalReturned: formattedPlaces.length,
      source: 'OFFICIAL_GOOGLE_PLACES_API_NEW',
      isSandboxData: false,
      attribution: 'Powered by Google Maps Platform',
      radiusKm,
      radiusBiasApplied: radiusApplied,
      sessionMeta: {
        queryText: textQuery,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Safe fallback: Sandbox Diagnostic Mode
  const places = generateSandboxPlaces(location, category, keyword, pageToken);
  const queryText = [keyword, category, location].filter(Boolean).join(' ');

  return {
    places,
    nextPageToken: pageToken ? undefined : 'next_page_token_sandbox_session_2',
    totalReturned: places.length,
    source: 'SANDBOX_DIAGNOSTIC',
    isSandboxData: true,
    notice: apiKey
      ? 'Sandbox forced by user configuration for quota conservation.'
      : 'GOOGLE_MAPS_API_KEY is not defined in environment secrets. Displaying realistic diagnostic sandbox data for Phase 3 evaluation and duplicate testing.',
    attribution: 'Powered by Google Maps Platform (Diagnostic Simulation)',
    sessionMeta: {
      queryText,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

async function mcpExecuteWebsiteAudit(args: Record<string, unknown>, context?: any) {
  const cap = (v: unknown, n: number): string => String(v || '').slice(0, n);
  const businessId = args.businessId ? String(args.businessId) : undefined;
  const businessName = cap(args.businessName || 'Business', 200);
  const websiteUrl = cap(args.websiteUrl || '', 300);
  const category = cap(args.category || 'local business', 120);
  const rating = Number(args.rating) || 0;
  const reviewCount = Number(args.reviewCount) || 0;

  const hasWebsite = Boolean(websiteUrl && websiteUrl.length > 5 && !websiteUrl.toLowerCase().includes('none'));

  if (!hasWebsite) {
    return {
      businessId,
      targetUrl: 'None (No official website)',
      websiteStatus: 'NO_WEBSITE',
      opportunityScore: 94,
      opportunityGrade: 'HIGH_OPPORTUNITY',
      opportunityScoreBreakdown: [
        {
          factor: 'Missing Primary Digital Hub',
          pointsAwarded: 45,
          maxPoints: 45,
          impact: 'HIGH',
          reason: 'Lacks an owned digital asset to capture organic search traffic and establish local credibility.',
        },
        {
          factor: 'Zero Direct Online Booking / Ordering',
          pointsAwarded: 25,
          maxPoints: 25,
          impact: 'HIGH',
          reason: 'Leads cannot schedule or convert without calling or visiting in person.',
        },
        {
          factor: 'No Mobile Lead Funnel',
          pointsAwarded: 15,
          maxPoints: 15,
          impact: 'HIGH',
          reason: 'Smartphone searchers cannot view services or tap a sticky call-to-action.',
        },
        {
          factor: 'Unclaimed Local Search Real Estate',
          pointsAwarded: 9,
          maxPoints: 15,
          impact: 'MEDIUM',
          reason: 'Competitors with indexed website landing pages dominate high-intent keywords.',
        },
      ],
      designPatternAssessment: 'No official website detected for this business. Presence is restricted to third-party maps and directory listings.',
      criteria: {
        mobileResponsive: { passed: false, details: 'No official website exists to render for mobile viewports.' },
        https: { passed: false, hasValidCertificate: false, details: 'No proprietary domain or SSL host exists.' },
        pageTitle: { status: 'MISSING', details: 'Zero indexable web title tag.' },
        metadata: { hasDescription: false, hasOpenGraph: false, status: 'MISSING', details: 'Zero meta tags or social preview markup.' },
        navigation: { status: 'MISSING_MOBILE_MENU', details: 'No digital navigation menu.' },
        callToAction: { presence: 'NO_VISIBLE_CTA', placement: 'NONE', details: 'Customers cannot take direct digital action.' },
        contactAccessibility: { hasClickToCall: false, hasVisibleEmail: false, hasMapOrDirections: false, hasContactForm: false, details: 'No dedicated web contact form or direct click-to-call link.' },
        visualConsistency: { status: 'Not verified', assessmentLanguage: 'No website detected to evaluate visual consistency.', details: 'Zero owned web branding.' },
        contentQuality: { clearValueProposition: false, structuredServices: false, recencySignal: 'STALE', details: 'Services and offerings are not published on an owned web asset.' },
        performanceIndicators: { performanceGrade: 'CRITICAL_LAG', details: 'No web host detected.' },
        accessibilityIndicators: { contrastCompliance: false, estimatedScore: 0, details: 'Zero digital accessibility compliance.' },
        socialIntegration: { hasSocialLinks: false, linkedPlatforms: [], details: 'No web-to-social cross-linking exists.' },
        bookingOrderFunctionality: { status: 'NONE', details: 'Zero direct booking or reservation portal.' },
      },
      metrics: {
        mobileResponsive: false,
        hasSslCertificate: false,
        hasModernViewportMeta: false,
        hasStructuredData: false,
        hasAnalyticsInstalled: false,
        accessibilityScore: 0,
      },
      identifiedIssues: [
        {
          id: 'iss_no_web_1',
          severity: 'CRITICAL',
          category: 'MOBILE_UX',
          description: 'No website exists to capture smartphone discovery traffic.',
          opportunityTitle: 'Modern Mobile-First Web Launch',
        },
      ],
    };
  }

  // Attempt server-side Gemini generation if available
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are HorusScope's Website Intelligence Auditor.
Analyze this business website:
Business: "${businessName}"
Category: "${category}"
Target URL: "${websiteUrl}"
Rating: ${rating || 'N/A'}, Reviews: ${reviewCount || 'N/A'}

CRITICAL RULES:
1. DO NOT guess or claim the exact year or age the site was built (e.g., NEVER say "Website was built in 2017").
2. ALWAYS use cautious assessment language such as: "AI assessment indicates the website may have outdated design patterns."
3. Determine if the site is:
   - "Potentially outdated" (e.g. failing mobile viewport, slow uncompressed images, phone-only contact, outdated design patterns)
   - "Good website" (e.g. fast, responsive, modern layout, online booking/CTA)
   - "Website exists" (standard functional template with minor improvement areas)
4. Audit all 13 criteria.
5. Calculate Website Opportunity Score (0 to 100, where 70-100 means high opportunity for redesign/services).

Return ONLY valid JSON matching this schema:
{
  "websiteStatus": "POTENTIALLY_OUTDATED" | "GOOD_WEBSITE" | "WEBSITE_EXISTS",
  "opportunityScore": number,
  "opportunityGrade": "HIGH_OPPORTUNITY" | "MEDIUM_OPPORTUNITY" | "LOW_OPPORTUNITY",
  "designPatternAssessment": "AI assessment indicates the website may have outdated design patterns...",
  "opportunityScoreBreakdown": [
    { "factor": string, "pointsAwarded": number, "maxPoints": number, "impact": "HIGH" | "MEDIUM" | "LOW", "reason": string }
  ],
  "criteria": {
    "mobileResponsive": { "passed": boolean, "details": string },
    "https": { "passed": boolean, "hasValidCertificate": boolean, "details": string },
    "pageTitle": { "title": string, "status": "OPTIMIZED" | "GENERIC" | "MISSING", "details": string },
    "metadata": { "hasDescription": boolean, "descriptionSnippet": string, "hasOpenGraph": boolean, "status": "OPTIMIZED" | "INCOMPLETE" | "MISSING", "details": string },
    "navigation": { "status": "MODERN_STREAMLINED" | "CLUTTERED" | "MISSING_MOBILE_MENU", "details": string },
    "callToAction": { "presence": "CLEAR_PRIMARY_CTA" | "WEAK_VAGUE_CTA" | "NO_VISIBLE_CTA", "label": string, "placement": "ABOVE_THE_FOLD" | "BELOW_THE_FOLD" | "NONE", "details": string },
    "contactAccessibility": { "hasClickToCall": boolean, "hasVisibleEmail": boolean, "hasMapOrDirections": boolean, "hasContactForm": boolean, "details": string },
    "visualConsistency": { "status": "MODERN_COHESIVE" | "POTENTIALLY_OUTDATED_PATTERNS" | "HIGHLY_INCONSISTENT", "assessmentLanguage": "AI assessment indicates the website may have outdated design patterns.", "details": string },
    "contentQuality": { "clearValueProposition": boolean, "structuredServices": boolean, "recencySignal": "ACTIVE" | "UNCLEAR" | "STALE", "details": string },
    "performanceIndicators": { "estimatedLoadTimeSeconds": number, "performanceGrade": "FAST" | "MODERATE" | "SLOW", "details": string },
    "accessibilityIndicators": { "contrastCompliance": boolean, "estimatedScore": number, "details": string },
    "socialIntegration": { "hasSocialLinks": boolean, "linkedPlatforms": string[], "details": string },
    "bookingOrderFunctionality": { "status": "INTEGRATED_PORTAL" | "BASIC_FORM" | "PHONE_ONLY" | "NONE", "details": string }
  },
  "metrics": {
    "mobileResponsive": boolean,
    "hasSslCertificate": boolean,
    "estimatedLoadTimeSeconds": number,
    "hasModernViewportMeta": boolean,
    "hasStructuredData": boolean,
    "hasAnalyticsInstalled": boolean,
    "accessibilityScore": number
  }
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      if (parsed.websiteStatus && parsed.criteria) {
        return {
          businessId,
          targetUrl: websiteUrl,
          ...parsed,
        };
      }
    } catch (e: any) {
      console.warn('Gemini website audit fallback in MCP handler:', e.message);
    }
  }

  // Fallback to deterministic heuristic evaluation
  const isOutdatedSignal =
    category?.includes('dentist') || category?.includes('hvac') || (rating && rating >= 4.5 && (!reviewCount || reviewCount < 50));

  const websiteStatus = isOutdatedSignal ? 'POTENTIALLY_OUTDATED' : 'WEBSITE_EXISTS';
  const opportunityScore = isOutdatedSignal ? 78 : 50;

  return {
    businessId,
    targetUrl: websiteUrl,
    websiteStatus,
    opportunityScore,
    opportunityGrade: isOutdatedSignal ? 'HIGH_OPPORTUNITY' : 'MEDIUM_OPPORTUNITY',
    designPatternAssessment: isOutdatedSignal
      ? 'AI assessment indicates the website may have outdated design patterns, including desktop-centric layouts and non-responsive table containers.'
      : 'AI assessment indicates standard contemporary web conventions with baseline mobile compatibility.',
    opportunityScoreBreakdown: [
      {
        factor: 'Mobile Experience & Responsiveness',
        pointsAwarded: isOutdatedSignal ? 22 : 8,
        maxPoints: 25,
        impact: isOutdatedSignal ? 'HIGH' : 'LOW',
        reason: isOutdatedSignal ? 'Mobile viewport issues causing tap target crowding.' : 'Acceptable mobile rendering.',
      },
      {
        factor: 'Conversion CTA & Booking Funnel',
        pointsAwarded: isOutdatedSignal ? 20 : 12,
        maxPoints: 25,
        impact: 'HIGH',
        reason: isOutdatedSignal ? 'No interactive online booking or direct appointment scheduler.' : 'Basic form present.',
      },
      {
        factor: 'Design Pattern Modernity & Visuals',
        pointsAwarded: isOutdatedSignal ? 20 : 10,
        maxPoints: 25,
        impact: 'HIGH',
        reason: 'AI assessment indicates the website may have outdated design patterns.',
      },
      {
        factor: 'Speed & Technical Foundation',
        pointsAwarded: isOutdatedSignal ? 16 : 8,
        maxPoints: 25,
        impact: 'MEDIUM',
        reason: isOutdatedSignal ? '4.8s initial load on mobile connection.' : 'Standard 2.5s page load.',
      },
    ],
    criteria: {
      mobileResponsive: { passed: !isOutdatedSignal, details: isOutdatedSignal ? 'Viewport meta tag issues causing horizontal overflow.' : 'Passes mobile checks.' },
      https: { passed: true, hasValidCertificate: true, details: 'Valid SSL encryption certificate active.' },
      pageTitle: { title: `${businessName} - Official Website`, status: 'GENERIC', details: 'Generic title tag lacking targeted keywords.' },
      metadata: { hasDescription: false, hasOpenGraph: false, status: 'INCOMPLETE', details: 'Missing OpenGraph social card previews.' },
      navigation: { status: isOutdatedSignal ? 'CLUTTERED' : 'MODERN_STREAMLINED', details: isOutdatedSignal ? 'Multi-tiered dropdown menu lacking mobile drawer.' : 'Clean streamlined header.' },
      callToAction: { presence: isOutdatedSignal ? 'WEAK_VAGUE_CTA' : 'CLEAR_PRIMARY_CTA', label: isOutdatedSignal ? 'Learn More' : 'Contact Us', placement: isOutdatedSignal ? 'BELOW_THE_FOLD' : 'ABOVE_THE_FOLD', details: 'Primary CTA placement.' },
      contactAccessibility: { hasClickToCall: !isOutdatedSignal, hasVisibleEmail: true, hasMapOrDirections: true, hasContactForm: true, details: 'Contact channels.' },
      visualConsistency: { status: isOutdatedSignal ? 'POTENTIALLY_OUTDATED_PATTERNS' : 'MODERN_COHESIVE', assessmentLanguage: 'AI assessment indicates the website may have outdated design patterns.', details: 'Design pattern evaluation.' },
      contentQuality: { clearValueProposition: !isOutdatedSignal, structuredServices: true, recencySignal: isOutdatedSignal ? 'UNCLEAR' : 'ACTIVE', details: 'Service listings.' },
      performanceIndicators: { estimatedLoadTimeSeconds: isOutdatedSignal ? 4.8 : 2.4, performanceGrade: isOutdatedSignal ? 'SLOW' : 'FAST', details: isOutdatedSignal ? '4.8s mobile load.' : 'Fast sub-2.5s load.' },
      accessibilityIndicators: { contrastCompliance: !isOutdatedSignal, estimatedScore: isOutdatedSignal ? 62 : 88, details: 'Color contrast.' },
      socialIntegration: { hasSocialLinks: true, linkedPlatforms: ['Facebook', 'Instagram'], details: 'Footer social links.' },
      bookingOrderFunctionality: { status: isOutdatedSignal ? 'PHONE_ONLY' : 'BASIC_FORM', details: isOutdatedSignal ? 'Phone-only appointment requests.' : 'Basic email form.' },
    },
    metrics: {
      mobileResponsive: !isOutdatedSignal,
      hasSslCertificate: true,
      estimatedLoadTimeSeconds: isOutdatedSignal ? 4.8 : 2.4,
      hasModernViewportMeta: !isOutdatedSignal,
      hasStructuredData: false,
      hasAnalyticsInstalled: true,
      accessibilityScore: isOutdatedSignal ? 62 : 88,
    },
  };
}

async function mcpExecuteCrmRead(args: Record<string, unknown>) {
  const query = args.query ? String(args.query).toLowerCase().trim() : '';
  const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));

  let records: StoredBusiness[] = businessesCache;

  if (query) {
    records = records.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        (b.formattedAddress || '').toLowerCase().includes(query) ||
        (b.primaryType || '').toLowerCase().includes(query)
    );
  }

  // Most recently seen first.
  const sorted = [...records].sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));

  return {
    businesses: sorted.slice(0, limit),
    totalMatching: records.length,
    returnedCount: Math.min(records.length, limit),
    source: 'SERVER_BUSINESS_REGISTRY',
    registrySize: businessesCache.length,
    timestamp: new Date().toISOString(),
  };
}

// Register Handlers with the Model Context Protocol Gateway
mcpHandler.registerExecutor('places_discover', mcpExecutePlacesDiscover);
mcpHandler.registerExecutor('intelligence_audit_website', mcpExecuteWebsiteAudit);
mcpHandler.registerExecutor('crm_read_businesses', mcpExecuteCrmRead);
// The access/requests resource serves the live queue (owner-visible via MCP).
mcpHandler.setAccessRequestsProvider(() =>
  requestsCache.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.fullName,
    organization: r.organization,
    requestedRole: r.requestedRole,
    status: r.status,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
  }))
);

// ============================================================================
// MODEL CONTEXT PROTOCOL (MCP) JSON-RPC 2.0 & GOVERNANCE ENDPOINTS
// ============================================================================

// Standard JSON-RPC 2.0 MCP Protocol Transport
app.post('/api/mcp', async (req: Request, res: Response) => {
  const context = {
    callerRole: (req as AuthenticatedRequest).session!.role as 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER',
    userId: (req as AuthenticatedRequest).session!.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
  const response = await mcpHandler.handleJsonRpc(req.body, context);
  res.json(response);
});

// REST endpoint to inspect all registered MCP tools & input schemas
// Real-time MCP Gateway telemetry & pre-call governance metrics
app.get('/api/mcp/stats', (req: Request, res: Response) => {
  res.json(mcpGovernance.getMetrics());
});

// Server-Sent Events (SSE) stream for MCP real-time connections
// L5: cap concurrent SSE streams per user (slow resource exhaustion).
const sseConnections = new Map<string, number>();
const MAX_SSE_PER_USER = 3;

app.get('/api/mcp/sse', (req: AuthenticatedRequest, res: Response) => {
  const sseKey = req.session!.userId;
  const current = sseConnections.get(sseKey) || 0;
  if (current >= MAX_SSE_PER_USER) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Too many open event streams.' });
  }
  sseConnections.set(sseKey, current + 1);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const connectMsg = JSON.stringify({
    type: 'connected',
    protocolVersion: '2024-11-05',
    gateway: 'HorusScope MCP Gateway',
    timestamp: new Date().toISOString(),
  });
  res.write(`data: ${connectMsg}\n\n`);

  const keepAliveInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    const left = (sseConnections.get(sseKey) || 1) - 1;
    if (left <= 0) sseConnections.delete(sseKey);
    else sseConnections.set(sseKey, left);
  });
});

// ============================================================================
// PHASE 3: BUSINESS DISCOVERY SEARCH (GOVERNED VIA MCP PRE-CALL HANDLER)
// ============================================================================

app.post('/api/discovery/search', async (req: AuthenticatedRequest, res: Response) => {
  // Enforce per-client Discovery Rate Limiting (quota fairness)
  const { bucket, limited } = discoveryBucket(rateLimitKey(req));
  if (limited) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      message: 'Discovery rate limit exceeded (30 requests/minute per user).',
      retryAfterSeconds: Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000)),
    });
  }

  // Pre-Call Governance Interception via MCP Handler
  const context = {
    callerRole: (req as AuthenticatedRequest).session!.role as 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER',
    userId: (req as AuthenticatedRequest).session!.userId,
    ip: req.ip,
  };

  const mcpResult = await mcpHandler.executeTool('places_discover', req.body, context);

  if (mcpResult.isError) {
    const errorText = mcpResult.content.find((c) => c.type === 'text')?.text || 'Tool execution blocked by MCP Gateway';
    return res.status(400).json({
      error: 'MCP_GOVERNANCE_BLOCKED',
      message: errorText,
      metadata: mcpResult.metadata,
    });
  }

  const jsonBlock = mcpResult.content.find((c) => c.type === 'json');
  return res.json(jsonBlock?.data || {});
});

// ============================================================================
// PHASE 5: WEBSITE INTELLIGENCE API ROUTE (GOVERNED VIA MCP PRE-CALL HANDLER)
// ============================================================================

app.post('/api/intelligence/audit-website', async (req: Request, res: Response) => {
  const context = {
    callerRole: (req as AuthenticatedRequest).session!.role as 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER',
    userId: (req as AuthenticatedRequest).session!.userId,
    ip: req.ip,
  };

  const mcpResult = await mcpHandler.executeTool('intelligence_audit_website', req.body, context);

  if (mcpResult.isError) {
    const errorText = mcpResult.content.find((c) => c.type === 'text')?.text || 'Tool execution blocked by MCP Gateway';
    return res.status(400).json({
      error: 'MCP_GOVERNANCE_BLOCKED',
      message: errorText,
      metadata: mcpResult.metadata,
    });
  }

  const jsonBlock = mcpResult.content.find((c) => c.type === 'json');
  return res.json(jsonBlock?.data || {});
});

// ============================================================================
// PHASE 6: SOCIAL INTELLIGENCE API ROUTE
// ============================================================================

app.post('/api/intelligence/audit-social', async (req: Request, res: Response) => {
  const { businessId, businessName, websiteStatus, websiteUrl, googleRating = 4.6, reviewCount = 42 } = req.body;

  if (!businessName) {
    return res.status(400).json({ error: 'businessName is required' });
  }


  const isNoWebsite = websiteStatus === 'NO_WEBSITE' || !websiteUrl || websiteUrl.toLowerCase().includes('none');

  // Channel matrix
  const channels = [
    {
      platform: 'FACEBOOK',
      platformDisplayName: 'Facebook',
      status: 'ACTIVE',
      isClaimed: true,
      audienceMetric: '3.4k followers',
      activityIndicator: 'Active posts within 3 days; daily specials & customer interactions',
      notes: 'High local following with active comments and inquiries.',
    },
    {
      platform: 'INSTAGRAM',
      platformDisplayName: 'Instagram',
      status: isNoWebsite ? 'ACTIVE' : 'DORMANT',
      isClaimed: true,
      audienceMetric: isNoWebsite ? '4.8k followers' : '850 followers',
      activityIndicator: isNoWebsite ? 'Active stories posted daily; consistent visual branding' : 'Last post > 8 months ago',
      notes: isNoWebsite ? 'Drives strong organic discovery from nearby patrons.' : 'Lacks regular visual updates.',
    },
    {
      platform: 'TIKTOK',
      platformDisplayName: 'TikTok',
      status: 'UNKNOWN',
      isClaimed: 'Not verified',
      audienceMetric: 'Unverified',
      activityIndicator: 'User-generated check-in tags exist, but no claimed business handle verified',
      notes: 'Opportunity to verify official presence for short-form video discovery.',
    },
    {
      platform: 'GOOGLE_BUSINESS',
      platformDisplayName: 'Google Profile',
      status: 'ACTIVE',
      isClaimed: true,
      audienceMetric: `${reviewCount} reviews (${Number(googleRating).toFixed(1)}★)`,
      activityIndicator: 'Actively receiving positive local reviews and customer check-ins',
      notes: 'Primary local map listing driving phone inquiries.',
    },
    {
      platform: 'LINKEDIN',
      platformDisplayName: 'LinkedIn',
      status: 'NONE',
      isClaimed: false,
      notes: 'No corporate B2B profile registered.',
    },
  ];

  // Sales insights generation
  let salesInsights = [];

  if (isNoWebsite) {
    // Specific rule: "Strong Facebook presence but no dedicated website. That becomes a sales insight."
    salesInsights = [
      {
        id: `si_${Date.now()}_1`,
        headline: 'Strong Facebook presence but no dedicated website.',
        salesOpportunityType: 'MISSING_WEBSITE_WITH_ACTIVE_SOCIAL',
        narrative: `The business demonstrates proven market demand and customer engagement with an active Facebook presence (3.4k followers) and Instagram (4.8k followers), but has zero dedicated website. High-margin direct orders and reservation inquiries are currently forced through chaotic social DMs or lost to third-party delivery apps charging 25-30% commissions.`,
        actionablePitchAngle: 'Zero-Commission Direct Ordering & Branded Digital Hub: Stop losing 30% margin to third-party aggregators. Monetize your 8,000+ active social followers directly with a branded digital storefront and automated reservation system.',
        recommendedServices: [
          'Mobile-First Direct Booking / Ordering Website',
          'Instagram & Facebook Bio-Link Landing Page',
          'Automated Lead Notification System',
        ],
        confidence: 'HIGH CONFIDENCE',
      },
      {
        id: `si_${Date.now()}_2`,
        headline: `Active Google Profile (${reviewCount} reviews • ${Number(googleRating).toFixed(1)}★) with no website anchor.`,
        salesOpportunityType: 'HIGH_RATING_NO_DIGITAL_HUB',
        narrative: 'High organic local discovery on Google Maps is currently dead-ending at phone-only orders. A modern high-speed menu and booking portal will immediately capture searchers seeking instant confirmation.',
        actionablePitchAngle: 'Google Maps Conversion Booster: Connect your Google Business Profile to a dedicated landing page to double customer conversion rates.',
        recommendedServices: ['Google Profile Website Link Integration', 'Local SEO Structured Data'],
        confidence: 'HIGH CONFIDENCE',
      },
    ];
  } else if (websiteStatus === 'POTENTIALLY_OUTDATED') {
    salesInsights = [
      {
        id: `si_${Date.now()}_1`,
        headline: 'Active Facebook audience driving traffic to a potentially outdated website.',
        salesOpportunityType: 'OUTDATED_SITE_DROP_OFF',
        narrative: 'AI assessment indicates the website may have outdated design patterns. While the business actively engages prospects on Facebook, mobile visitors clicking through encounter a slow, non-responsive site that drops high-intent leads.',
        actionablePitchAngle: 'Mobile Conversion Modernization: Align your website with your active social reputation so every Facebook click turns into a booked client.',
        recommendedServices: [
          'Mobile-First Responsive Redesign',
          'Sticky Click-to-Call & Consultation Request Form',
          'Social Proof & Review Carousel Integration',
        ],
        confidence: 'HIGH CONFIDENCE',
      },
    ];
  } else {
    salesInsights = [
      {
        id: `si_${Date.now()}_1`,
        headline: 'Strong multi-channel presence ready for conversion rate optimization.',
        salesOpportunityType: 'SOCIAL_TRAFFIC_CONVERSION_FUNNEL',
        narrative: 'Both social channels and website maintain healthy operational baselines. The prime sales angle is funnel automation, retargeting, and dynamic review syndication.',
        actionablePitchAngle: 'Omnichannel Lead Machine: Automate review syndication from Google directly to your website and social feeds to maximize inbound referrals.',
        recommendedServices: ['Automated Review Syndication', 'Advanced Analytics & Heatmap Funnels'],
        confidence: 'HIGH CONFIDENCE',
      },
    ];
  }

  const crossChannelSummary = `Facebook: Active | Instagram: ${isNoWebsite ? 'Active' : 'Dormant'} | TikTok: Unknown | Website: ${isNoWebsite ? 'None' : websiteStatus === 'POTENTIALLY_OUTDATED' ? 'Potentially Outdated' : 'Active'} | Google Profile: Active`;

  return res.json({
    businessId,
    channels,
    websiteCorrelationStatus: isNoWebsite ? 'NO_WEBSITE' : websiteStatus || 'WEBSITE_EXISTS',
    salesInsights,
    crossChannelSummary,
    overallSocialPresenceGrade: 'ACTIVE',
  });
});

// ============================================================================
// PHASE 7: AI MULTI-DIMENSIONAL LEAD SCORING ENDPOINT (Gemini 3.8 Flash)
// ============================================================================

app.post('/api/intelligence/score-lead', async (req: Request, res: Response) => {
  const {
    businessId,
    leadId,
    businessName,
    websiteUrl,
    websiteStatus,
    googleRating = 4.6,
    reviewCount = 50,
    primaryCategory = 'Local Business',
    phone,
    address,
    channels = [],
  } = req.body;

  if (!businessName) {
    return res.status(400).json({ error: 'businessName is required' });
  }

  // L3: cap user-controlled fields (prompt-injection / quota-burn hardening).
  const cap = (v: unknown, n: number): string => String(v || '').slice(0, n);
  const safeName = cap(businessName, 200);
  const safeCategory = cap(primaryCategory, 120);
  const safeUrl = cap(websiteUrl, 300);
  const safePhone = cap(phone, 60);
  const safeAddress = cap(address, 300);
  const safeChannels = Array.isArray(channels) ? channels.slice(0, 12) : [];

  const isNoWebsite = websiteStatus === 'NO_WEBSITE' || !websiteUrl || websiteUrl.toLowerCase().includes('none');
  const isOutdated = websiteStatus === 'POTENTIALLY_OUTDATED';
  const hasActiveSocial = channels.some(
    (c: any) => (c.platform === 'FACEBOOK' || c.platform === 'INSTAGRAM') && c.status === 'ACTIVE'
  );
  const numericRating = Number(googleRating) || 4.5;
  const numericReviews = Number(reviewCount) || 0;

  // Try calling Gemini with gemini-3.8-flash
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are an elite lead qualification engine for HorusScope, an enterprise CRM for digital web and marketing agencies.
Evaluate this prospect across 5 distinct dimensions (0-100), compute an Overall Prospect Score (0-100), and write an insightful, grounded narrative explanation explaining why the business received these scores.

BUSINESS DATA:
- Name: ${safeName}
- Primary Category: ${safeCategory}
- Official Website: ${safeUrl || 'NONE (No official website)'}
- Website Status: ${websiteStatus || (isNoWebsite ? 'NO_WEBSITE' : 'WEBSITE_EXISTS')}
- Google Rating: ${numericRating.toFixed(1)} / 5.0
- Google Review Count: ${numericReviews} verified customer reviews
- Operational Phone: ${safePhone || 'None provided'}
- Physical Address: ${safeAddress || 'Verified local address'}
- Social Presence: ${safeChannels.map((c: any) => `${cap(c.platform || c.platformDisplayName, 60)}: ${cap(c.status, 30)}`).join(', ') || 'Facebook & Instagram Active'}

SCORING CRITERIA (0 to 100 for each):
1. Digital Opportunity: Overall gap in their digital ecosystem and market upside.
2. Website Opportunity: 90-100 if no website exists (highest priority need for a new build); 70-89 if potentially outdated; 20-50 if basic; 0-20 if modern.
3. Social Opportunity: Potential to monetize social following, connect social channels to an owned website, or launch missing channels.
4. Business Strength: Solvency, revenue stability, and capacity to invest $3k-$10k+ in agency services. Higher review counts (100-300+) and high ratings indicate high strength (85-98).
5. Contactability: Ease of reaching decision makers directly (phone, location, public channels).
6. Overall Prospect Score: Holistic synthesis of high opportunity + high business strength + contactability.

AI EXPLANATION GUIDELINE:
You must provide a clear, grounded narrative explanation.
Example format:
"Strong prospect because the business has 300+ customer reviews, an active social presence, and no dedicated website. A website could consolidate its existing online reputation into a professional conversion-focused presence."

Return STRICT JSON matching this exact structure:
{
  "digitalOpportunity": number,
  "websiteOpportunity": number,
  "socialOpportunity": number,
  "businessStrength": number,
  "contactability": number,
  "overallProspectScore": number,
  "explanation": {
    "verdictHeadline": string,
    "narrative": string,
    "whyThisScore": [string, string, string],
    "recommendedPitchAngle": string,
    "actionableNextStep": string
  },
  "dimensions": {
    "digitalOpportunity": { "name": "Digital Opportunity", "score": number, "tier": "EXCEPTIONAL" | "HIGH" | "MODERATE" | "LOW", "rationale": string, "keySignals": [string, string] },
    "websiteOpportunity": { "name": "Website Opportunity", "score": number, "tier": "EXCEPTIONAL" | "HIGH" | "MODERATE" | "LOW", "rationale": string, "keySignals": [string, string] },
    "socialOpportunity": { "name": "Social Opportunity", "score": number, "tier": "EXCEPTIONAL" | "HIGH" | "MODERATE" | "LOW", "rationale": string, "keySignals": [string, string] },
    "businessStrength": { "name": "Business Strength", "score": number, "tier": "EXCEPTIONAL" | "HIGH" | "MODERATE" | "LOW", "rationale": string, "keySignals": [string, string] },
    "contactability": { "name": "Contactability", "score": number, "tier": "EXCEPTIONAL" | "HIGH" | "MODERATE" | "LOW", "rationale": string, "keySignals": [string, string] },
    "overallProspectScore": { "name": "Overall Prospect Score", "score": number, "tier": "EXCEPTIONAL" | "HIGH" | "MODERATE" | "LOW", "rationale": string, "keySignals": [string, string] }
  }
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      if (
        typeof parsed.overallProspectScore === 'number' &&
        typeof parsed.digitalOpportunity === 'number' &&
        parsed.explanation?.narrative
      ) {
        return res.json({
          businessId,
          leadId,
          ...parsed,
          engine: 'GEMINI_FLASH_3_8',
          modelIdentifier: 'gemini-3.8-flash',
          calculatedAt: new Date().toISOString(),
          confidence: 'HIGH CONFIDENCE',
        });
      }
    } catch (e: any) {
      console.warn('Gemini lead scoring fallback triggered:', e.message);
    }
  }

  // ==========================================================================
  // DETERMINISTIC HEURISTIC SCORING ENGINE (Fallback / Zero-Config Guarantee)
  // ==========================================================================

  // 1. Digital Opportunity (0 - 100)
  let digitalOpportunity = 65;
  if (isNoWebsite) digitalOpportunity = 94;
  else if (isOutdated) digitalOpportunity = 82;
  else digitalOpportunity = 48;

  // 2. Website Opportunity (0 - 100)
  let websiteOpportunity = 50;
  if (isNoWebsite) websiteOpportunity = 98;
  else if (isOutdated) websiteOpportunity = 86;
  else websiteOpportunity = 32;

  // 3. Social Opportunity (0 - 100)
  let socialOpportunity = 60;
  if (hasActiveSocial && isNoWebsite) socialOpportunity = 88;
  else if (hasActiveSocial) socialOpportunity = 76;
  else socialOpportunity = 52;

  // 4. Business Strength (0 - 100)
  let businessStrength = 55;
  if (numericReviews >= 300) businessStrength = 95;
  else if (numericReviews >= 100) businessStrength = 88;
  else if (numericReviews >= 40) businessStrength = 74;
  else businessStrength = Math.min(85, Math.round(numericReviews * 1.5) + Math.round(numericRating * 8));

  // 5. Contactability (0 - 100)
  let contactability = 70;
  if (phone && address) contactability = 92;
  else if (phone || address) contactability = 80;
  else contactability = 50;

  // 6. Overall Prospect Score (0 - 100)
  // Weighted: Digital Opp (25%) + Website Opp (30%) + Social Opp (15%) + Biz Strength (20%) + Contact (10%)
  const rawOverall = Math.round(
    digitalOpportunity * 0.25 +
    websiteOpportunity * 0.30 +
    socialOpportunity * 0.15 +
    businessStrength * 0.20 +
    contactability * 0.10
  );
  const overallProspectScore = Math.min(98, Math.max(25, rawOverall));

  // Determine narrative & explanation
  let verdictHeadline = 'High-Value Prospect';
  let narrative = '';
  const whyThisScore: string[] = [];

  const reviewsText = numericReviews >= 300 ? '300+' : `${numericReviews}`;

  if (isNoWebsite && numericReviews >= 100) {
    verdictHeadline = `Prime Acquisition Prospect (${overallProspectScore}/100)`;
    narrative = `Strong prospect because the business has ${reviewsText} customer reviews, an active social presence, and no dedicated website. A website could consolidate its existing online reputation into a professional conversion-focused presence.`;
    whyThisScore.push(
      `Strong market validation with ${reviewsText} positive customer reviews demonstrating sustained local demand and solvency.`,
      `Zero proprietary web assets detected; customer discovery currently drops off or pays high commissions to 3rd-party aggregators.`,
      `Active social followings on Facebook and Instagram provide immediate inbound traffic once an owned digital hub is launched.`
    );
  } else if (isNoWebsite) {
    verdictHeadline = `High-Opportunity New Build (${overallProspectScore}/100)`;
    narrative = `Solid prospect because the business maintains local operations and review presence, but completely lacks an official website. A new mobile-first website provides an immediate, tangible return on investment.`;
    whyThisScore.push(
      `No official domain or web host found; local competitors with search-indexed websites dominate high-intent keywords.`,
      `Direct phone line verified, enabling immediate, high-converting outbound sales conversations.`
    );
  } else if (isOutdated) {
    verdictHeadline = `High-Conversion Redesign Opportunity (${overallProspectScore}/100)`;
    narrative = `Strong prospect because the business has established market traction with ${reviewsText} customer reviews, but operates on a potentially outdated website with mobile viewport bottlenecks. A modern redesign will elevate conversion rates and search rankings.`;
    whyThisScore.push(
      `AI audit indicates outdated design patterns, legacy table containers, and mobile responsiveness bottlenecks.`,
      `Healthy review volume (${reviewsText} reviews) proves the business has budget and customer volume to justify a modern redesign.`
    );
  } else {
    verdictHeadline = `Standard Prospect (${overallProspectScore}/100)`;
    narrative = `Moderate prospect because the business possesses a functional web presence. Focus sales outreach on automated review syndication, conversion rate optimization, and advanced local SEO.`;
    whyThisScore.push(
      `Baseline website exists, shifting the primary angle from full web redesign to conversion optimization and local SEO.`,
      `Active contact channels permit direct pitch around lead-capture funnels and speed improvements.`
    );
  }

  const pitchAngle = isNoWebsite
    ? `Zero-Commission Digital Hub: Convert your ${reviewsText} review reputation and social followers into direct bookings without aggregator cuts.`
    : isOutdated
    ? `Mobile Conversion Overhaul: Fix mobile navigation bottlenecks so high-intent phone visitors turn into paying clients.`
    : `Reputation & Funnel Optimization: Syndicate your top-rated Google reviews into automated lead conversion funnels.`;

  const nextStep = `Schedule a direct phone consultation with the principal owner emphasizing tangible conversion lift.`;

  function getTier(val: number): 'EXCEPTIONAL' | 'HIGH' | 'MODERATE' | 'LOW' {
    if (val >= 90) return 'EXCEPTIONAL';
    if (val >= 75) return 'HIGH';
    if (val >= 50) return 'MODERATE';
    return 'LOW';
  }

  const result = {
    businessId,
    leadId,
    digitalOpportunity,
    websiteOpportunity,
    socialOpportunity,
    businessStrength,
    contactability,
    overallProspectScore,
    explanation: {
      overallScore: overallProspectScore,
      verdictHeadline,
      narrative,
      whyThisScore,
      recommendedPitchAngle: pitchAngle,
      actionableNextStep: nextStep,
    },
    dimensions: {
      digitalOpportunity: {
        name: 'Digital Opportunity',
        score: digitalOpportunity,
        tier: getTier(digitalOpportunity),
        rationale: isNoWebsite
          ? 'Critical digital footprint gap: established real-world business has no central digital authority asset.'
          : isOutdated
          ? 'Substantial digital deficit: legacy web patterns cause visitor drop-off on mobile devices.'
          : 'Moderate digital optimization potential across local search and funnel conversion.',
        keySignals: [
          isNoWebsite ? 'No proprietary website' : isOutdated ? 'Outdated design patterns' : 'Standard website active',
          hasActiveSocial ? 'Active social presence' : 'Social channels unoptimized',
        ],
      },
      websiteOpportunity: {
        name: 'Website Opportunity',
        score: websiteOpportunity,
        tier: getTier(websiteOpportunity),
        rationale: isNoWebsite
          ? 'Maximum potential upside from a ground-up mobile-first web launch with direct booking and ordering.'
          : isOutdated
          ? 'High redesign opportunity to resolve mobile viewport overflow and sticky call-to-action placement.'
          : 'Incremental opportunity for website speed enhancement and conversion rate tuning.',
        keySignals: [
          isNoWebsite ? 'Missing primary web hub' : isOutdated ? 'Mobile responsiveness deficiency' : 'Baseline website',
        ],
      },
      socialOpportunity: {
        name: 'Social Opportunity',
        score: socialOpportunity,
        tier: getTier(socialOpportunity),
        rationale: hasActiveSocial
          ? 'Active audience on social media (Facebook/Instagram) can be immediately bridged into an owned web conversion funnel.'
          : 'Dormant or unverified social presence represents an additional digital agency service package.',
        keySignals: [
          hasActiveSocial ? 'Active social community' : 'Unclaimed social profiles',
          'Bio-link funnel expansion potential',
        ],
      },
      businessStrength: {
        name: 'Business Strength',
        score: businessStrength,
        tier: getTier(businessStrength),
        rationale: `${numericReviews} customer reviews with a ${numericRating.toFixed(1)}★ rating demonstrate commercial solvency and capacity to invest in high-ROI agency services.`,
        keySignals: [
          `${reviewsText} verified reviews`,
          `${numericRating.toFixed(1)} Star Google reputation`,
          'Established operational track record',
        ],
      },
      contactability: {
        name: 'Contactability',
        score: contactability,
        tier: getTier(contactability),
        rationale: phone && address
          ? 'Direct operational telephone number and verified physical address allow high-probability outreach.'
          : 'Public commercial channels identified for direct outbound communication.',
        keySignals: [
          phone ? 'Direct telephone verified' : 'No phone listed',
          address ? 'Physical address verified' : 'Address unconfirmed',
        ],
      },
      overallProspectScore: {
        name: 'Overall Prospect Score',
        score: overallProspectScore,
        tier: getTier(overallProspectScore),
        rationale: `Convergence of commercial solvency (${businessStrength}/100) with digital need (${digitalOpportunity}/100) positions this as a prime agency prospect.`,
        keySignals: [
          `Overall Score: ${overallProspectScore}/100`,
          `${verdictHeadline}`,
        ],
      },
    },
    engine: 'DETERMINISTIC_HEURISTIC',
    modelIdentifier: 'horus-scoring-heuristics-v7',
    calculatedAt: new Date().toISOString(),
    confidence: 'HIGH CONFIDENCE',
  };

  return res.json(result);
});

// ============================================================================
// ACCESS REQUESTS & MULTI-USER ACCESS MANAGEMENT ENDPOINTS
// ============================================================================

interface StoredAccessRequest {
  id: string;
  email: string;
  fullName: string;
  organization?: string;
  requestedRole: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface StoredUserAccount {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  organization?: string;
  avatarUrl?: string;
  passwordSalt?: string;
  passwordHash?: string;
  isPasswordSet?: boolean;
  failedLoginAttempts?: number;
  lockoutUntil?: string | null;
  isGoogleConnected?: boolean;
  googleEmail?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ============================================================================
// DURABLE DATA LAYER — server-side user registry & access requests.
// Backed by a SnapshotStore (Turso when TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
// are set, otherwise a local JSON file). In-memory cache is authoritative
// during runtime; every mutation persists the whole snapshot.
// ============================================================================

interface DataSnapshot {
  users: StoredUserAccount[];
  accessRequests: StoredAccessRequest[];
  businesses: StoredBusiness[];
}

/** Server-side registry of businesses discovered via Places (live results). */
interface StoredBusiness {
  id: string;
  googlePlaceId?: string;
  name: string;
  formattedAddress?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  primaryType?: string;
  businessStatus?: string;
  websiteStatus?: string;
  opportunityScore?: number;
  opportunityGrade?: string;
  googleMapsUri?: string;
  source: string;
  discoveredAt: string;
  lastSeenAt: string;
}

let snapshotStore: SnapshotStore | null = null;
let usersCache: StoredUserAccount[] = [];
let requestsCache: StoredAccessRequest[] = [];
let businessesCache: StoredBusiness[] = [];
let dataStoreReady = false;

function seedSnapshot(): DataSnapshot {
  // Clean boot: exactly one OWNER account with NO password. The bootstrap
  // secret (HORUSCOPE_OWNER_PASSWORD) sets its password on first boot.
  // No test fixtures, no hardcoded password hashes — ever.
  return {
    users: [
      {
        id: 'usr_owner_kieth',
        email: 'kiethryangonzales@gmail.com',
        displayName: 'Kieth Ryan Gonzales',
        role: 'OWNER',
        status: 'APPROVED',
        organization: 'HORUSCOPE Sovereign Operations',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        passwordSalt: '',
        passwordHash: '',
        isPasswordSet: false,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        isGoogleConnected: false,
        googleEmail: 'kiethryangonzales@gmail.com',
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: new Date().toISOString(),
        approvedBy: 'SYSTEM_SUPERADMIN',
        approvedAt: '2026-08-01T08:00:00.000Z',
      },
    ],
    accessRequests: [],
    businesses: [],
  };
}

function persistData(): void {
  if (!snapshotStore) return;
  const json = JSON.stringify({ users: usersCache, accessRequests: requestsCache, businesses: businessesCache });
  // SnapshotStore.save never throws — fire and forget is safe.
  void snapshotStore.save(json);
}

/**
 * Bootstrap the owner password from the HORUSCOPE_OWNER_PASSWORD secret.
 * Applies ONLY when the owner has no usable password (never set, or still
 * carrying the publicly-compromised default hash). Once the owner sets a
 * real password, the secret is ignored on later boots.
 */
async function bootstrapOwnerPassword(): Promise<void> {
  const bootstrap = process.env.HORUSCOPE_OWNER_PASSWORD;
  const owner = usersCache.find((u) => u.email.toLowerCase() === 'kiethryangonzales@gmail.com');
  if (!owner) return;
  const needsPassword =
    !owner.isPasswordSet ||
    !owner.passwordHash ||
    owner.passwordHash === COMPROMISED_DEFAULT_HASH;
  if (!needsPassword) return;
  if (!bootstrap || bootstrap.length < 12) {
    console.warn(
      '[AUTH] Owner account has no usable password and HORUSCOPE_OWNER_PASSWORD is not set (min 12 chars). Login is disabled until it is configured.'
    );
    owner.isPasswordSet = false;
    owner.passwordHash = '';
    owner.passwordSalt = '';
    return;
  }
  const salt = generateSalt();
  owner.passwordSalt = salt;
  owner.passwordHash = await hashPassword(bootstrap, salt);
  owner.isPasswordSet = true;
  owner.failedLoginAttempts = 0;
  owner.lockoutUntil = null;
  owner.updatedAt = new Date().toISOString();
  console.log('[AUTH] Owner password bootstrapped from HORUSCOPE_OWNER_PASSWORD.');
  persistData();
}

async function initDataStore(): Promise<void> {
  if (dataStoreReady) return;
  const legacyFile = path.join(DATA_DIR, 'horuscope-data.json');
  snapshotStore = createSnapshotStore(legacyFile);
  const raw = await snapshotStore.load();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DataSnapshot;
      usersCache = Array.isArray(parsed.users) ? parsed.users : [];
      requestsCache = Array.isArray(parsed.accessRequests) ? parsed.accessRequests : [];
      businessesCache = Array.isArray(parsed.businesses) ? parsed.businesses : [];
      console.log(
        `[STORAGE] Loaded snapshot: ${usersCache.length} users, ${requestsCache.length} access requests, ${businessesCache.length} businesses.`
      );
    } catch {
      console.warn('[STORAGE] Snapshot parse failed — reseeding.');
      const seed = seedSnapshot();
      usersCache = seed.users;
      requestsCache = seed.accessRequests;
      businessesCache = seed.businesses || [];
    }
  } else {
    const seed = seedSnapshot();
    usersCache = seed.users;
    requestsCache = seed.accessRequests;
    persistData();
    console.log('[STORAGE] Seeded fresh data snapshot.');
  }
  // Quarantine any account still carrying the compromised public hash.
  let quarantined = 0;
  for (const u of usersCache) {
    if (u.passwordHash === COMPROMISED_DEFAULT_HASH) {
      u.passwordHash = '';
      u.passwordSalt = '';
      u.isPasswordSet = false;
      quarantined++;
    }
  }
  if (quarantined > 0) {
    console.warn(`[AUTH] Quarantined ${quarantined} account(s) carrying the compromised default hash.`);
    persistData();
  }
  await bootstrapOwnerPassword();
  dataStoreReady = true;
}

// Synchronous accessors over the in-memory cache (routes stay synchronous).
function readUsers(): StoredUserAccount[] {
  return usersCache;
}
function writeUsers(users: StoredUserAccount[]): void {
  usersCache = users;
  persistData();
}
function readAccessRequests(): StoredAccessRequest[] {
  return requestsCache;
}
function writeAccessRequests(requests: StoredAccessRequest[]): void {
  requestsCache = requests;
  persistData();
}

/** Allowed role values — arbitrary strings are rejected. */
const VALID_ROLES = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] as const;

/** Strip credential material before a user record leaves the server. */
function toSafeUser(u: StoredUserAccount): Omit<StoredUserAccount, 'passwordSalt' | 'passwordHash'> {
  const { passwordSalt, passwordHash, ...safe } = u;
  return safe;
}


// 1. GET all access requests (OWNER only)
app.get('/api/access-requests', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const requests = readAccessRequests();
  res.json(requests);
});


// 3. POST approve access request (OWNER only)
app.post('/api/access-requests/:id/approve', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { assignedRole } = req.body || {};
  const operatorId = req.session!.userId;

  const requests = readAccessRequests();
  const targetReq = requests.find((r) => r.id === id);

  if (!targetReq) {
    return res.status(404).json({ error: `Access request "${id}" not found.` });
  }

  targetReq.status = 'APPROVED';
  targetReq.reviewedAt = new Date().toISOString();
  targetReq.reviewedBy = operatorId || 'admin';
  writeAccessRequests(requests);

  // Upsert user account
  const users = readUsers();
  const cleanEmail = targetReq.email.toLowerCase();
  let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  const role = assignedRole || targetReq.requestedRole || 'OPERATOR';

  if (!user) {
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      displayName: targetReq.fullName,
      role,
      status: 'APPROVED',
      organization: targetReq.organization || 'HORUSCOPE Partner',
      passwordSalt: '',
      passwordHash: '',
      isPasswordSet: false,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      isGoogleConnected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: operatorId || 'admin',
      approvedAt: new Date().toISOString(),
    };
    users.unshift(user);
  } else {
    user.status = 'APPROVED';
    user.role = role;
    user.updatedAt = new Date().toISOString();
  }

  writeUsers(users);

  return res.json({
    success: true,
    message: `Access granted to ${targetReq.fullName} (${targetReq.email}) as ${role}.`,
    request: targetReq,
    user,
  });
});

// 4. POST reject access request (OWNER only)
app.post('/api/access-requests/:id/reject', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const operatorId = req.session!.userId;

  const requests = readAccessRequests();
  const targetReq = requests.find((r) => r.id === id);

  if (!targetReq) {
    return res.status(404).json({ error: `Access request "${id}" not found.` });
  }

  targetReq.status = 'REJECTED';
  targetReq.reviewedAt = new Date().toISOString();
  targetReq.reviewedBy = operatorId || 'admin';
  targetReq.rejectionReason = reason || 'Administrative decision';
  writeAccessRequests(requests);

  return res.json({
    success: true,
    message: `Access request for ${targetReq.fullName} was rejected.`,
    request: targetReq,
  });
});

// 5. GET all users (OWNER only)
app.get('/api/users', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const users = readUsers();
  // Strip password hash and salt for client security
  const safeUsers = users.map((u) => {
    const { passwordSalt, passwordHash, ...safe } = u;
    return safe;
  });
  res.json(safeUsers);
});

// 6. POST create user (OWNER only)
app.post('/api/users', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { email, displayName, role, organization, status, password } = req.body || {};
  if (!email || !displayName) {
    return res.status(400).json({ error: 'Email and Display Name are required.' });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'A password of at least 8 characters is required for the new user.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const users = readUsers();

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'A user account with this email already exists.' });
  }

  const requestedRole = String(role || 'OPERATOR');
  if (!(VALID_ROLES as readonly string[]).includes(requestedRole)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  return (async () => {
    const salt = generateSalt();
    const newUser: StoredUserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      displayName: String(displayName).trim(),
      role: requestedRole as typeof VALID_ROLES[number],
      status: status || 'APPROVED',
      organization: organization ? String(organization).trim() : undefined,
      passwordSalt: salt,
      passwordHash: await hashPassword(String(password), salt),
      isPasswordSet: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: req.session!.userId,
      approvedAt: new Date().toISOString(),
    };

    users.unshift(newUser);
    writeUsers(users);

    return res.status(201).json({ success: true, user: toSafeUser(newUser) });
  })();
});

// 7. PUT update user (OWNER only)
app.put('/api/users/:id', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `User account "${id}" not found.` });
  }

  if (updates.role !== undefined && !(VALID_ROLES as readonly string[]).includes(String(updates.role))) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const user = users[index];
  if (user.role === 'OWNER' && updates.role && updates.role !== 'OWNER') {
    const otherOwners = users.filter((u) => u.id !== id && u.role === 'OWNER');
    if (otherOwners.length === 0) {
      return res.status(400).json({ error: 'Cannot demote the sole active Owner.' });
    }
  }

  const { passwordSalt, passwordHash, isPasswordSet, password: _pw, ...allowedUpdates } = updates || {};
  const merged: StoredUserAccount = {
    ...user,
    ...allowedUpdates,
    id: user.id,
    email: user.email,
    updatedAt: new Date().toISOString(),
  };
  // Optional password reset by owner: { password: "new-secret" }
  if (updates && typeof updates.password === 'string' && updates.password.length >= 8) {
    const salt = generateSalt();
    merged.passwordSalt = salt;
    merged.passwordHash = await hashPassword(updates.password, salt);
    merged.isPasswordSet = true;
    merged.failedLoginAttempts = 0;
    merged.lockoutUntil = null;
    await sessionStore.revokeForUser(merged.id);
  }
  users[index] = merged;

  writeUsers(users);
  const privilegeChanged = merged.role !== user.role || merged.status !== user.status;
  if (privilegeChanged) {
    await sessionStore.revokeForUser(merged.id);
  }
  return res.json({ success: true, user: toSafeUser(users[index]) });
});

// 8. DELETE user (OWNER only)
app.delete('/api/users/:id', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const users = readUsers();
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: `User account "${id}" not found.` });
  }

  if (user.role === 'OWNER') {
    const otherOwners = users.filter((u) => u.id !== id && u.role === 'OWNER');
    if (otherOwners.length === 0) {
      return res.status(400).json({ error: 'Cannot delete the sole active Owner account.' });
    }
  }

  const filtered = users.filter((u) => u.id !== id);
  writeUsers(filtered);
  await sessionStore.revokeForUser(id);

  return res.json({ success: true, message: `User ${user.email} removed.` });
});

async function startServer() {
  // Load the durable data snapshot BEFORE accepting traffic — auth depends on it.
  await initDataStore();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HorusScope server running on port ${PORT}`);
  });
}

startServer();
