import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrentUserSession, UserAccount, UserPermission, UserRole } from '../types';
import { authService } from '../security/auth';
import { authService as loginService } from '../services/authService';
import { userAccessService } from '../services/userAccessService';
import { supabaseService } from '../services/supabaseService';
import { auditService } from '../audit';
import { GoogleUserProfile } from '../security/googleAuth';
import { getAuthToken, setAuthToken, apiGet, apiPost } from '../services/api';

interface AuthContextType {
  currentUser: CurrentUserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingRequestsCount: number;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; remainingAttempts?: number; isLocked?: boolean }>;
  loginWithGoogle: (googleAccessToken: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  connectGoogleAccount: (googleProfile: GoogleUserProfile) => Promise<{ success: boolean; error?: string }>;
  disconnectGoogleAccount: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  requestAccess: (data: {
    fullName: string;
    email: string;
    organization: string;
    requestedRole: UserRole;
    reason: string;
  }) => Promise<{ success: boolean; error?: string; requestId?: string }>;
  switchUserAccount: (userId: string) => Promise<void>;
  hasPermission: (permission: UserPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // Initialize auth state on mount — validate the stored server session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          return;
        }
        // Validate the session against the server (single source of truth).
        const data = await apiGet<{ success: boolean; user: UserAccount }>('/api/auth/me');
        if (cancelled) return;
        const account = data.user;
        await userAccessService.syncFromServer();
        // Non-owner sessions only see themselves in the mirror.
        if (!userAccessService.getUserById(account.id)) {
          userAccessService.seedMirrorWith([account]);
        }
        authService.switchRole(account.role);
        const session = authService.getSession();
        setCurrentUser({
          ...session,
          userId: account.id,
          displayName: account.displayName,
          email: account.email,
          role: account.role,
          organization: account.organization,
          avatarUrl: account.avatarUrl,
          authProvider: 'LOCAL',
          isGoogleConnected: Boolean(account.isGoogleConnected),
          sessionStartedAt: new Date().toISOString(),
        });
        setIsAuthenticated(true);
      } catch {
        // Invalid/expired session — drop it and show the login gate.
        setAuthToken(null);
        userAccessService.clearMirror();
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Refresh pending requests count
    setPendingRequestsCount(userAccessService.getPendingRequests().length);

    // Subscribe to user service updates
    const unsubscribe = userAccessService.subscribe(() => {
      setPendingRequestsCount(userAccessService.getPendingRequests().length);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; remainingAttempts?: number; isLocked?: boolean }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Passwords are strictly required - block direct unauthenticated access
      if (!password || !password.trim()) {
        return {
          success: false,
          error: 'Password is required to authenticate. Unauthenticated login has been permanently blocked.',
        };
      }

      // Verify credentials against the backend server (never client-side).
      const authRes = await loginService.authenticate(cleanEmail, password);

      if (!authRes.success || !authRes.user) {
        return {
          success: false,
          error: authRes.error || 'Authentication failed. Please verify your credentials.',
          remainingAttempts: authRes.remainingAttempts,
          isLocked: authRes.isLocked,
        };
      }

      const account = authRes.user;

      // If Supabase is connected, optionally verify with Supabase Auth as secondary vault
      const supabase = supabaseService.getClient();
      if (supabase && password) {
        try {
          const { error: sbError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (sbError) {
            console.info('Supabase auth note:', sbError.message);
          }
        } catch {
          // Graceful fallback
        }
      }

      // Populate the local user mirror from the server.
      await userAccessService.syncFromServer();
      if (!userAccessService.getUserById(account.id)) {
        userAccessService.seedMirrorWith([account]);
      }

      // Update session in authService
      authService.switchRole(account.role);
      const session = authService.getSession();

      const newSession: CurrentUserSession = {
        ...session,
        userId: account.id,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        organization: account.organization,
        avatarUrl: account.avatarUrl,
        authProvider: 'LOCAL',
        isGoogleConnected: Boolean(account.isGoogleConnected),
        sessionStartedAt: new Date().toISOString(),
      };

      setCurrentUser(newSession);
      setIsAuthenticated(true);

      auditService.log({
        actorId: account.id,
        actorType: 'USER',
        action: 'AUTH_ROLE_SWITCHED',
        entityType: 'SecurityGate',
        entityId: account.id,
        changeSummary: `User ${account.displayName} (${account.role}) authenticated securely with password.`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (
    googleAccessToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Server validates the Google token with Google and mints a session
      // only for a pre-approved, linked account.
      const data = await apiPost<{ success: boolean; token: string; user: UserAccount }>(
        '/api/auth/google',
        { googleAccessToken }
      );
      if (!data.success || !data.token || !data.user) {
        return { success: false, error: 'Google authentication failed.' };
      }
      setAuthToken(data.token);
      const account = data.user;

      await userAccessService.syncFromServer();
      if (!userAccessService.getUserById(account.id)) {
        userAccessService.seedMirrorWith([account]);
      }

      authService.switchRole(account.role);
      const session = authService.getSession();

      const newSession: CurrentUserSession = {
        ...session,
        userId: account.id,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        organization: account.organization,
        avatarUrl: account.avatarUrl,
        authProvider: 'GOOGLE',
        isGoogleConnected: true,
        sessionStartedAt: new Date().toISOString(),
      };

      setCurrentUser(newSession);
      setIsAuthenticated(true);

      auditService.log({
        actorId: account.id,
        actorType: 'USER',
        action: 'AUTH_ROLE_SWITCHED',
        entityType: 'SecurityGate',
        entityId: account.id,
        changeSummary: `User ${account.displayName} logged in via verified Google OAuth.`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Google authentication failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'No active user session.' };
    }
    const res = await userAccessService.setPassword(currentUser.userId, newPassword, currentUser.userId);
    if (res.success) {
      const updatedUser = userAccessService.getUserById(currentUser.userId);
      if (updatedUser) {
      }
    }
    return res;
  };

  const connectGoogleAccount = async (
    googleProfile: GoogleUserProfile
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'No active user session.' };
    }
    const res = await userAccessService.connectGoogleAccount(
      currentUser.userId,
      googleProfile,
      currentUser.userId
    );
    if (res.success && res.user) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              isGoogleConnected: true,
              avatarUrl: res.user?.avatarUrl || prev.avatarUrl,
            }
          : null
      );
    }
    return { success: res.success, error: res.error };
  };

  const disconnectGoogleAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'No active user session.' };
    }
    const res = await userAccessService.disconnectGoogleAccount(currentUser.userId, currentUser.userId);
    if (res.success) {
      const updatedUser = userAccessService.getUserById(currentUser.userId);
      if (updatedUser) {
      }
      setCurrentUser((prev) => (prev ? { ...prev, isGoogleConnected: false } : null));
    }
    return res;
  };

  const logout = () => {
    if (currentUser) {
      auditService.log({
        actorId: currentUser.userId,
        actorType: 'USER',
        action: 'AUTH_ROLE_SWITCHED',
        entityType: 'SecurityGate',
        entityId: currentUser.userId,
        changeSummary: `User ${currentUser.displayName} logged out.`,
      });
    }
    void loginService.logout();
    userAccessService.clearMirror();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const requestAccess = async (data: {
    fullName: string;
    email: string;
    organization: string;
    requestedRole: UserRole;
    reason: string;
  }): Promise<{ success: boolean; error?: string; requestId?: string }> => {
    try {
      const newReq = await userAccessService.submitAccessRequest(data);
      setPendingRequestsCount(userAccessService.getPendingRequests().length);
      return { success: true, requestId: newReq.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit request.' };
    }
  };

  // OWNER-only session impersonation, mediated by the server (no client-side bypass).
  const switchUserAccount = async (userId: string) => {
    try {
      const data = await apiPost<{ success: boolean; token: string; user: UserAccount }>(
        '/api/auth/impersonate',
        { userId }
      );
      if (!data.success || !data.token || !data.user) return;
      setAuthToken(data.token);
      const user = data.user;
      await userAccessService.syncFromServer();
      if (!userAccessService.getUserById(user.id)) {
        userAccessService.seedMirrorWith([user]);
      }
      authService.switchRole(user.role);
      const session = authService.getSession();
      setCurrentUser({
        ...session,
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        avatarUrl: user.avatarUrl,
        sessionStartedAt: new Date().toISOString(),
      });
      setIsAuthenticated(true);
    } catch {
      // impersonation failed — keep current session
    }
  };

  const hasPermission = (permission: UserPermission): boolean => {
    if (!currentUser) return false;
    return authService.hasPermission(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        pendingRequestsCount,
        login,
        loginWithGoogle,
        updatePassword,
        connectGoogleAccount,
        disconnectGoogleAccount,
        logout,
        requestAccess,
        switchUserAccount,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
