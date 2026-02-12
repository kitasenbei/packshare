import type { ReactNode } from 'react';
import { Box, Typography, Chip, Checkbox, Tooltip, Stack } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';

export interface BeatmapRowProps {
  // Core (always shown)
  title: string;
  artist: string;
  keys?: number;

  // Title format
  titleOnly?: boolean; // Show just title (not "artist - title")

  // Subtitle parts
  creator?: string;
  creatorPrefix?: string; // e.g. "mapped by"
  starRating?: number; // Inline "· X.XX*"
  starRatingSeparate?: boolean; // Show star as separate bold element (tournament)
  bpm?: number; // "· {bpm} BPM"
  difficultyName?: string; // "[diff]" in subtitle

  // Thumbnail
  beatmapsetId?: number;
  showThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };

  // Tournament badges (replace keys badge)
  slotBadge?: { label: string; color: string };
  modChip?: { label: string; color: string };

  // Stash metadata
  sourceChip?: { label: string; color: string };
  sourceTooltip?: ReactNode;

  // Selection
  checkbox?: { checked: boolean; disabled?: boolean; onChange: () => void };
  statusChip?: { label: string };

  // Visual
  stashHighlight?: boolean; // Pink border (SharedPack)
  variant?: 'light' | 'dark'; // Theme, defaults to 'light'
  density?: 'compact' | 'normal'; // Padding preset, defaults to 'normal'
  showDivider?: boolean;

  // Composable actions (trailing slot)
  actions?: ReactNode;

  // Interaction
  onClick?: () => void;
  sx?: Record<string, unknown>;
}

const densityPresets = {
  normal: { p: 2, py: 2, px: 2, gap: 2 },
  compact: { p: undefined, py: 1.5, px: 1, gap: 1.5 },
};

export default function BeatmapRow({
  title,
  artist,
  keys,
  titleOnly,
  creator,
  creatorPrefix,
  starRating,
  starRatingSeparate,
  bpm,
  difficultyName,
  beatmapsetId,
  showThumbnail,
  thumbnailSize,
  slotBadge,
  modChip,
  sourceChip,
  sourceTooltip,
  checkbox,
  statusChip,
  stashHighlight,
  variant = 'light',
  density = 'normal',
  showDivider,
  actions,
  onClick,
  sx,
}: BeatmapRowProps) {
  const preset = densityPresets[density];
  const isLight = variant === 'light';
  const subtitleColor = isLight ? 'text.secondary' : 'rgba(255,255,255,0.5)';
  const hoverBg = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.06)';

  // Build padding style
  const paddingStyle =
    density === 'normal'
      ? { p: preset.p }
      : { py: preset.py, px: preset.px };

  // Build subtitle parts
  const subtitleParts: ReactNode[] = [];

  if (difficultyName) {
    subtitleParts.push(`[${difficultyName}]`);
  }

  if (creator) {
    const creatorText = creatorPrefix ? `${creatorPrefix} ${creator}` : creator;
    if (subtitleParts.length > 0) {
      subtitleParts.push(` ${creatorText}`);
    } else {
      subtitleParts.push(creatorText);
    }
  }

  if (starRating != null && !starRatingSeparate) {
    subtitleParts.push(` · ${starRating.toFixed(2)}*`);
  }

  if (bpm != null) {
    subtitleParts.push(` · ${bpm} BPM`);
  }

  return (
    <>
      {showDivider && <Box sx={{ borderBottom: '1px solid', borderColor: isLight ? 'divider' : 'rgba(255,255,255,0.08)' }} />}
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: preset.gap,
          ...paddingStyle,
          borderRadius: variant === 'dark' ? 1 : 0,
          backgroundColor: stashHighlight
            ? 'rgba(255,102,171,0.08)'
            : variant === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : undefined,
          '&:hover': {
            backgroundColor: stashHighlight ? 'rgba(255,102,171,0.12)' : hoverBg,
          },
          border: stashHighlight ? '1px solid rgba(255,102,171,0.3)' : stashHighlight === false ? '1px solid transparent' : undefined,
          cursor: onClick ? 'pointer' : undefined,
          ...sx,
        }}
      >
        {/* Checkbox */}
        {checkbox && (
          <Checkbox
            checked={checkbox.checked}
            disabled={checkbox.disabled}
            onClick={(e) => e.stopPropagation()}
            onChange={checkbox.onChange}
            sx={{ '&.Mui-checked': { color: '#ff66ab' } }}
          />
        )}

        {/* Thumbnail */}
        {showThumbnail && beatmapsetId && (
          <Box
            component="img"
            src={`https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/list.jpg`}
            sx={{
              width: thumbnailSize?.width ?? (density === 'compact' ? 50 : 60),
              height: thumbnailSize?.height ?? (density === 'compact' ? 38 : 45),
              borderRadius: density === 'compact' ? 0.5 : 1,
              objectFit: 'cover',
              flexShrink: 0,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {/* Slot badge (tournament) */}
        {slotBadge && (
          <Box
            sx={{
              backgroundColor: slotBadge.color,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 'bold',
              fontSize: 14,
              minWidth: 48,
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            {slotBadge.label}
          </Box>
        )}

        {/* Mod chip (tournament) */}
        {modChip && (
          <Chip
            label={modChip.label}
            size="small"
            sx={{
              backgroundColor: modChip.color,
              color: 'white',
              fontWeight: 'bold',
              fontSize: 11,
              height: 22,
            }}
          />
        )}

        {/* Map info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant={density === 'compact' ? 'body2' : undefined}
              sx={{ fontWeight: 500 }}
              noWrap
            >
              {titleOnly ? title : `${artist} - ${title}`}
            </Typography>
            {keys != null && (
              <Chip
                label={`${keys}K`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 11,
                  fontWeight: 'bold',
                  backgroundColor: '#ff66ab',
                  color: 'white',
                  flexShrink: 0,
                }}
              />
            )}
          </Stack>

          {/* Subtitle */}
          {(subtitleParts.length > 0 || sourceChip) && (
            density === 'compact' && sourceChip ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color={subtitleColor} noWrap>
                  {subtitleParts}
                </Typography>
                <Chip
                  label={sourceChip.label}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    backgroundColor: sourceChip.color,
                    color: 'white',
                  }}
                />
                {sourceTooltip && (
                  <Tooltip title={sourceTooltip}>
                    <FolderIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  </Tooltip>
                )}
              </Stack>
            ) : (
              <Typography
                variant={density === 'compact' ? 'caption' : 'body2'}
                sx={{ color: subtitleColor }}
                noWrap
              >
                {subtitleParts}
              </Typography>
            )
          )}

          {/* Title-only subtitle (artist // creator) */}
          {titleOnly && (
            <Typography variant="caption" color={subtitleColor} noWrap>
              {artist} // {creator}
            </Typography>
          )}
        </Box>

        {/* Separate star rating (tournament style) */}
        {starRatingSeparate && starRating != null && (
          <Typography sx={{ color: '#f5c842', fontWeight: 'bold', mr: 2 }}>
            ★ {starRating.toFixed(2)}
          </Typography>
        )}

        {/* Status chip */}
        {statusChip && (
          <Chip label={statusChip.label} size="small" sx={{ fontSize: 10 }} />
        )}

        {/* Actions slot */}
        {actions}
      </Box>
    </>
  );
}
