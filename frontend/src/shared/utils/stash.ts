import type { StashBeatmap } from '../types/beatmap';

export const STASH_STORAGE_KEY = 'packshare_stash';

export function getStash(): StashBeatmap[] {
  const saved = localStorage.getItem(STASH_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveStash(stash: StashBeatmap[]) {
  localStorage.setItem(STASH_STORAGE_KEY, JSON.stringify(stash));
}

export function addToStash(item: Omit<StashBeatmap, 'addedAt'>): boolean {
  const stash = getStash();
  if (stash.some((b) => b.id === item.id)) return false;
  stash.push({ ...item, addedAt: new Date() });
  saveStash(stash);
  return true;
}
