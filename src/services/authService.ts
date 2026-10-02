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

import { userAccessService } from './userAccessService';
import { UserAccount } from '../types';

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: UserAccount;
  isLocked?: boolean;
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
   * Authenticate user credentials safely
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

      // Delegate to verification layer
      const result = await userAccessService.verifyCredentials(cleanEmail, password);

      if (result.success && result.user) {
        // Handle remember me preference
        this.setRememberedEmail(cleanEmail, rememberMe);

        return {
          success: true,
          user: result.user,
        };
      }

      // Check for security lockouts
      if (result.isLocked) {
        return {
          success: false,
          isLocked: true,
          error: result.error || 'Account is temporarily locked. Please try again later.',
        };
      }

      // Provide standard, secure error message without leaking user existence
      const userMessage = result.error?.includes('attempt')
        ? result.error
        : 'Invalid email or password.';

      return {
        success: false,
        error: userMessage,
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

  public isBusy(): boolean {
    return this.isProcessing;
  }
}

export const authService = new AuthService();
