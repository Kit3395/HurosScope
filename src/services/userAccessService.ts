/**
 * HoruScope - User Access & Request Approval Management Service
 *
 * The backend server is the single authority for user accounts and access
 * requests. This service keeps a local mirror (populated on login and on
 * refresh) so the UI's synchronous getters keep working; every mutation goes
 * through the authenticated API. No password material is ever held here —
 * verification happens server-side.
 */

import { UserAccount, UserAccessRequest, UserRole, UserAccountStatus } from '../types';
import { auditService } from '../audit';
import { GoogleUserProfile } from '../security/googleAuth';
import { apiGet, apiPost, apiPut, apiDelete, getAuthToken, setAuthToken } from './api';

class UserAccessService {
  private users: UserAccount[] = [];
  private requests: UserAccessRequest[] = [];
  private listeners: Set<() => void> = new Set();

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore listener errors
      }
    });
  }

  // ------------------------------------------------------------------
  // Mirror sync
  // ------------------------------------------------------------------

  /**
   * Pull the authoritative user + request lists from the server into the
   * local mirror. Non-owner sessions cannot list users; their mirror simply
   * keeps whatever it already had.
   */
  public async syncFromServer(): Promise<void> {
    if (typeof window === 'undefined' || !getAuthToken()) return;
    let changed = false;
    try {
      const users = await apiGet<UserAccount[]>('/api/users');
      this.users = users;
      changed = true;
    } catch {
      // non-owner or offline — keep current mirror
    }
    try {
      const requests = await apiGet<UserAccessRequest[]>('/api/access-requests');
      this.requests = requests;
      changed = true;
    } catch {
      // ignore
    }
    if (changed) this.notify();
  }

  /** Seed the mirror with the single signed-in user (for non-owner sessions). */
  public seedMirrorWith(users: UserAccount[]): void {
    this.users = [...users];
    this.notify();
  }

  public clearMirror(): void {
    this.users = [];
    this.requests = [];
    this.notify();
  }

  // ------------------------------------------------------------------
  // Synchronous getters over the mirror
  // ------------------------------------------------------------------

  public getAllUsers(): UserAccount[] {
    return [...this.users];
  }

  public getUserById(id: string): UserAccount | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): UserAccount | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public getAllRequests(): UserAccessRequest[] {
    return [...this.requests];
  }

  public getPendingRequests(): UserAccessRequest[] {
    return this.requests.filter((r) => r.status === 'PENDING');
  }

  public checkRequestStatus(email: string): {
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    request?: UserAccessRequest;
    user?: UserAccount;
  } {
    const norm = email.trim().toLowerCase();
    const request = this.requests.find((r) => r.email.toLowerCase() === norm);
    const user = this.getUserByEmail(norm);
    if (user && user.status === 'APPROVED') return { status: 'APPROVED', request, user };
    if (request) return { status: request.status as 'PENDING' | 'REJECTED', request, user };
    return { status: 'NONE' };
  }

  /** Legacy entry point — now just re-syncs the mirror from the server. */
  public async refreshFromSources(): Promise<void> {
    await this.syncFromServer();
  }

  // ------------------------------------------------------------------
  // Mutations (all server-side, then mirror refresh)
  // ------------------------------------------------------------------

  public async addUser(
    data: {
      email: string;
      displayName: string;
      role: UserRole;
      organization?: string;
      status?: UserAccountStatus;
      password: string;
    },
    _operatorId: string = 'system_admin'
  ): Promise<UserAccount> {
    const res = await apiPost<{ success: boolean; user: UserAccount }>('/api/users', {
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      organization: data.organization,
      status: data.status || 'APPROVED',
      password: data.password,
    });
    await this.syncFromServer();
    auditService.log({
      actorId: _operatorId,
      actorType: 'USER',
      action: 'ENTITY_CREATED',
      entityType: 'SecurityGate',
      entityId: res.user.id,
      changeSummary: `User account created for ${res.user.email} (${res.user.role}).`,
    });
    return res.user;
  }

  public async updateUser(
    id: string,
    updates: Partial<UserAccount> & { password?: string },
    operatorId: string = 'system_admin'
  ): Promise<UserAccount> {
    const res = await apiPut<{ success: boolean; user: UserAccount }>(
      `/api/users/${encodeURIComponent(id)}`,
      updates
    );
    await this.syncFromServer();
    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: id,
      changeSummary: `User account ${res.user.email} updated by administrator.`,
    });
    return res.user;
  }

  public async deleteUser(id: string, operatorId: string = 'system_admin'): Promise<boolean> {
    await apiDelete<{ success: boolean }>(`/api/users/${encodeURIComponent(id)}`);
    await this.syncFromServer();
    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'ENTITY_SOFT_DELETED',
      entityType: 'SecurityGate',
      entityId: id,
      changeSummary: `User account ${id} removed by administrator.`,
    });
    return true;
  }

  public async unlockAccount(
    userIdOrEmail: string,
    operatorId: string = 'system_admin'
  ): Promise<{ success: boolean; error?: string }> {
    const user =
      this.users.find((u) => u.id === userIdOrEmail) ||
      this.getUserByEmail(userIdOrEmail);
    if (!user) return { success: false, error: 'User account not found.' };
    try {
      await apiPut(`/api/users/${encodeURIComponent(user.id)}`, {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });
      await this.syncFromServer();
      auditService.log({
        actorId: operatorId,
        actorType: 'USER',
        action: 'CONFIGURATION_CHANGED',
        entityType: 'SecurityGate',
        entityId: user.id,
        changeSummary: `Security lockout cleared by admin for ${user.email}.`,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to unlock account.' };
    }
  }

  /**
   * Owner/admin password set (no current-password check). Self-service
   * changes should use changePassword instead.
   */
  public async setPassword(
    userIdOrEmail: string,
    newPassword: string,
    operatorId: string = 'user_self'
  ): Promise<{ success: boolean; error?: string }> {
    const user =
      this.users.find((u) => u.id === userIdOrEmail) ||
      this.getUserByEmail(userIdOrEmail);
    if (!user) return { success: false, error: 'User account not found.' };
    try {
      await apiPut(`/api/users/${encodeURIComponent(user.id)}`, { password: newPassword });
      await this.syncFromServer();
      auditService.log({
        actorId: operatorId,
        actorType: 'USER',
        action: 'CONFIGURATION_CHANGED',
        entityType: 'SecurityGate',
        entityId: user.id,
        changeSummary: `Password updated for ${user.email}.`,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  }

  /**
   * Self-service password change — the server verifies the current password.
   */
  public async changePassword(
    userIdOrEmail: string,
    currentPasswordAttempt: string,
    newPassword: string,
    _operatorId: string = 'user_self'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await apiPost<{ success: boolean; token: string; user: UserAccount }>(
        '/api/auth/change-password',
        { currentPassword: currentPasswordAttempt, newPassword }
      );
      setAuthToken(res.token);
      await this.syncFromServer();
      auditService.log({
        actorId: res.user.id,
        actorType: 'USER',
        action: 'CONFIGURATION_CHANGED',
        entityType: 'SecurityGate',
        entityId: res.user.id,
        changeSummary: `Password changed via self-service for ${res.user.email}.`,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change password.' };
    }
  }

  // ------------------------------------------------------------------
  // Access requests
  // ------------------------------------------------------------------

  public async submitAccessRequest(data: {
    fullName: string;
    email: string;
    organization: string;
    requestedRole: UserRole;
    reason: string;
  }): Promise<UserAccessRequest> {
    // Public endpoint — no token required.
    const res = await fetch('/api/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || body.message || 'Failed to submit access request.');
    const req: UserAccessRequest = body.request;
    this.requests.unshift(req);
    this.notify();
    return req;
  }

  public async approveRequest(
    requestId: string,
    assignedRole?: UserRole,
    _operatorId: string = 'system_admin'
  ): Promise<UserAccount> {
    const res = await apiPost<{ success: boolean; user: UserAccount; request: UserAccessRequest }>(
      `/api/access-requests/${encodeURIComponent(requestId)}/approve`,
      assignedRole ? { assignedRole } : {}
    );
    await this.syncFromServer();
    return res.user;
  }

  public async rejectRequest(
    requestId: string,
    reason: string = 'Administrative review determined insufficient credentials.',
    _operatorId: string = 'system_admin'
  ): Promise<UserAccessRequest> {
    const res = await apiPost<{ success: boolean; request: UserAccessRequest }>(
      `/api/access-requests/${encodeURIComponent(requestId)}/reject`,
      { reason }
    );
    await this.syncFromServer();
    return res.request;
  }

  // ------------------------------------------------------------------
  // Google account linking (profile metadata on the server user record)
  // ------------------------------------------------------------------

  public async connectGoogleAccount(
    emailOrUserId: string,
    googleProfile: GoogleUserProfile,
    operatorId: string = 'google_oauth'
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const norm = emailOrUserId.trim().toLowerCase();
    const user =
      this.users.find(
        (u) =>
          u.id === emailOrUserId ||
          u.email.toLowerCase() === (googleProfile.email || '').trim().toLowerCase() ||
          u.email.toLowerCase() === norm
      );
    if (!user) {
      return { success: false, error: 'No approved HORUSCOPE account found. Access requires an approved identity.' };
    }
    if (user.status !== 'APPROVED') {
      return { success: false, error: `Account is ${user.status}. Access blocked.` };
    }
    try {
      const res = await apiPut<{ success: boolean; user: UserAccount }>(
        `/api/users/${encodeURIComponent(user.id)}`,
        { isGoogleConnected: true, googleId: googleProfile.sub, googleEmail: googleProfile.email }
      );
      await this.syncFromServer();
      auditService.log({
        actorId: operatorId,
        actorType: 'USER',
        action: 'CONFIGURATION_CHANGED',
        entityType: 'SecurityGate',
        entityId: user.id,
        changeSummary: `Google Account linked for ${user.email}.`,
      });
      return { success: true, user: res.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to link Google account.' };
    }
  }

  public async disconnectGoogleAccount(
    userIdOrEmail: string,
    operatorId: string = 'user_self'
  ): Promise<{ success: boolean; error?: string }> {
    const norm = userIdOrEmail.trim().toLowerCase();
    const user =
      this.users.find((u) => u.id === userIdOrEmail || u.email.toLowerCase() === norm);
    if (!user) return { success: false, error: 'User account not found.' };
    try {
      await apiPut(`/api/users/${encodeURIComponent(user.id)}`, {
        isGoogleConnected: false,
        googleId: undefined,
      });
      await this.syncFromServer();
      auditService.log({
        actorId: operatorId,
        actorType: 'USER',
        action: 'CONFIGURATION_CHANGED',
        entityType: 'SecurityGate',
        entityId: user.id,
        changeSummary: `Google Account disconnected from ${user.email}.`,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to disconnect Google account.' };
    }
  }

  /**
   * Legacy "purge to clean state" entry point. The server is now the
   * authority for users, so this only clears the local mirror.
   */
  public resetToProductionState(): void {
    this.clearMirror();
  }
}

export const userAccessService = new UserAccessService();
