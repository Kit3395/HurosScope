/**
 * HoruScope - Client Authentication Service
 * 
 * Provides isolated authentication operations. Separates UI components from
 * underlying credential verification logic.
 * 
 * Security rules enforced:
 * - Passwords are never logged or stored in plaintext.
 * - Technical database/API errors are sanitized before reaching UI.
 * - Concurrent login attempts are guarded.
 */

import { UserAccount } from '../types';

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: UserAccount;
  isLocked?: boolean;
  remainingAttempts?: number;
}

const REMEMBERED_EMAIL_KEY = 'horusscope_auth_remembered_email_v1';

class AuthService {
  private isProcessing = false;

  /**
   * Check if an email was previously remembered for convenience
   */
  public getRememberedEmail(): string {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  }

  /**
   * Save or remove remembered email
   */
  public setRememberedEmail(email: string, remember: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      if (remember && email.trim()) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch {
      // Ignore local storage errors
    }
  }

  /**
   * Authenticate against the HoruScope backend. Credentials are verified
   * server-side; on success a Bearer session token is stored for API calls.
   */
  public async authenticate(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<AuthResponse> {
    if (this.isProcessing) {
      return {
        success: false,
        error: 'Authentication request is already in progress.',
      };
    }

    this.isProcessing = true;

    try {
      const cleanEmail = email.trim().toLowerCase();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        // Server sets the httpOnly session cookie; nothing to store locally.
        this.setRememberedEmail(cleanEmail, rememberMe);
        return { success: true, user: data.user as UserAccount };
      }

      if (res.status === 401 && data.isLocked) {
        return {
          success: false,
          isLocked: true,
          error: data.message || 'Account is temporarily locked. Please try again later.',
        };
      }

      return {
        success: false,
        error: data.message || 'Invalid email or password.',
        remainingAttempts:
          typeof data.remainingAttempts === 'number' ? data.remainingAttempts : undefined,
      };
    } catch (err: unknown) {
      // Never expose technical or stack trace errors
      return {
        success: false,
        error: 'Unable to sign in right now. Please try again.',
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /** End the server session (clears the httpOnly cookie). */
  public async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }

  public isBusy(): boolean {
    return this.isProcessing;
  }
}

export const authService = new AuthService();
