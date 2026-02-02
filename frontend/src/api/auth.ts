import { AUTH_BASE_URL } from './config';

const TOKEN_KEY = 'packshare_token';
const USER_KEY = 'packshare_user';

export interface User {
  osu_id: number;
  username: string;
  country_code: string;
  avatar_url: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

// Get the login URL - redirects to osu! OAuth
export function getLoginUrl(): string {
  return `${AUTH_BASE_URL}/auth/login`;
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

// Remove token
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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

// Initialize auth state from storage or URL
export async function initAuth(): Promise<AuthState> {
  // Check for token in URL (OAuth callback)
  const urlToken = getTokenFromUrl();
  if (urlToken) {
    const user = await verifyToken(urlToken);
    if (user) {
      saveToken(urlToken);
      saveUser(user);
      return { token: urlToken, user };
    }
  }

  // Check for stored token
  const storedToken = getStoredToken();
  if (storedToken) {
    // Verify stored token is still valid
    const user = await verifyToken(storedToken);
    if (user) {
      saveUser(user);
      return { token: storedToken, user };
    } else {
      // Token expired or invalid
      removeToken();
    }
  }

  return { token: null, user: null };
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
