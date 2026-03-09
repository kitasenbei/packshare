import { AUTH_BASE_URL, API_BASE_URL } from '../../../shared/config';

const TOKEN_KEY = 'packshare_token';
const USER_KEY = 'packshare_user';
const AUTH_MODE_KEY = 'packshare_auth_mode';
const KEY_NAME_KEY = 'packshare_key_name';
const PERMISSIONS_KEY = 'packshare_permissions';

export type AuthMode = 'oauth' | 'key';

export interface User {
  osu_id: number;
  username: string;
  country_code: string;
  avatar_url: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  authMode: AuthMode;
  keyName: string | null;
  permissions: string[];
}

// Get the login URL - redirects to osu! OAuth
export function getLoginUrl(): string {
  return `${AUTH_BASE_URL}/auth/login?redirect=${encodeURIComponent(window.location.origin)}`;
}

// Check URL for token after OAuth callback
export function getTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);
  }
  return token;
}

// Check URL for auth error
export function getAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (error) {
    window.history.replaceState({}, '', window.location.pathname);
  }
  return error;
}

// Store token in localStorage
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Get stored token
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Remove token and all session data
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_MODE_KEY);
  localStorage.removeItem(KEY_NAME_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
}

// Store user data
export function saveUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Get stored user
export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

// Save key session metadata
function saveKeySession(keyName: string, permissions: string[]): void {
  localStorage.setItem(AUTH_MODE_KEY, 'key');
  localStorage.setItem(KEY_NAME_KEY, keyName);
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
}

// Save OAuth session metadata
function saveOAuthSession(): void {
  localStorage.setItem(AUTH_MODE_KEY, 'oauth');
  localStorage.removeItem(KEY_NAME_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
}

// Auth mode helpers
export function isKeySession(): boolean {
  return localStorage.getItem(AUTH_MODE_KEY) === 'key';
}

export function getAuthMode(): AuthMode {
  return (localStorage.getItem(AUTH_MODE_KEY) as AuthMode) || 'oauth';
}

export function getKeyName(): string | null {
  return localStorage.getItem(KEY_NAME_KEY);
}

export function getPermissions(): string[] {
  const data = localStorage.getItem(PERMISSIONS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

// Check if a JWT is expired by decoding the payload
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
}

// Verify token and get user data
export async function verifyToken(token: string): Promise<User | null> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`);
    const data = await response.json();

    if (data.valid && data.user) {
      return {
        osu_id: data.user.osu_id,
        username: data.user.username,
        country_code: data.user.country_code || 'XX',
        avatar_url: data.user.avatar_url || `https://a.ppy.sh/${data.user.osu_id}`,
      };
    }
    return null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Login with access key
export async function loginWithKey(key: string): Promise<AuthState> {
  const response = await fetch(`${API_BASE_URL}/api/auth/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    let message = 'Invalid access key';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // Response wasn't JSON (e.g. proxy error)
    }
    throw new Error(message);
  }

  const data = await response.json();
  const user: User = data.user;
  const token: string = data.token;
  const keyName: string = data.key_name;
  const permissions: string[] = data.permissions;

  saveToken(token);
  saveUser(user);
  saveKeySession(keyName, permissions);

  return { token, user, authMode: 'key', keyName, permissions };
}

// Initialize auth state from storage or URL
export async function initAuth(): Promise<AuthState> {
  // Check for token in URL (OAuth callback)
  const urlToken = getTokenFromUrl();
  if (urlToken) {
    const user = await verifyToken(urlToken);
    if (user) {
      saveToken(urlToken);
      saveUser(user);
      saveOAuthSession();
      return { token: urlToken, user, authMode: 'oauth', keyName: null, permissions: [] };
    }
  }

  // Check for stored token
  const storedToken = getStoredToken();
  if (storedToken) {
    const authMode = getAuthMode();

    if (authMode === 'key') {
      // For key sessions, check JWT expiration client-side
      const user = getStoredUser();
      if (user && !isTokenExpired(storedToken)) {
        return {
          token: storedToken,
          user,
          authMode: 'key',
          keyName: getKeyName(),
          permissions: getPermissions(),
        };
      }
      // Expired or corrupt, clear everything
      removeToken();
    } else {
      // Verify OAuth token
      const user = await verifyToken(storedToken);
      if (user) {
        saveUser(user);
        return { token: storedToken, user, authMode: 'oauth', keyName: null, permissions: [] };
      } else {
        removeToken();
      }
    }
  }

  return { token: null, user: null, authMode: 'oauth', keyName: null, permissions: [] };
}

// Logout
export function logout(): void {
  removeToken();
}

// Beatmapset info from osu! API
export interface BeatmapsetInfo {
  beatmapset_id: number;
  artist: string;
  title: string;
  creator: string;
  covers: {
    cover: string;
    card: string;
    list: string;
  };
  beatmaps: {
    beatmap_id: number;
    difficulty_name: string;
    star_rating: number;
    keys: number;
    bpm: number;
    length_seconds: number;
  }[];
}

// Fetch beatmapset info from osu! API
export interface OsuUserInfo {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;
}

export async function getOsuUser(userId: number): Promise<OsuUserInfo | null> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/auth/user/${userId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getBeatmapset(beatmapsetId: number): Promise<BeatmapsetInfo | null> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/auth/beatmapset/${beatmapsetId}`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('Failed to fetch beatmapset:', error);
    return null;
  }
}
