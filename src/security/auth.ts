/**
 * HorusScope - Authentication & Role-Based Access Control (RBAC)
 * Production Safety-Net Layer
 */

import { CurrentUserSession, UserPermission, UserRole } from '../types';
import { auditService } from '../audit';

// Role permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  OWNER: [
    'VIEW_RECORDS',
    'EDIT_RECORDS',
    'DELETE_LEADS',
    'MERGE_RECORDS',
    'SEND_OUTREACH',
    'BULK_OUTREACH',
    'CHANGE_PRICING',
    'FINALIZE_PROPOSAL',
    'BULK_IMPORT',
    'BULK_DELETE',
    'CHANGE_SYSTEM_CONFIG',
    'MANAGE_BACKUPS',
    'OVERRIDE_AI_GUARDRAILS',
    'MANAGE_USERS',
    'APPROVE_USER_REQUESTS',
  ],
  ADMIN: [
    'VIEW_RECORDS',
    'EDIT_RECORDS',
    'DELETE_LEADS',
    'MERGE_RECORDS',
    'SEND_OUTREACH',
    'BULK_OUTREACH',
    'CHANGE_PRICING',
    'FINALIZE_PROPOSAL',
    'BULK_IMPORT',
    'BULK_DELETE',
    'MANAGE_BACKUPS',
    'MANAGE_USERS',
    'APPROVE_USER_REQUESTS',
  ],
  OPERATOR: [
    'VIEW_RECORDS',
    'EDIT_RECORDS',
    'SEND_OUTREACH',
    'BULK_IMPORT',
  ],
  VIEWER: [
    'VIEW_RECORDS',
  ],
};

const DEFAULT_SESSION: CurrentUserSession = {
  userId: 'usr_sec_owner_kieth',
  displayName: 'Kieth Ryan Gonzales',
  email: 'kiethryangonzales@gmail.com',
  role: 'OWNER',
  sessionStartedAt: new Date().toISOString(),
  ipAddress: '127.0.0.1 (Local Session)',
  activePermissions: ROLE_PERMISSIONS['OWNER'],
};

const AUTH_STORAGE_KEY = 'horusscope_auth_session_v1';

class AuthService {
  private session: CurrentUserSession;
  private listeners: Set<(session: CurrentUserSession) => void> = new Set();

  constructor() {
    this.session = this.loadSession();
  }

  private loadSession(): CurrentUserSession {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.activePermissions = ROLE_PERMISSIONS[parsed.role as UserRole] || ROLE_PERMISSIONS['OPERATOR'];
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return { ...DEFAULT_SESSION };
  }

  private saveSession(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.session));
      } catch {
        // Ignore
      }
    }
    this.notify();
  }

  public getSession(): CurrentUserSession {
    return { ...this.session };
  }

  public hasPermission(permission: UserPermission): boolean {
    return this.session.activePermissions.includes(permission);
  }

  public switchRole(role: UserRole): CurrentUserSession {
    const previousRole = this.session.role;
    this.session = {
      ...this.session,
      role,
      activePermissions: ROLE_PERMISSIONS[role],
    };

    auditService.log({
      actorId: this.session.userId,
      actorType: 'USER',
      action: 'AUTH_ROLE_SWITCHED',
      entityType: 'SecurityGate',
      entityId: this.session.userId,
      changeSummary: `User role switched from ${previousRole} to ${role}. Active permissions updated.`,
      previousValue: { role: previousRole },
      newValue: { role, permissions: ROLE_PERMISSIONS[role] },
    });

    this.saveSession();
    return this.session;
  }

  public subscribe(callback: (session: CurrentUserSession) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb({ ...this.session }));
  }

  public getRolePermissions(role: UserRole): UserPermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}

export const authService = new AuthService();
