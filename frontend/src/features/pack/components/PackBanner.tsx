import { useState } from 'react';
import type { PackBeatmap } from '../api/packs';

interface PackBannerProps {
  beatmaps: PackBeatmap[];
}

export default function PackBanner({ beatmaps }: PackBannerProps) {
  const [hiddenStrips, setHiddenStrips] = useState<Set<number>>(new Set());

  if (beatmaps.length === 0) return null;

  const sorted = [...beatmaps].sort(
    (a, b) => (b.star_rating ?? 0) - (a.star_rating ?? 0)
  );
  const top = sorted.slice(0, 6);

  return (
    <div className="relative flex h-40 overflow-hidden">
      {top.map((beatmap, i) => (
        <div
          key={beatmap.beatmapset_id}
          className="min-h-full flex-1 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: hiddenStrips.has(i)
              ? 'none'
              : `url(https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg)`,
            backgroundColor: hiddenStrips.has(i) ? 'var(--color-background)' : undefined,
          }}
        >
          {!hiddenStrips.has(i) && (
            <img
              src={`https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg`}
              alt=""
              className="hidden"
              onError={() =>
                setHiddenStrips((prev) => new Set(prev).add(i))
              }
            />
          )}
        </div>
      ))}
      {/* Gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(to top, var(--color-background) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
