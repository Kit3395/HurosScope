/**
 * HoruScope - Authenticated API client (browser).
 *
 * Authentication travels as an httpOnly Secure SameSite session cookie set
 * by the server — the token is never readable from JavaScript, so XSS cannot
 * steal it. All requests use `credentials: 'include'` so the cookie is sent.
 * The Authorization Bearer header is still accepted by the server for
 * programmatic access, but the UI no longer stores tokens in localStorage.
 */

export interface ApiError extends Error {
  status: number;
  code?: string;
}

async function readError(res: Response): Promise<{ message: string; code?: string }> {
  try {
    const data = await res.json();
    return {
      message: String(data.message || data.error || `Request failed (${res.status})`),
      code: data.error ? String(data.error) : undefined,
    };
  } catch {
    return { message: `Request failed (${res.status})` };
  }
}

/**
 * Authenticated fetch against the HoruScope backend.
 * Throws ApiError on non-2xx.
 *
 * On 401 the session is gone (expired/revoked) — a global
 * `horuscope:session-expired` event is dispatched so AuthContext can return
 * the user to the login gate with an explanation instead of leaving each
 * component to fail on its own.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers, credentials: 'include' });

  if (!res.ok) {
    const { message, code } = await readError(res);
    const err = new Error(message) as ApiError;
    err.status = res.status;
    err.code = code;
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('horuscope:session-expired', { detail: { path, code } }));
    }
    throw err;
  }

  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'GET' });
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  return res.json() as Promise<T>;
}

// --- Legacy token helpers (kept as no-ops for compatibility; the session
// --- cookie is now the single source of truth). New code must not use these.

/** @deprecated Session cookie is used instead. */
export function getAuthToken(): string | null {
  return null;
}

/** @deprecated Session cookie is used instead. */
export function setAuthToken(_token: string | null): void {
  // no-op
}
