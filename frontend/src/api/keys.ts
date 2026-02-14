import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

export interface AccessKey {
  id: number;
  name: string;
  permissions: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateKeyResponse extends AccessKey {
  key: string; // raw key, shown only once
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createKey(
  name: string,
  permissions: string[],
  expiresInDays?: number
): Promise<CreateKeyResponse> {
  const body: Record<string, unknown> = { name, permissions };
  if (expiresInDays !== undefined && expiresInDays > 0) {
    body.expires_in_days = expiresInDays;
  }

  const response = await fetch(`${API_BASE_URL}/api/keys`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to create key');
  }

  return response.json();
}

export async function listKeys(): Promise<AccessKey[]> {
  const response = await fetch(`${API_BASE_URL}/api/keys`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to list keys');
  }

  return response.json();
}

export async function revokeKey(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/keys/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to revoke key');
  }
}
