import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Folder } from 'lucide-react';
import { getStarRatingColor } from '../utils/starRating';
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
  normal: { gap: 'gap-1.5', height: 'h-14' },
  compact: { gap: 'gap-1', height: 'h-12' },
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
  const subtitleColor = isLight ? 'text-muted-foreground' : 'text-white/50';
  const hoverBg = isLight ? 'hover:bg-muted' : 'hover:bg-white/[0.06]';

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

  // Inline height values for the thumbnail (needs exact px for square)
  const heightPx = density === 'compact' ? 48 : 56;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-stretch rounded mb-1',
        preset.height,
        preset.gap,
        stashHighlight ? 'border border-primary/30 hover:bg-primary/15' : hoverBg,
        onClick && 'cursor-pointer',
      )}
      style={sx as React.CSSProperties}
    >
      {/* Square thumbnail */}
      {hasBgThumb && (
        <div
          className="relative shrink-0 overflow-hidden rounded"
          style={{ width: heightPx, height: heightPx }}
        >
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          {starRating != null && (() => {
            const srColor = getStarRatingColor(starRating);
            return (
              <div className={cn('absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 py-0.5 text-[10px] font-bold leading-none', srColor.bg, srColor.text)}>
                ★ {starRating.toFixed(2)}
              </div>
            );
          })()}
        </div>
      )}

      {/* Content (centered vertically when thumbnail stretches the row) */}
      <div className={cn('flex flex-1 items-center min-w-0', preset.gap)}>
        {/* Checkbox */}
        {checkbox && (
          <Checkbox
            checked={checkbox.checked}
            disabled={checkbox.disabled}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={checkbox.onChange}
          />
        )}

        {/* Slot badge (tournament) */}
        {slotBadge && (
          <SlotBadge label={slotBadge.label} color={slotBadge.color} onClick={slotBadge.onClick} />
        )}

        {/* Mod chips (tournament) */}
        {modChips && modChips.map((mc) => (
          <span
            key={mc.label}
            className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full px-2 text-xs font-bold text-white"
            style={{ backgroundColor: mc.color }}
          >
            {mc.icon && <img src={mc.icon} alt="" className="size-7" />}
            {mc.label}
          </span>
        ))}

        {/* Map info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'truncate font-medium',
                density === 'compact' ? 'text-sm' : 'text-base',
              )}
            >
              {titleOnly ? title : `${artist} - ${title}`}
            </span>
            {keys != null && (
              <Badge className="h-5 shrink-0 text-[11px] font-bold">
                {keys}K
              </Badge>
            )}
          </div>

          {/* Subtitle */}
          {(subtitleParts.length > 0 || sourceChip) && (
            density === 'compact' && sourceChip ? (
              <div className="flex items-center gap-2">
                <span className={cn('truncate text-xs', subtitleColor)}>
                  {subtitleParts}
                </span>
                <span
                  className="inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5 text-[10px] text-white"
                  style={{ backgroundColor: sourceChip.color }}
                >
                  {sourceChip.label}
                </span>
                {sourceTooltip && (
                  <span className="flex shrink-0 items-center gap-1">
                    <Folder className="size-3.5 text-muted-foreground/50" />
                    <span className="truncate text-xs text-muted-foreground/50">
                      {sourceTooltip}
                    </span>
                  </span>
                )}
              </div>
            ) : (
              <span
                className={cn(
                  'block truncate',
                  density === 'compact' ? 'text-xs' : 'text-sm',
                  subtitleColor,
                )}
              >
                {subtitleParts}
              </span>
            )
          )}

          {/* Title-only subtitle (artist // creator) */}
          {titleOnly && (
            <span className={cn('block truncate text-xs', subtitleColor)}>
              {artist} // {creator}
            </span>
          )}
        </div>

        {/* Separate star rating (tournament style) */}
        {starRatingSeparate && starRating != null && (() => {
          const srColor = getStarRatingColor(starRating);
          return (
            <Badge className={cn('mr-2 font-bold', srColor.bg, srColor.text)}>
              ★ {starRating.toFixed(2)}
            </Badge>
          );
        })()}

        {/* Status chip */}
        {statusChip && (
          <Badge variant="secondary" className="text-[10px]">
            {statusChip.label}
          </Badge>
        )}

        {/* Actions slot */}
        {actions}
      </div>
    </div>
  );
}
