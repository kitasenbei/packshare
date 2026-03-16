import { useState, useEffect, useRef, useCallback } from 'react';

// Global singleton — only one preview plays at a time
let globalAudio: HTMLAudioElement | null = null;
const listeners = new Set<(id: number | null) => void>();

function notifyAll(id: number | null) {
  for (const listener of listeners) listener(id);
}

export function useAudioPreview(beatmapsetId: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const idRef = useRef(beatmapsetId);
  idRef.current = beatmapsetId;

  useEffect(() => {
    const listener = (playingId: number | null) => {
      setIsPlaying(playingId === idRef.current);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const toggle = useCallback(() => {
    const url = `https://b.ppy.sh/preview/${beatmapsetId}.mp3`;

    // If this track is already playing, pause it
    if (globalAudio && globalAudio.src.includes(`/${beatmapsetId}.mp3`)) {
      globalAudio.pause();
      globalAudio = null;
      notifyAll(null);
      return;
    }

    // Stop any current playback
    if (globalAudio) {
      globalAudio.pause();
      globalAudio = null;
    }

    // Start new preview
    const audio = new Audio(url);
    audio.volume = 0.4;
    globalAudio = audio;
    notifyAll(beatmapsetId);

    audio.play().catch(() => {
      notifyAll(null);
    });

    audio.addEventListener('ended', () => {
      if (globalAudio === audio) {
        globalAudio = null;
        notifyAll(null);
      }
    });
  }, [beatmapsetId]);

  return { isPlaying, toggle };
}
