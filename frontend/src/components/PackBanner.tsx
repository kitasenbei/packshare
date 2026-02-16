import { useState } from 'react';
import { Box, useTheme } from '@mui/material';
import type { PackBeatmap } from '../api/packs';

interface PackBannerProps {
  beatmaps: PackBeatmap[];
}

export default function PackBanner({ beatmaps }: PackBannerProps) {
  const theme = useTheme();
  const [hiddenStrips, setHiddenStrips] = useState<Set<number>>(new Set());

  if (beatmaps.length === 0) return null;

  const sorted = [...beatmaps].sort(
    (a, b) => (b.star_rating ?? 0) - (a.star_rating ?? 0)
  );
  const top = sorted.slice(0, 6);

  return (
    <Box sx={{ position: 'relative', height: 160, overflow: 'hidden', display: 'flex' }}>
      {top.map((beatmap, i) => (
        <Box
          key={beatmap.beatmapset_id}
          sx={{
            flex: 1,
            minHeight: '100%',
            backgroundImage: hiddenStrips.has(i)
              ? 'none'
              : `url(https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: hiddenStrips.has(i) ? 'background.default' : undefined,
          }}
        >
          {!hiddenStrips.has(i) && (
            <img
              src={`https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg`}
              alt=""
              style={{ display: 'none' }}
              onError={() =>
                setHiddenStrips((prev) => new Set(prev).add(i))
              }
            />
          )}
        </Box>
      ))}
      {/* Gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(to top, ${theme.palette.background.paper} 0%, transparent 100%)`
            : 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
