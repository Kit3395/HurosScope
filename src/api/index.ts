/**
 * HorusScope - Secure Client API Layer
 * Phase 0: Technical Architecture & Foundation
 * 
 * CORE PRINCIPLE:
 * - Never expose API keys or secrets in frontend code.
 * - Guard against repeat API calls during React render cycles (request deduplication and caching).
 * - Capped retries to avoid infinite loops.
 */

import { executeWithRetryProtection } from '../security';
import { SystemHealth } from '../types';

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

const apiCache = new Map<string, CachedEntry<unknown>>();
const CACHE_TTL_MS = 10000; // 10-second deduplication cache against render loops

export const apiClient = {
  /**
   * Safe fetch with caching to prevent render-loop storming.
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const cacheKey = 'system_health';
    const cached = apiCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as SystemHealth;
    }

    return executeWithRetryProtection('getSystemHealth', async () => {
      const response = await fetch('/api/system/health');
      if (!response.ok) {
        throw new Error(`Failed to fetch system health: HTTP ${response.status}`);
      }
      const data = await response.json();
      apiCache.set(cacheKey, { data, timestamp: now });
      return data as SystemHealth;
    });
  },

  async pingBackend(): Promise<{ status: string; timestamp: string }> {
    return executeWithRetryProtection('pingBackend', async () => {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`Health ping failed: HTTP ${res.status}`);
      }
      return res.json();
    });
  },
};
