export interface Beatmap {
  id: number;
  title: string;
  artist: string;
  creator: string;
  status: string;
  bpm: number;
  keys?: number; // 4K, 7K, etc.
  difficulty?: string;
  covers: {
    cover: string;
    card: string;
  };
}

export interface Mappack {
  id: string;
  name: string;
  description: string;
  author: string;
  beatmaps: Beatmap[];
  createdAt: Date;
}

export interface StashBeatmap {
  id: number;
  beatmapsetId?: number;
  title: string;
  artist: string;
  creator: string;
  bpm?: number;
  keys?: number;
  addedAt: Date;
  source: 'pack' | 'browse' | 'download' | 'upload';
  sourcePackId?: string;
  sourcePackName?: string;
}
