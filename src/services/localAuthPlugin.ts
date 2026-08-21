import { UserProfile } from '../types';

const STORAGE_LOCAL_USER_KEY = 'sheetboard_local_plugin_user_v1';
const STORAGE_LOCAL_TOKEN_KEY = 'sheetboard_local_plugin_token_v1';
const GOOGLE_SHEETS_OAUTH_TOKEN_KEY = 'sheetboard_google_sheets_real_oauth_token';

declare global {
  interface Window {
    google?: any;
  }
}

export interface LocalAuthAccount {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role?: string;
  orgId?: string;
  department?: string;
}

export const PRESET_LOCAL_PROFILES: LocalAuthAccount[] = [
  {
    uid: 'local-user-1',
    displayName: 'Alex Rivera',
    email: 'alex.rivera@sheetboard.workspace',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexRivera',
    role: 'Campaign Operations Lead',
    orgId: 'ORG-MARKETING-9021',
    department: 'Marketing & Strategy',
  },
  {
    uid: 'local-user-2',
    displayName: 'Sarah Jenkins',
    email: 'sarah.jenkins@sheetboard.workspace',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahJenkins',
    role: 'Creative & Brand Director',
    orgId: 'ORG-MARKETING-9021',
    department: 'Brand Design',
  },
  {
    uid: 'local-user-3',
    displayName: 'Michael Chang',
    email: 'michael.chang@sheetboard.workspace',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelChang',
    role: 'Growth Marketing Manager',
    orgId: 'ORG-MARKETING-9021',
    department: 'Growth Ops',
  },
  {
    uid: 'local-user-4',
    displayName: 'Elena Rostova',
    email: 'elena.rostova@sheetboard.workspace',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaRostova',
    role: 'Media Planner & Buyer',
    orgId: 'ORG-MARKETING-9021',
    department: 'Paid Media',
  },
];

let authListeners: Array<(user: UserProfile | null, token: string | null) => void> = [];

/**
 * Get current locally stored user
 */
export function getLocalStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

/**
 * Get locally stored token
 */
export function getLocalStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_LOCAL_TOKEN_KEY) || 'local-free-token-jwt-valid';
  } catch (_) {
    return 'local-free-token-jwt-valid';
  }
}

/**
 * Save user to local storage and notify listeners
 */
export function saveLocalStoredUser(user: UserProfile | null, token?: string) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_LOCAL_USER_KEY, JSON.stringify(user));
      const effectiveToken = token || `local-token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_LOCAL_TOKEN_KEY, effectiveToken);
      authListeners.forEach((fn) => fn(user, effectiveToken));
    } else {
      localStorage.removeItem(STORAGE_LOCAL_USER_KEY);
      localStorage.removeItem(STORAGE_LOCAL_TOKEN_KEY);
      authListeners.forEach((fn) => fn(null, null));
    }
  } catch (err) {
    console.error('Error storing local auth user:', err);
  }
}

/**
 * Local auth listener initializer (No Firebase required)
 */
export const initAuth = (
  onAuthSuccess?: (user: UserProfile, token: string) => void,
  onAuthFailure?: () => void
) => {
  const listener = (user: UserProfile | null, token: string | null) => {
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };

  authListeners.push(listener);

  // Check immediately if we have a stored session
  const storedUser = getLocalStoredUser();
  const storedToken = getLocalStoredToken();

  if (storedUser && storedToken) {
    setTimeout(() => {
      if (onAuthSuccess) onAuthSuccess(storedUser, storedToken);
    }, 50);
  } else {
    // Default auto-login as first preset profile so user gets instant free access
    const defaultProfile = PRESET_LOCAL_PROFILES[0];
    const userProfile: UserProfile = {
      uid: defaultProfile.uid,
      displayName: defaultProfile.displayName,
      email: defaultProfile.email,
      photoURL: defaultProfile.photoURL,
    };
    const defaultToken = `local-token-${Date.now()}`;
    saveLocalStoredUser(userProfile, defaultToken);
    setTimeout(() => {
      if (onAuthSuccess) onAuthSuccess(userProfile, defaultToken);
    }, 50);
  }

  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter((fn) => fn !== listener);
  };
};

/**
 * Retrieve active OAuth Token for Google Sheets API
 */
export function getSavedGoogleOAuthToken(): string | null {
  try {
    const raw = localStorage.getItem(GOOGLE_SHEETS_OAUTH_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt - 60000) {
      localStorage.removeItem(GOOGLE_SHEETS_OAUTH_TOKEN_KEY);
      return null;
    }
    return parsed.token || null;
  } catch (_) {
    return null;
  }
}

/**
 * Save active OAuth Token for Google Sheets
 */
export function saveGoogleOAuthToken(token: string, expiresInSeconds = 3599) {
  try {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(GOOGLE_SHEETS_OAUTH_TOKEN_KEY, JSON.stringify({ token, expiresAt }));
  } catch (_) {}
}

/**
 * Trigger Real Google Sign In popup with Google Sheets & Drive scopes using Google Identity Services (GSI)
 */
export const requestGoogleOAuthToken = async (): Promise<{ user: UserProfile; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available'));
    }

    const clientId = '519236113240-jj8kjgu4pqgk8kf5eps694ii5bneiouv.apps.googleusercontent.com';

    const startOAuth = () => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          error_callback: (err: any) => {
            console.warn('Google OAuth error callback:', err);
            // Fallback to local session on origin_mismatch or configuration error
            const fallback = localSignIn();
            resolve(fallback);
          },
          callback: async (response: any) => {
            if (response.error) {
              console.warn('Google OAuth returned error:', response.error);
              const fallback = await localSignIn();
              return resolve(fallback);
            }
            if (response.access_token) {
              const token = response.access_token;
              const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3599;
              saveGoogleOAuthToken(token, expiresIn);

              // Fetch User profile
              let name = 'Google User';
              let email = 'user@google.com';
              let avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Google';
              let uid = `google-${Date.now()}`;

              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (userRes.ok) {
                  const data = await userRes.json();
                  name = data.name || data.email || name;
                  email = data.email || email;
                  avatar = data.picture || avatar;
                  uid = data.sub || uid;
                }
              } catch (_) {}

              const userProfile: UserProfile = {
                uid,
                displayName: name,
                email,
                photoURL: avatar,
              };

              saveLocalStoredUser(userProfile, token);
              resolve({ user: userProfile, accessToken: token });
            } else {
              const fallback = await localSignIn();
              resolve(fallback);
            }
          },
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        console.warn('Google Identity initialization failed, using local profile:', err);
        const fallback = localSignIn();
        resolve(fallback);
      }
    };

    if (window.google?.accounts?.oauth2) {
      startOAuth();
    } else {
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          startOAuth();
        } else if (retries > 30) {
          clearInterval(interval);
          reject(new Error('Google Identity Services SDK failed to load. Please check your internet connection.'));
        }
      }, 100);
    }
  });
};

/**
 * Quick Local Sign In with a profile (100% Free, Offline, Local plugin)
 */
export const localSignIn = async (
  profile?: Partial<LocalAuthAccount>
): Promise<{ user: UserProfile; accessToken: string }> => {
  const chosen = profile || PRESET_LOCAL_PROFILES[0];
  const name = chosen.displayName || 'Alex Rivera';
  const email = chosen.email || 'alex.rivera@sheetboard.workspace';
  const avatar =
    chosen.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  const uid = chosen.uid || `local-${Date.now()}`;

  const userProfile: UserProfile = {
    uid,
    displayName: name,
    email,
    photoURL: avatar,
  };

  const token = `local-free-token-${Date.now()}`;
  saveLocalStoredUser(userProfile, token);

  return { user: userProfile, accessToken: token };
};

/**
 * Backward compatible alias for googleSignIn
 */
export const googleSignIn = async (): Promise<{ user: UserProfile; accessToken: string }> => {
  try {
    return await requestGoogleOAuthToken();
  } catch (e) {
    console.warn('Real Google OAuth declined or cancelled, fallback to offline profile:', e);
    return localSignIn();
  }
};

/**
 * Get current access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  const realToken = getSavedGoogleOAuthToken();
  if (realToken) return realToken;
  return getLocalStoredToken();
};

/**
 * Local Sign Out (100% Free, Offline)
 */
export const logout = async (): Promise<void> => {
  try {
    localStorage.removeItem(GOOGLE_SHEETS_OAUTH_TOKEN_KEY);
  } catch (_) {}
  saveLocalStoredUser(null);
};
