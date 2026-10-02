/**
 * HorusScope - Audit Logging & Change Tracking Architecture
 * Phase 0: Technical Architecture & Foundation
 */

import { AuditActionType, AuditLog } from '../types';
import { generateStableId } from '../utils';
import { supabaseService } from '../services/supabaseService';

// Global audit store (in-memory + local storage persisted for Phase 0)
const AUDIT_STORAGE_KEY = 'horusscope_audit_logs_v0';

class AuditLoggerService {
  private logs: AuditLog[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        // Cap local storage at 500 records in phase 0 to prevent browser overflow
        const recent = this.logs.slice(-500);
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(recent));
      }
    } catch {
      // Graceful fallback if storage quota exceeded
    }
  }

  /**
   * Records an immutable audit log entry.
   */
  public log(entry: {
    actorId?: string;
    actorType?: 'USER' | 'SYSTEM_CRON' | 'SAFETY_GUARD';
    action: AuditActionType;
    entityType: AuditLog['entityType'];
    entityId: string;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    changeSummary: string;
    severity?: AuditLog['severity'];
  }): AuditLog {
    const record: AuditLog = {
      id: generateStableId('audit'),
      category: 'AUDIT_HISTORY',
      timestamp: new Date().toISOString(),
      actorId: entry.actorId || 'operator_default',
      actorType: entry.actorType || 'USER',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      previousValueSnapshot: entry.previousValue ? JSON.parse(JSON.stringify(entry.previousValue)) : null,
      newValueSnapshot: entry.newValue ? JSON.parse(JSON.stringify(entry.newValue)) : null,
      changeSummary: entry.changeSummary,
      ipAddressOrOrigin: typeof window !== 'undefined' ? window.location.origin : 'server',
      severity: entry.severity || 'INFO',
    };

    // Immutable append
    this.logs.unshift(record);
    this.saveToStorage();

    // Asynchronously replicate to Supabase audit_logs table
    supabaseService.insertAuditLog(record).catch(() => {});

    return record;
  }

  /**
   * Retrieves all audit logs with optional filtering.
   */
  public getLogs(filter?: {
    entityType?: AuditLog['entityType'];
    entityId?: string;
    action?: AuditActionType;
    limit?: number;
  }): AuditLog[] {
    let result = [...this.logs];

    if (filter?.entityType) {
      result = result.filter((l) => l.entityType === filter.entityType);
    }
    if (filter?.entityId) {
      result = result.filter((l) => l.entityId === filter.entityId);
    }
    if (filter?.action) {
      result = result.filter((l) => l.action === filter.action);
    }
    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  public getCount(): number {
    return this.logs.length;
  }

  /**
   * Clears in-memory logs (ONLY FOR TESTING HARNESS)
   */
  public _resetForTesting(): void {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    }
  }
}

export const auditService = new AuditLoggerService();
