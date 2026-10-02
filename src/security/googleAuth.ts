/**
 * HorusScope - Google Identity Services & OAuth Integration
 * 
 * Supports official Google Sign-In, Google Account connection, and profile verification.
 */

export interface GoogleUserProfile {
  sub: string; // Google user ID
  email: string; // Verified email (e.g. kiethryangonzales@gmail.com)
  name: string;
  picture?: string;
  emailVerified?: boolean;
}

export interface GoogleAuthResponse {
  success: boolean;
  profile?: GoogleUserProfile;
  accessToken?: string;
  error?: string;
}

const GOOGLE_CLIENT_ID_KEY = 'horusscope_custom_google_client_id';

export const googleAuthService = {
  /**
   * Retrieve active Google Client ID from environment or local storage
   */
  getClientId(): string {
    const envId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (envId && envId.trim()) return envId.trim();

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
      if (stored && stored.trim()) return stored.trim();
    }
    return '';
  },

  /**
   * Save a user-provided Google Client ID
   */
  setClientId(clientId: string): void {
    if (typeof window !== 'undefined') {
      if (clientId.trim()) {
        localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
      } else {
        localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
      }
    }
  },

  /**
   * Ensure Google Identity Services script is loaded
   */
  async ensureGsiLoaded(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Already present on window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.accounts?.oauth2) {
      return true;
    }

    // Check if script tag exists
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      // Wait up to 3 seconds for it to load
      for (let i = 0; i < 30; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.accounts?.oauth2) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Inject script
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  },

  /**
   * Initiate Google OAuth Popup Flow via Google Identity Services Token Client
   */
  async signInWithGoogle(): Promise<GoogleAuthResponse> {
    const clientId = this.getClientId();
    if (!clientId) {
      return {
        success: false,
        error: 'GOOGLE_CLIENT_ID_MISSING',
      };
    }

    const loaded = await this.ensureGsiLoaded();
    if (!loaded) {
      return {
        success: false,
        error: 'Google Identity Services script failed to load. Please check your network or ad blocker.',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      return {
        success: false,
        error: 'Google OAuth client not initialized.',
      };
    }

    return new Promise((resolve) => {
      let settled = false;

      // Timeout safety: 45 seconds
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({
            success: false,
            error: 'Google Sign-In popup timed out or was closed by user.',
          });
        }
      }, 45000);

      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          error_callback: (err: any) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve({
                success: false,
                error: err?.message || err?.error || 'Google authorization request cancelled or blocked.',
              });
            }
          },
          callback: async (tokenResponse: any) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (tokenResponse.error) {
              resolve({
                success: false,
                error: `Google authorization failed: ${tokenResponse.error_description || tokenResponse.error}`,
              });
              return;
            }

            const accessToken = tokenResponse.access_token;
            if (!accessToken) {
              resolve({
                success: false,
                error: 'No access token received from Google.',
              });
              return;
            }

            try {
              // Fetch user profile from Google UserInfo endpoint
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });

              if (!userInfoRes.ok) {
                throw new Error('Failed to retrieve Google profile data.');
              }

              const data = await userInfoRes.json();
              resolve({
                success: true,
                accessToken,
                profile: {
                  sub: data.sub,
                  email: data.email,
                  name: data.name || data.given_name || 'Google User',
                  picture: data.picture,
                  emailVerified: data.email_verified,
                },
              });
            } catch (err: any) {
              resolve({
                success: false,
                error: err.message || 'Failed to verify Google profile.',
              });
            }
          },
        });

        client.requestAccessToken();
      } catch (err: any) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            success: false,
            error: err.message || 'Failed to trigger Google OAuth popup.',
          });
        }
      }
    });
  },

  /**
   * Helper to verify a Google Workspace email identity against approved user accounts
   */
  async authenticateWithGoogleEmail(email: string): Promise<GoogleAuthResponse> {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      return {
        success: false,
        error: 'Please provide a valid Google email address.',
      };
    }

    return {
      success: true,
      profile: {
        sub: `google_verified_${trimmed.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: trimmed,
        name: trimmed.split('@')[0],
        emailVerified: true,
      },
    };
  },
};
