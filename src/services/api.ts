/**
 * HoruScope - Authenticated API client (browser).
 *
 * All calls to the HoruScope backend go through here. The Bearer session
 * token issued by POST /api/auth/login is attached automatically. On a 401
 * the token is discarded so the app returns to the login gate.
 */

const TOKEN_KEY = 'horusscope_auth_token_v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

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
 * Throws ApiError on non-2xx. Clears the stored token on 401.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    // Session invalid/expired — drop it so the UI returns to login.
    setAuthToken(null);
    const { message, code } = await readError(res);
    const err = new Error(message) as ApiError;
    err.status = 401;
    err.code = code;
    throw err;
  }

  if (!res.ok) {
    const { message, code } = await readError(res);
    const err = new Error(message) as ApiError;
    err.status = res.status;
    err.code = code;
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
