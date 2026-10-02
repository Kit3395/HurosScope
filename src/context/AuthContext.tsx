import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrentUserSession, UserAccount, UserPermission, UserRole } from '../types';
import { authService } from '../security/auth';
import { userAccessService } from '../services/userAccessService';
import { supabaseService } from '../services/supabaseService';
import { auditService } from '../audit';
import { GoogleUserProfile } from '../security/googleAuth';

interface AuthContextType {
  currentUser: CurrentUserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingRequestsCount: number;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; remainingAttempts?: number; isLocked?: boolean }>;
  loginWithGoogle: (googleProfile: GoogleUserProfile) => Promise<{ success: boolean; error?: string }>;
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
  switchUserAccount: (userId: string) => void;
  hasPermission: (permission: UserPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'horusscope_auth_current_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // Initialize auth state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Verify user still exists and is APPROVED
        const account = userAccessService.getUserByEmail(parsed.email);
        if (account && account.status === 'APPROVED') {
          const session = authService.getSession();
          // Synchronize session
          authService.switchRole(account.role);
          setCurrentUser({
            ...session,
            userId: account.id,
            displayName: account.displayName,
            email: account.email,
            role: account.role,
            organization: account.organization,
            avatarUrl: account.avatarUrl,
          });
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(AUTH_USER_KEY);
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        // Not logged in: show Landing Page
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }

    // Refresh pending requests count
    setPendingRequestsCount(userAccessService.getPendingRequests().length);

    // Subscribe to user service updates
    const unsubscribe = userAccessService.subscribe(() => {
      setPendingRequestsCount(userAccessService.getPendingRequests().length);
    });

    return () => unsubscribe();
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

      // Check against local user accounts registry with cryptographic verification
      const verifyRes = await userAccessService.verifyCredentials(cleanEmail, password);

      if (!verifyRes.success || !verifyRes.user) {
        return {
          success: false,
          error: verifyRes.error || 'Authentication failed. Please verify your credentials.',
          remainingAttempts: verifyRes.remainingAttempts,
          isLocked: verifyRes.isLocked,
        };
      }

      const account = verifyRes.user;

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
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(account));

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
    googleProfile: GoogleUserProfile
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await userAccessService.connectGoogleAccount(googleProfile.email, googleProfile);

      if (!res.success || !res.user) {
        return {
          success: false,
          error: res.error || 'Google authentication failed. Identity not authorized.',
        };
      }

      const account = res.user;

      authService.switchRole(account.role);
      const session = authService.getSession();

      const newSession: CurrentUserSession = {
        ...session,
        userId: account.id,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        organization: account.organization,
        avatarUrl: account.avatarUrl || googleProfile.picture,
        authProvider: 'GOOGLE',
        isGoogleConnected: true,
        sessionStartedAt: new Date().toISOString(),
      };

      setCurrentUser(newSession);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(account));

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
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
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
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
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
    const res = userAccessService.disconnectGoogleAccount(currentUser.userId, currentUser.userId);
    if (res.success) {
      const updatedUser = userAccessService.getUserById(currentUser.userId);
      if (updatedUser) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
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
    localStorage.removeItem(AUTH_USER_KEY);
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
      const newReq = userAccessService.submitAccessRequest(data);
      setPendingRequestsCount(userAccessService.getPendingRequests().length);
      return { success: true, requestId: newReq.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit request.' };
    }
  };

  const switchUserAccount = (userId: string) => {
    const user = userAccessService.getUserById(userId);
    if (!user) return;

    authService.switchRole(user.role);
    const session = authService.getSession();

    const updatedSession: CurrentUserSession = {
      ...session,
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      organization: user.organization,
      avatarUrl: user.avatarUrl,
    };

    setCurrentUser(updatedSession);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
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
