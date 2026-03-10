import { API_BASE_URL } from '../../../shared/config';
import { getStoredToken } from '../../auth/api/auth';

export interface TournamentMap {
  id: number;
  stage_id: number;
  slot_type: string;
  mod: string;
  slot_number: number;
  beatmapset_id: number;
  title: string;
  artist: string;
  creator: string;
  keys: number;
  star_rating?: number;
  difficulty_name?: string;
}

export interface TournamentStage {
  id: number;
  tournament_id: number;
  name: string;
  sort_order: number;
  maps?: TournamentMap[];
}

export interface SlotConfig {
  label: string;
  color: string;
}

export interface TournamentPlayer {
  id: number;
  tournament_id: number;
  osu_id: number;
  name: string;
  seed: number;
  discord?: string;
  created_at: string;
}

export interface TournamentAnnouncement {
  id: number;
  tournament_id: number;
  title: string;
  body: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: number;
  name: string;
  abbreviation: string;
  format: string;
  banner_url: string;
  logo_url: string;
  status: 'upcoming' | 'live' | 'completed';
  slot_configs?: string;
  bracket_data?: string;
  user_id: number;
  user?: {
    id: number;
    osu_id: number;
    username: string;
    country_code: string;
    avatar_url: string;
  };
  stages?: TournamentStage[];
  players?: TournamentPlayer[];
  announcements?: TournamentAnnouncement[];
  created_at: string;
  updated_at: string;
}

export interface CreateTournamentInput {
  name: string;
  abbreviation: string;
  format: string;
  banner_url?: string;
  logo_url?: string;
  stages: { name: string }[];
}

export interface UpdateTournamentInput {
  name?: string;
  banner_url?: string;
  logo_url?: string;
  status?: string;
  slot_configs?: string;
}

export interface AddMapInput {
  slot_type: string;
  mod: string;
  beatmapset_id: number;
  title: string;
  artist: string;
  creator: string;
  keys?: number;
  star_rating?: number;
  difficulty_name?: string;
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

export async function listTournaments(status?: string): Promise<Tournament[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/tournaments${qs ? `?${qs}` : ''}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tournaments: ${response.statusText}`);
  }
  return response.json();
}

export async function getTournament(abbrev: string): Promise<Tournament> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Tournament not found');
    }
    throw new Error(`Failed to fetch tournament: ${response.statusText}`);
  }
  return response.json();
}

export async function createTournament(input: CreateTournamentInput): Promise<Tournament> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to create tournament: ${response.statusText}`);
  }
  return response.json();
}

export async function updateTournament(abbrev: string, input: UpdateTournamentInput): Promise<Tournament> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to update tournament: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteTournament(abbrev: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have permission to delete this tournament');
    }
    throw new Error(`Failed to delete tournament: ${response.statusText}`);
  }
}

export async function addMapToStage(abbrev: string, stageId: number, input: AddMapInput): Promise<TournamentMap> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/stages/${stageId}/maps`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to add map: ${response.statusText}`);
  }
  return response.json();
}

export async function removeMap(abbrev: string, mapId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/maps/${mapId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to remove map: ${response.statusText}`);
  }
}

export async function updateMap(abbrev: string, mapId: number, data: { slot_type?: string; mod?: string }): Promise<TournamentMap> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/maps/${mapId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update map');
  }
  return response.json();
}

export async function addStage(abbrev: string, name: string): Promise<TournamentStage> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/stages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to add stage');
  }
  return response.json();
}

export async function renameStage(abbrev: string, stageId: number, name: string): Promise<TournamentStage> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/stages/${stageId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to rename stage');
  }
  return response.json();
}

export async function deleteStage(abbrev: string, stageId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/stages/${stageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete stage');
  }
}

// Image uploads

interface PresignResponse {
  upload_url: string;
  file_url: string;
}

async function getPresignedUrl(filename: string, contentType: string): Promise<PresignResponse> {
  const response = await fetch(`${API_BASE_URL}/api/uploads/presign`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename, content_type: contentType }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to get upload URL');
  }
  return response.json();
}

// ── Players ──

export async function addPlayer(abbrev: string, input: { osu_id: number; name: string; discord?: string }): Promise<TournamentPlayer> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/players`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to add player');
  }
  return response.json();
}

export async function bulkAddPlayers(abbrev: string, players: { osu_id: number; name: string }[]): Promise<TournamentPlayer[]> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/players/bulk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ players }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to bulk add players');
  }
  return response.json();
}

export async function updatePlayer(abbrev: string, playerId: number, input: { name?: string; discord?: string; seed?: number }): Promise<TournamentPlayer> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/players/${playerId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update player');
  }
  return response.json();
}

export async function removePlayer(abbrev: string, playerId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/players/${playerId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to remove player');
  }
}

export async function clearPlayers(abbrev: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/players`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to clear players');
  }
}

export async function reorderPlayers(abbrev: string, playerIds: number[]): Promise<TournamentPlayer[]> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/players/reorder`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ player_ids: playerIds }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reorder players');
  }
  return response.json();
}

// ── Bracket ──

export async function saveBracket(abbrev: string, bracketData: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/bracket`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ bracket_data: bracketData }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save bracket');
  }
}

// ── Announcements ──

export async function createAnnouncement(abbrev: string, input: { title: string; body: string; image?: string }): Promise<TournamentAnnouncement> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/announcements`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create announcement');
  }
  return response.json();
}

export async function updateAnnouncement(abbrev: string, annId: number, input: { title: string; body: string; image?: string }): Promise<TournamentAnnouncement> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/announcements/${annId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update announcement');
  }
  return response.json();
}

export async function deleteAnnouncement(abbrev: string, annId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/announcements/${annId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete announcement');
  }
}

export async function uploadImage(file: File): Promise<string> {
  const { upload_url, file_url } = await getPresignedUrl(file.name, file.type);

  const uploadResponse = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error('Failed to upload image to storage');
  }

  return file_url;
}

// ── Site Builder ──

export interface TournamentSite {
  id: number;
  tournament_id: number;
  subdomain: string;
  config: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export async function getSite(abbrev: string): Promise<TournamentSite | null> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/site`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.site || null;
}

export async function saveSite(abbrev: string, input: { subdomain?: string; config: string }): Promise<TournamentSite> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/site`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save site');
  }
  return response.json();
}

export async function publishSite(abbrev: string, published: boolean): Promise<TournamentSite> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/site/publish`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ published }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to publish site');
  }
  return response.json();
}

export async function deleteSite(abbrev: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tournaments/${abbrev}/site`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete site');
  }
}

export interface SitePublicData {
  site: TournamentSite;
  tournament: Tournament;
}

export async function getSiteBySubdomain(subdomain: string): Promise<SitePublicData> {
  const response = await fetch(`${API_BASE_URL}/api/sites/${subdomain}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Site not found');
  }
  return response.json();
}
