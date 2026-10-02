/**
 * HorusScope - Security, Privacy Guards & Rate Limit Enforcement
 * Phase 0: Technical Architecture & Foundation
 */

import { PRIVACY_POLICIES, RATE_LIMIT_CONFIG } from '../config';

/**
 * Token Bucket Rate Limiter with Exponential Backoff
 * Prevents rapid-fire requests, infinite retry loops, and unthrottled API consumption.
 */
export class ClientRateLimiter {
  private requestsTimestamps: number[] = [];
  private readonly maxPerMinute: number;
  private readonly burstLimit: number;
  private readonly cooldownMs: number;
  private isCoolingDown: boolean = false;

  constructor(maxPerMinute: number, burstLimit: number, cooldownMs: number) {
    this.maxPerMinute = maxPerMinute;
    this.burstLimit = burstLimit;
    this.cooldownMs = cooldownMs;
  }

  public canProceed(): { allowed: boolean; waitMs: number; reason?: string } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Prune entries older than 1 minute
    this.requestsTimestamps = this.requestsTimestamps.filter((ts) => ts > oneMinuteAgo);

    if (this.isCoolingDown) {
      return { allowed: false, waitMs: this.cooldownMs, reason: 'Rate limiter cooling down' };
    }

    // Check burst limit in past 5 seconds
    const fiveSecondsAgo = now - 5000;
    const recentBurst = this.requestsTimestamps.filter((ts) => ts > fiveSecondsAgo).length;
    if (recentBurst >= this.burstLimit) {
      this.isCoolingDown = true;
      setTimeout(() => {
        this.isCoolingDown = false;
      }, this.cooldownMs);
      return {
        allowed: false,
        waitMs: this.cooldownMs,
        reason: `Burst allowance exceeded (${this.burstLimit} req/5s). Cooldown triggered.`,
      };
    }

    // Check minute limit
    if (this.requestsTimestamps.length >= this.maxPerMinute) {
      const oldest = this.requestsTimestamps[0];
      const waitMs = Math.max(100, 60000 - (now - oldest));
      return {
        allowed: false,
        waitMs,
        reason: `Minute rate limit reached (${this.maxPerMinute}/min).`,
      };
    }

    this.requestsTimestamps.push(now);
    return { allowed: true, waitMs: 0 };
  }

  public getRemainingQuota(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestsTimestamps = this.requestsTimestamps.filter((ts) => ts > oneMinuteAgo);
    return Math.max(0, this.maxPerMinute - this.requestsTimestamps.length);
  }
}

// Global service limiters
export const placesRateLimiter = new ClientRateLimiter(
  RATE_LIMIT_CONFIG.googlePlacesApi.maxRequestsPerMinute,
  RATE_LIMIT_CONFIG.googlePlacesApi.burstLimit,
  RATE_LIMIT_CONFIG.googlePlacesApi.cooldownMs
);

export const aiRateLimiter = new ClientRateLimiter(
  RATE_LIMIT_CONFIG.geminiAiApi.maxRequestsPerMinute,
  RATE_LIMIT_CONFIG.geminiAiApi.burstLimit,
  RATE_LIMIT_CONFIG.geminiAiApi.cooldownMs
);

/**
 * Executes an async operation with strict retry capping and exponential backoff.
 * Hard limit: Never exceeds RATE_LIMIT_CONFIG.maxRetryAttempts (prevents infinite retry loops).
 */
export async function executeWithRetryProtection<T>(
  operationName: string,
  operation: (attempt: number) => Promise<T>,
  onRetry?: (attempt: number, error: Error, waitMs: number) => void
): Promise<T> {
  const maxAttempts = RATE_LIMIT_CONFIG.maxRetryAttempts;
  let lastError: Error = new Error(`Operation ${operationName} failed without error`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt === maxAttempts) {
        break; // Hard stop - no infinite retries
      }

      const backoffMs =
        RATE_LIMIT_CONFIG.initialRetryDelayMs *
        Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt - 1);

      if (onRetry) {
        onRetry(attempt, lastError, backoffMs);
      }

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(
    `[RetryGuard] ${operationName} exceeded maximum capped attempts (${maxAttempts}). Stopped to prevent infinite loop. Last error: ${lastError.message}`
  );
}

/**
 * Privacy & Prohibited Data Field Scanner.
 * Rejects or strips illicit fields like passwords, SSNs, credit cards.
 */
export function sanitizeAndValidatePrivacyPayload(
  payload: Record<string, unknown>
): { isValid: boolean; violations: string[]; sanitized: Record<string, unknown> } {
  const violations: string[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    const isProhibited = PRIVACY_POLICIES.prohibitedDataFields.some((field) =>
      lowerKey.includes(field)
    );

    if (isProhibited) {
      violations.push(`Field '${key}' is prohibited under legitimate prospecting privacy policies.`);
      continue; // Strip illicit field
    }

    sanitized[key] = value;
  }

  return {
    isValid: violations.length === 0,
    violations,
    sanitized,
  };
}

/**
 * Confirmation validation for destructive and bulk actions.
 */
export interface ConfirmationToken {
  actionType: 'DELETE' | 'RESTORE' | 'BULK_UPDATE' | 'BULK_DELETE';
  entityIdOrCount: string;
  confirmedByUser: boolean;
  confirmationPhrase?: string;
  timestamp: string;
}

export function assertExplicitConfirmation(
  token: ConfirmationToken,
  expectedPhrase?: string
): boolean {
  if (!token.confirmedByUser) {
    throw new Error(`[SecurityGuard] Action ${token.actionType} was aborted: User did not explicitly confirm.`);
  }

  if (expectedPhrase && token.confirmationPhrase !== expectedPhrase) {
    throw new Error(
      `[SecurityGuard] Action ${token.actionType} aborted: Confirmation phrase mismatch. Expected "${expectedPhrase}".`
    );
  }

  return true;
}
