import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

export interface PackBeatmap {
  id: number;
  beatmapset_id: number;
  title: string;
  artist: string;
  creator: string;
  keys?: number;
  difficulty_name?: string;
  star_rating?: number;
  downloads?: number;
  sort_order: number;
}

export interface Pack {
  id: number;
  code?: string;  // alias for share_code
  share_code: string;
  name: string;
  description?: string;
  user_id: number;
  views: number;
  created_at: string;
  updated_at: string;
  beatmaps: PackBeatmap[];
  user?: {
    id: number;
    username: string;
    avatar_url: string;
  };
}

export interface CreatePackInput {
  name: string;
  description?: string;
  beatmaps: {
    beatmapset_id: number;
    title: string;
    artist: string;
    creator: string;
    keys?: number;
    difficulty_name?: string;
    star_rating?: number;
  }[];
}

export interface UpdatePackInput {
  name?: string;
  description?: string;
  beatmaps?: {
    beatmapset_id: number;
    title: string;
    artist: string;
    creator: string;
    keys?: number;
    difficulty_name?: string;
    star_rating?: number;
  }[];
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface BrowsePacksResult {
  packs: {
    id: number;
    share_code: string;
    name: string;
    description?: string;
    views: number;
    user: {
      id: number;
      osu_id: number;
      username: string;
      country_code: string;
      avatar_url: string;
    };
    beatmap_count: number;
    beatmapset_ids: number[];
    created_at: string;
  }[];
  total: number;
  page: number;
  limit: number;
}

export interface UserInfo {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;
  pack_count: number;
}

// Get all users with pack counts
export async function getUsers(): Promise<UserInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/users`);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }
  return response.json();
}

// Browse public packs
export async function browsePacks(
  page = 1,
  limit = 20,
  sort: 'recent' | 'popular' | 'views' = 'recent',
  search = '',
  userId?: number,
): Promise<BrowsePacksResult> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort,
  });
  if (search) {
    params.set('search', search);
  }
  if (userId) {
    params.set('user_id', userId.toString());
  }
  const response = await fetch(`${API_BASE_URL}/api/packs?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch packs: ${response.statusText}`);
  }
  return response.json();
}

// Get a pack by its share code
export async function getPack(code: string): Promise<Pack> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/packs/${code}`);
  } catch {
    throw new Error('network_error');
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

// Get current user's packs
export async function getMyPacks(): Promise<Pack[]> {
  const response = await fetch(`${API_BASE_URL}/api/my-packs`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(`Failed to fetch packs: ${response.statusText}`);
  }
  return response.json();
}

// Create a new pack
export async function createPack(input: CreatePackInput): Promise<Pack> {
  const response = await fetch(`${API_BASE_URL}/api/packs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to create pack: ${response.statusText}`);
  }
  return response.json();
}

// Update a pack
export async function updatePack(code: string, input: UpdatePackInput): Promise<Pack> {
  const response = await fetch(`${API_BASE_URL}/api/packs/${code}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to edit this pack');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to update pack: ${response.statusText}`);
  }
  return response.json();
}

// Track a beatmap download (fire-and-forget)
export function trackDownload(code: string, beatmapsetId: number): void {
  fetch(`${API_BASE_URL}/api/packs/${code}/download/${beatmapsetId}`, {
    method: 'POST',
  }).catch(() => {});
}

// Delete a pack
export async function deletePack(code: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/packs/${code}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to delete this pack');
    }
    throw new Error(`Failed to delete pack: ${response.statusText}`);
  }
}
