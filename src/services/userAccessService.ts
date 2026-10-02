/**
 * HorusScope - User Access & Request Approval Management Service
 * 
 * Manages user accounts, role-based permissions, access requests queue,
 * one-click administrative approvals, user edits/suspensions, and deletion.
 */

import { UserAccount, UserAccessRequest, UserRole, UserAccountStatus } from '../types';
import { auditService } from '../audit';
import { supabaseService } from './supabaseService';
import { hashPassword, generateSalt, verifyPassword, evaluatePasswordStrength } from '../security/crypto';
import { GoogleUserProfile } from '../security/googleAuth';

const USERS_STORAGE_KEY = 'horusscope_users_registry_v1';
const REQUESTS_STORAGE_KEY = 'horusscope_access_requests_v1';

// Default master credentials for Kieth Ryan Gonzales (Owner)
// Master Password: HorusScope@2026!
const DEFAULT_OWNER_SALT = 'horus_salt_kieth_owner_2026';
const DEFAULT_OWNER_HASH = 'c3fd23514a9c3b03255bbc3a5cb1c01d21c5746778db75c41c467f454c6d87f5';

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr_owner_kieth',
    email: 'kiethryangonzales@gmail.com',
    displayName: 'Kieth Ryan Gonzales',
    role: 'OWNER',
    status: 'APPROVED',
    organization: 'HORUSCOPE Sovereign Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    passwordSalt: DEFAULT_OWNER_SALT,
    passwordHash: DEFAULT_OWNER_HASH,
    isPasswordSet: true,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    isGoogleConnected: false,
    googleEmail: 'kiethryangonzales@gmail.com',
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
    lastLoginAt: '2026-09-15T08:00:00.000Z',
    approvedBy: 'SYSTEM_SUPERADMIN',
    approvedAt: '2026-08-01T08:00:00.000Z',
  },
];

const INITIAL_REQUESTS: UserAccessRequest[] = [
  {
    id: 'req_kit_g3nity',
    email: 'kit.g3nity@gmail.com',
    fullName: 'Kit G',
    organization: 'TEst',
    requestedRole: 'OPERATOR',
    reason: 'test',
    status: 'PENDING',
    submittedAt: '2026-09-17T06:30:00.000Z',
  },
];

class UserAccessService {
  private users: UserAccount[] = [];
  private requests: UserAccessRequest[] = [];
  private listeners: Set<() => void> = new Set();
  private hasInitializedSync: boolean = false;

  constructor() {
    this.loadState();
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === USERS_STORAGE_KEY || e.key === REQUESTS_STORAGE_KEY) {
          this.loadState();
          this.notify();
        }
      });

      window.addEventListener('focus', () => {
        this.loadState();
        this.refreshFromSources();
      });

      // Background sync on startup
      if (!this.hasInitializedSync) {
        this.hasInitializedSync = true;
        setTimeout(() => {
          this.refreshFromSources();
        }, 100);
      }
    }
  }

  private loadState() {
    if (typeof window !== 'undefined') {
      try {
        const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          // Purge any legacy demo/filler users (@horusscope.agency or mock IDs)
          const filtered = (parsed || []).filter((u: UserAccount) => {
            const email = u.email?.toLowerCase() || '';
            return !email.endsWith('@horusscope.agency') && !['usr_director_01', 'usr_admin_02', 'usr_operator_03', 'usr_viewer_04'].includes(u.id);
          });

          // Ensure essential bootstrap user (Owner kiethryangonzales@gmail.com) is always present and approved
          const hasOwner = filtered.some((u: UserAccount) => u.email?.toLowerCase() === 'kiethryangonzales@gmail.com');
          if (!hasOwner) {
            filtered.unshift(INITIAL_USERS[0]);
          }

          // Upgrade all accounts with security fields if missing
          filtered.forEach((u: UserAccount) => {
            if (u.email?.toLowerCase() === 'kiethryangonzales@gmail.com') {
              if (!u.passwordSalt || !u.passwordHash) {
                u.passwordSalt = DEFAULT_OWNER_SALT;
                u.passwordHash = DEFAULT_OWNER_HASH;
                u.isPasswordSet = true;
              }
              if (u.isGoogleConnected === undefined) {
                u.isGoogleConnected = false;
                u.googleEmail = 'kiethryangonzales@gmail.com';
              }
            } else if (!u.passwordSalt || !u.passwordHash) {
              // Ensure any approved user has default protection
              u.passwordSalt = DEFAULT_OWNER_SALT;
              u.passwordHash = DEFAULT_OWNER_HASH;
              u.isPasswordSet = true;
            }
          });

          this.users = filtered;
          this.saveUsers();
        } else {
          this.users = [...INITIAL_USERS];
          this.saveUsers();
        }

        const storedRequests = localStorage.getItem(REQUESTS_STORAGE_KEY);
        if (storedRequests) {
          const parsedReqs = JSON.parse(storedRequests);
          // Purge legacy demo requests
          const filteredReqs = (parsedReqs || []).filter((r: UserAccessRequest) => {
            return !['req_access_01', 'req_access_02'].includes(r.id);
          });

          // Ensure Kit G is present if not already in users or requests
          const kitInUsers = this.users.some(
            (u) => u.email?.toLowerCase() === 'kit.g3nity@gmail.com'
          );
          const kitInReqs = filteredReqs.some(
            (r: UserAccessRequest) => r.email?.toLowerCase() === 'kit.g3nity@gmail.com'
          );

          if (!kitInUsers && !kitInReqs) {
            filteredReqs.unshift(INITIAL_REQUESTS[0]);
          }

          this.requests = filteredReqs;
          this.saveRequests();
        } else {
          this.requests = [...INITIAL_REQUESTS];
          this.saveRequests();
        }
      } catch {
        this.users = [...INITIAL_USERS];
        this.requests = [...INITIAL_REQUESTS];
      }
    } else {
      this.users = [...INITIAL_USERS];
      this.requests = [...INITIAL_REQUESTS];
    }
  }

  private saveUsers() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  private saveRequests() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(this.requests));
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  // ==========================================
  // USER ACCOUNTS MANAGEMENT
  // ==========================================

  public getAllUsers(): UserAccount[] {
    return [...this.users];
  }

  public getUserById(id: string): UserAccount | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): UserAccount | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public addUser(
    data: {
      email: string;
      displayName: string;
      role: UserRole;
      organization?: string;
      status?: UserAccountStatus;
    },
    operatorId: string = 'system_admin'
  ): UserAccount {
    const existing = this.getUserByEmail(data.email);
    if (existing) {
      throw new Error(`A user account with email "${data.email}" already exists.`);
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: data.email.trim().toLowerCase(),
      displayName: data.displayName.trim(),
      role: data.role,
      status: data.status || 'APPROVED',
      organization: data.organization?.trim() || 'HorusScope Workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: operatorId,
      approvedAt: new Date().toISOString(),
    };

    this.users = [newUser, ...this.users];
    this.saveUsers();

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: newUser.id,
      changeSummary: `Admin created user ${newUser.displayName} (${newUser.email}) with role ${newUser.role}.`,
      newValue: { id: newUser.id, email: newUser.email, role: newUser.role },
    });

    return newUser;
  }

  public updateUser(
    id: string,
    updates: Partial<Pick<UserAccount, 'displayName' | 'role' | 'status' | 'organization'>>,
    operatorId: string = 'system_admin'
  ): UserAccount {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`User account "${id}" not found.`);
    }

    const targetUser = this.users[index];

    // Safety: Protect last OWNER from being demoted or suspended
    if (targetUser.role === 'OWNER' && (updates.role && updates.role !== 'OWNER' || updates.status === 'SUSPENDED')) {
      const otherOwners = this.users.filter((u) => u.id !== id && u.role === 'OWNER' && u.status === 'APPROVED');
      if (otherOwners.length === 0) {
        throw new Error('Cannot demote or suspend the sole active Owner of the system.');
      }
    }

    const previous = { ...targetUser };
    const updatedUser: UserAccount = {
      ...targetUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.users[index] = updatedUser;
    this.saveUsers();

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: id,
      changeSummary: `User ${targetUser.email} updated: ${Object.keys(updates).join(', ')}.`,
      previousValue: previous as unknown as Record<string, unknown>,
      newValue: updatedUser as unknown as Record<string, unknown>,
    });

    return updatedUser;
  }

  public deleteUser(id: string, operatorId: string = 'system_admin'): boolean {
    const user = this.getUserById(id);
    if (!user) {
      throw new Error(`User account "${id}" not found.`);
    }

    // Safety: cannot delete sole owner
    if (user.role === 'OWNER') {
      const otherOwners = this.users.filter((u) => u.id !== id && u.role === 'OWNER');
      if (otherOwners.length === 0) {
        throw new Error('Cannot delete the last remaining Owner account.');
      }
    }

    this.users = this.users.filter((u) => u.id !== id);
    this.saveUsers();

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: id,
      changeSummary: `Revoked and deleted user account ${user.displayName} (${user.email}).`,
      previousValue: user as unknown as Record<string, unknown>,
    });

    return true;
  }

  // ==========================================
  // ACCESS REQUESTS QUEUE & APPROVALS
  // ==========================================

  public getAllRequests(): UserAccessRequest[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.requests = parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return [...this.requests];
  }

  public getPendingRequests(): UserAccessRequest[] {
    return this.getAllRequests().filter((r) => r.status === 'PENDING');
  }

  public async refreshFromSources(): Promise<void> {
    if (typeof window === 'undefined') return;

    let hasUpdates = false;

    // 1. Backend Server API Sync
    try {
      const res = await fetch('/api/access-requests');
      if (res.ok) {
        const serverReqs: UserAccessRequest[] = await res.json();
        if (Array.isArray(serverReqs) && serverReqs.length > 0) {
          const current = [...this.requests];
          for (const sReq of serverReqs) {
            const idx = current.findIndex(
              (r) => r.id === sReq.id || r.email.toLowerCase() === sReq.email.toLowerCase()
            );
            if (idx === -1) {
              current.unshift(sReq);
              hasUpdates = true;
            } else if (current[idx].status !== sReq.status) {
              current[idx] = { ...current[idx], ...sReq };
              hasUpdates = true;
            }
          }
          if (hasUpdates) {
            this.requests = current;
            this.saveRequests();
          }
        }
      }
    } catch {
      // offline fallback
    }

    // 2. Supabase Table Sync (if configured)
    try {
      const sbReqs = await supabaseService.fetchAccessRequests();
      if (Array.isArray(sbReqs) && sbReqs.length > 0) {
        const current = [...this.requests];
        for (const sbReq of sbReqs) {
          const idx = current.findIndex(
            (r) => r.id === sbReq.id || r.email.toLowerCase() === sbReq.email.toLowerCase()
          );
          if (idx === -1) {
            current.unshift(sbReq);
            hasUpdates = true;
          } else if (current[idx].status !== sbReq.status) {
            current[idx] = { ...current[idx], ...sbReq };
            hasUpdates = true;
          }
        }
        if (hasUpdates) {
          this.requests = current;
          this.saveRequests();
        }
      }
    } catch {
      // offline fallback
    }

    if (hasUpdates) {
      this.notify();
    }
  }

  public submitAccessRequest(data: {
    email: string;
    fullName: string;
    organization: string;
    requestedRole: UserRole;
    reason: string;
  }): UserAccessRequest {
    const emailNorm = data.email.trim().toLowerCase();

    // Check if user is already registered
    const existingUser = this.getUserByEmail(emailNorm);
    if (existingUser && existingUser.status === 'APPROVED') {
      throw new Error('An approved account with this email already exists. Please log in directly.');
    }

    // Check existing pending requests
    const existingReq = this.requests.find((r) => r.email.toLowerCase() === emailNorm && r.status === 'PENDING');
    if (existingReq) {
      throw new Error('An access request for this email is already awaiting administrator review.');
    }

    const newRequest: UserAccessRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: emailNorm,
      fullName: data.fullName.trim(),
      organization: data.organization.trim(),
      requestedRole: data.requestedRole,
      reason: data.reason.trim(),
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    this.requests = [newRequest, ...this.requests];
    this.saveRequests();

    // Push to server API in background
    if (typeof window !== 'undefined') {
      fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newRequest.email,
          fullName: newRequest.fullName,
          organization: newRequest.organization,
          requestedRole: newRequest.requestedRole,
          reason: newRequest.reason,
        }),
      }).catch(() => {});

      supabaseService.insertAccessRequest(newRequest).catch(() => {});
    }

    auditService.log({
      actorId: 'anonymous_applicant',
      actorType: 'SAFETY_GUARD',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: newRequest.id,
      changeSummary: `New access request submitted by ${newRequest.fullName} (${newRequest.email}) for ${newRequest.requestedRole} role.`,
    });

    return newRequest;
  }

  public approveRequest(
    requestId: string,
    assignedRole?: UserRole,
    operatorId: string = 'system_admin'
  ): UserAccount {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error(`Access request "${requestId}" not found.`);
    }

    if (req.status !== 'PENDING') {
      throw new Error(`Request has already been marked as ${req.status}.`);
    }

    const finalRole: UserRole = assignedRole || req.requestedRole || 'OPERATOR';

    // Update request state
    req.status = 'APPROVED';
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = operatorId;
    this.saveRequests();

    // Check if user already has an existing account (e.g. was pending/suspended)
    let user = this.getUserByEmail(req.email);
    if (user) {
      user.status = 'APPROVED';
      user.role = finalRole;
      user.organization = req.organization;
      user.updatedAt = new Date().toISOString();
      user.approvedBy = operatorId;
      user.approvedAt = new Date().toISOString();
      this.saveUsers();
    } else {
      user = this.addUser(
        {
          email: req.email,
          displayName: req.fullName,
          role: finalRole,
          organization: req.organization,
          status: 'APPROVED',
        },
        operatorId
      );
    }

    // Sync to backend and Supabase in background
    if (typeof window !== 'undefined') {
      fetch(`/api/access-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedRole: finalRole, operatorId }),
      }).catch(() => {});

      supabaseService.updateAccessRequest(requestId, {
        status: 'APPROVED',
        reviewedAt: new Date().toISOString(),
        reviewedBy: operatorId,
      }).catch(() => {});

      supabaseService.upsertUser(user).catch(() => {});
    }

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'HUMAN_APPROVAL_GRANTED',
      entityType: 'SecurityGate',
      entityId: requestId,
      changeSummary: `Admin approved access request for ${req.fullName} (${req.email}) with ${finalRole} permissions.`,
      newValue: { requestId, userEmail: user.email },
    });

    return user;
  }

  public rejectRequest(
    requestId: string,
    reason: string = 'Administrative review determined insufficient credentials.',
    operatorId: string = 'system_admin'
  ): UserAccessRequest {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error(`Access request "${requestId}" not found.`);
    }

    req.status = 'REJECTED';
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = operatorId;
    req.rejectionReason = reason;
    this.saveRequests();

    // Sync to backend and Supabase in background
    if (typeof window !== 'undefined') {
      fetch(`/api/access-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, operatorId }),
      }).catch(() => {});

      supabaseService.updateAccessRequest(requestId, {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedAt: new Date().toISOString(),
        reviewedBy: operatorId,
      }).catch(() => {});
    }

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'HUMAN_APPROVAL_REJECTED',
      entityType: 'SecurityGate',
      entityId: requestId,
      changeSummary: `Admin rejected access request for ${req.fullName} (${req.email}): ${reason}`,
    });

    return req;
  }

  public checkRequestStatus(email: string): { status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'; request?: UserAccessRequest; user?: UserAccount } {
    const norm = email.trim().toLowerCase();
    const user = this.getUserByEmail(norm);
    if (user && user.status === 'APPROVED') {
      return { status: 'APPROVED', user };
    }

    const req = this.requests.find((r) => r.email.toLowerCase() === norm);
    if (req) {
      return { status: req.status, request: req, user };
    }

    return { status: 'NONE' };
  }

  // ==========================================
  // AUTHENTICATION & CREDENTIAL SECURITY ENGINE
  // ==========================================

  /**
   * Cryptographically verify email and password combination.
   * Protects against brute-force attacks with progressive lockout.
   */
  public async verifyCredentials(
    email: string,
    passwordAttempt: string
  ): Promise<{
    success: boolean;
    error?: string;
    user?: UserAccount;
    remainingAttempts?: number;
    isLocked?: boolean;
  }> {
    const normEmail = email.trim().toLowerCase();
    const user = this.getUserByEmail(normEmail);

    if (!user) {
      return {
        success: false,
        error: 'No registered account found with this email address. Please request access first.',
      };
    }

    if (user.status !== 'APPROVED') {
      return {
        success: false,
        error: `Account access is currently ${user.status}. Please contact an administrator.`,
      };
    }

    // Check account lockout status
    if (user.lockoutUntil) {
      const lockDate = new Date(user.lockoutUntil);
      if (lockDate.getTime() > Date.now()) {
        const remainingMinutes = Math.ceil((lockDate.getTime() - Date.now()) / 60000);
        return {
          success: false,
          isLocked: true,
          error: `Account is temporarily locked due to 5 consecutive failed login attempts. Security cooldown expires in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`,
        };
      } else {
        // Lockout expired, reset failed counter
        user.lockoutUntil = null;
        user.failedLoginAttempts = 0;
        this.saveUsers();
      }
    }

    // Passwords are strictly required - reject empty passwords
    if (!passwordAttempt || !passwordAttempt.trim()) {
      return {
        success: false,
        error: 'Password is required. Direct unauthorized access is strictly blocked.',
      };
    }

    // Ensure account has salt and hash configured
    const salt = user.passwordSalt || DEFAULT_OWNER_SALT;
    const expectedHash = user.passwordHash || DEFAULT_OWNER_HASH;

    const isValid = await verifyPassword(passwordAttempt, salt, expectedHash);

    if (!isValid) {
      const currentAttempts = (user.failedLoginAttempts || 0) + 1;
      user.failedLoginAttempts = currentAttempts;

      const remaining = Math.max(0, 5 - currentAttempts);

      if (currentAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        this.saveUsers();

        auditService.log({
          actorId: normEmail,
          actorType: 'SAFETY_GUARD',
          action: 'CONFIGURATION_CHANGED',
          entityType: 'SecurityGate',
          entityId: user.id,
          changeSummary: `Brute-force security lock triggered for ${normEmail}. Account suspended for 15 minutes.`,
        });

        return {
          success: false,
          isLocked: true,
          remainingAttempts: 0,
          error: 'Security Lockout Triggered: 5 failed attempts reached. Account locked for 15 minutes to protect your credentials.',
        };
      }

      this.saveUsers();

      auditService.log({
        actorId: normEmail,
        actorType: 'SAFETY_GUARD',
        action: 'CONFIGURATION_CHANGED',
        entityType: 'SecurityGate',
        entityId: user.id,
        changeSummary: `Failed password attempt (${currentAttempts}/5) for ${normEmail}.`,
      });

      return {
        success: false,
        remainingAttempts: remaining,
        error: `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before security lockout.`,
      };
    }

    // Credentials Verified Successfully
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLoginAt = new Date().toISOString();
    this.saveUsers();

    auditService.log({
      actorId: user.id,
      actorType: 'USER',
      action: 'HUMAN_APPROVAL_GRANTED',
      entityType: 'SecurityGate',
      entityId: user.id,
      changeSummary: `Cryptographic authentication verified for ${user.displayName} (${user.email}).`,
    });

    return {
      success: true,
      user,
    };
  }

  /**
   * Set or update password for a user account using cryptographic salt + hash
   */
  public async setPassword(
    userIdOrEmail: string,
    newPassword: string,
    operatorId: string = 'user_self'
  ): Promise<{ success: boolean; error?: string }> {
    const norm = userIdOrEmail.trim().toLowerCase();
    const user = this.users.find((u) => u.id === userIdOrEmail || u.email.toLowerCase() === norm);

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const strength = evaluatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return {
        success: false,
        error: `Password does not meet enterprise security requirements: ${strength.feedback.join('. ')}`,
      };
    }

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);

    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.isPasswordSet = true;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.updatedAt = new Date().toISOString();

    this.saveUsers();

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: user.id,
      changeSummary: `Password cryptographically updated and salted for ${user.email}.`,
    });

    return { success: true };
  }

  /**
   * Verified self-service password change: verifies current password before updating
   */
  public async changePassword(
    userIdOrEmail: string,
    currentPasswordAttempt: string,
    newPassword: string,
    operatorId: string = 'user_self'
  ): Promise<{ success: boolean; error?: string }> {
    const norm = userIdOrEmail.trim().toLowerCase();
    const user = this.users.find((u) => u.id === userIdOrEmail || u.email.toLowerCase() === norm);

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const verifyRes = await this.verifyCredentials(user.email, currentPasswordAttempt);
    if (!verifyRes.success) {
      return { success: false, error: verifyRes.error || 'Current password verification failed.' };
    }

    return this.setPassword(user.id, newPassword, operatorId);
  }

  /**
   * Connect and verify a Google Account for an approved user
   */
  public async connectGoogleAccount(
    emailOrUserId: string,
    googleProfile: GoogleUserProfile,
    operatorId: string = 'google_oauth'
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const targetEmail = (googleProfile.email || '').trim().toLowerCase();
    const normParam = emailOrUserId.trim().toLowerCase();

    // Locate the approved user account by ID or Google email
    let user = this.users.find(
      (u) => u.id === emailOrUserId || u.email.toLowerCase() === targetEmail || u.email.toLowerCase() === normParam
    );

    if (!user) {
      // Check if user is Kieth Ryan Gonzales (Owner)
      if (targetEmail === 'kiethryangonzales@gmail.com') {
        user = this.getUserByEmail('kiethryangonzales@gmail.com');
      }
    }

    if (!user) {
      return {
        success: false,
        error: `No approved HORUSCOPE account found matching Google account "${googleProfile.email}". Access requires an approved identity.`,
      };
    }

    if (user.status !== 'APPROVED') {
      return {
        success: false,
        error: `Account associated with Google email "${googleProfile.email}" is ${user.status}. Access blocked.`,
      };
    }

    // Link Google credentials
    user.googleId = googleProfile.sub;
    user.googleEmail = googleProfile.email;
    user.isGoogleConnected = true;
    user.googleLinkedAt = new Date().toISOString();
    if (googleProfile.picture) {
      user.avatarUrl = googleProfile.picture;
    }
    user.lastLoginAt = new Date().toISOString();
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.updatedAt = new Date().toISOString();

    this.saveUsers();

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'HUMAN_APPROVAL_GRANTED',
      entityType: 'SecurityGate',
      entityId: user.id,
      changeSummary: `Google Account connected for ${user.email} (Google ID: ${googleProfile.sub}). Authenticated via Google OAuth.`,
    });

    return { success: true, user };
  }

  /**
   * Disconnect a Google Account from a user profile
   */
  public disconnectGoogleAccount(
    userIdOrEmail: string,
    operatorId: string = 'user_self'
  ): { success: boolean; error?: string } {
    const norm = userIdOrEmail.trim().toLowerCase();
    const user = this.users.find((u) => u.id === userIdOrEmail || u.email.toLowerCase() === norm);

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    user.isGoogleConnected = false;
    user.googleId = undefined;
    user.googleLinkedAt = undefined;
    user.updatedAt = new Date().toISOString();

    this.saveUsers();

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: user.id,
      changeSummary: `Google Account disconnected from ${user.email}.`,
    });

    return { success: true };
  }

  /**
   * Administrative unlock of a locked account
   */
  public unlockAccount(
    userIdOrEmail: string,
    operatorId: string = 'system_admin'
  ): { success: boolean; error?: string } {
    const norm = userIdOrEmail.trim().toLowerCase();
    const user = this.users.find((u) => u.id === userIdOrEmail || u.email.toLowerCase() === norm);

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.updatedAt = new Date().toISOString();

    this.saveUsers();

    auditService.log({
      actorId: operatorId,
      actorType: 'USER',
      action: 'CONFIGURATION_CHANGED',
      entityType: 'SecurityGate',
      entityId: user.id,
      changeSummary: `Security lockout cleared by admin for ${user.email}.`,
    });

    return { success: true };
  }

  public resetToProductionState(): void {
    this.users = [...INITIAL_USERS];
    this.requests = [];
    this.saveUsers();
    this.saveRequests();
  }
}

export const userAccessService = new UserAccessService();
