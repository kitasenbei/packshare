import type { ReactNode } from 'react';
import { Box, Typography, Chip, Checkbox, Stack } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import SlotBadge from './SlotBadge';

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

  // Thumbnail background
  beatmapsetId?: number;

  // Tournament badges (replace keys badge)
  slotBadge?: { label: string; color: string; onClick?: (e: React.MouseEvent) => void };
  modChips?: { label: string; color: string; icon?: string }[];

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
  // Composable actions (trailing slot)
  actions?: ReactNode;

  // Interaction
  onClick?: () => void;
  sx?: Record<string, unknown>;
}

const densityPresets = {
  normal: { gap: 1.5, height: 56 },
  compact: { gap: 1, height: 48 },
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
  slotBadge,
  modChips,
  sourceChip,
  sourceTooltip,
  checkbox,
  statusChip,
  stashHighlight,
  variant = 'light',
  density = 'normal',
  actions,
  onClick,
  sx,
}: BeatmapRowProps) {
  const preset = densityPresets[density];
  const isLight = variant === 'light';
  const subtitleColor = isLight ? 'text.secondary' : 'rgba(255,255,255,0.5)';
  const hoverBg = isLight ? 'action.hover' : 'rgba(255,255,255,0.06)';

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

  if (starRating != null && !starRatingSeparate && beatmapsetId == null) {
    subtitleParts.push(` · ${starRating.toFixed(2)}*`);
  }

  if (bpm != null) {
    subtitleParts.push(` · ${bpm} BPM`);
  }

  const hasBgThumb = beatmapsetId != null;
  const thumbUrl = hasBgThumb ? `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/list.jpg` : '';

  return (
    <>
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          height: preset.height,
          gap: preset.gap,
          mb: 1,
          borderRadius: 1,
          '&:hover': {
            backgroundColor: stashHighlight ? 'rgba(132,169,140,0.15)' : hoverBg,
          },
          border: stashHighlight ? '1px solid rgba(132,169,140,0.3)' : undefined,
          cursor: onClick ? 'pointer' : undefined,
          ...sx,
        }}
      >
        {/* Square thumbnail */}
        {hasBgThumb && (
          <Box
            sx={{
              width: preset.height,
              height: preset.height,
              borderRadius: 1,
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <Box
              component="img"
              src={thumbUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {starRating != null && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                  py: 0.25,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: '#f5c842',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ★ {starRating.toFixed(2)}
              </Box>
            )}
          </Box>
        )}

        {/* Content (centered vertically when thumbnail stretches the row) */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: preset.gap, minWidth: 0 }}>
          {/* Checkbox */}
          {checkbox && (
            <Checkbox
              checked={checkbox.checked}
              disabled={checkbox.disabled}
              onClick={(e) => e.stopPropagation()}
              onChange={checkbox.onChange}
              sx={{ '&.Mui-checked': { color: 'primary.main' } }}
            />
          )}

          {/* Slot badge (tournament) */}
          {slotBadge && (
            <SlotBadge label={slotBadge.label} color={slotBadge.color} onClick={slotBadge.onClick} />
          )}

          {/* Mod chips (tournament) */}
          {modChips && modChips.map((mc) => (
            <Chip
              key={mc.label}
              label={mc.label}
              size="small"
              icon={mc.icon ? <Box component="img" src={mc.icon} alt="" sx={{ width: 28, height: 28 }} /> : undefined}
              sx={{
                backgroundColor: mc.color,
                color: 'white',
                fontWeight: 'bold',
                fontSize: 12,
                height: 30,
              }}
            />
          ))}

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
                    backgroundColor: 'primary.main',
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
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <FolderIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled" noWrap>
                        {sourceTooltip}
                      </Typography>
                    </Stack>
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
      </Box>
    </>
  );
}
