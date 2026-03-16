import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Star, Download, AlertTriangle } from 'lucide-react';

interface BeatmapPanelProps {
  title: string;
  artist: string;
  creator: string;
  keys?: number;
  difficultyName?: string;
  starRating?: number;
  beatmapsetId: number;
  downloads?: number;
  selected?: boolean;
  error?: string;
  onClick?: () => void;
  actions?: ReactNode;
}

export default function BeatmapPanel({
  title,
  artist,
  creator,
  keys,
  difficultyName,
  starRating,
  beatmapsetId,
  downloads,
  selected,
  error,
  onClick,
  actions,
}: BeatmapPanelProps) {
  const listUrl = `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/list.jpg`;
  const cardUrl = `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/card.jpg`;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group/panel flex h-[88px] items-stretch overflow-hidden rounded-lg transition-all',
        'hover:ring-1 hover:ring-border',
        onClick && 'cursor-pointer',
        selected && 'ring-1 ring-primary',
        error && 'ring-1 ring-destructive/50 bg-destructive/5',
      )}
    >
      {/* Cover — list.jpg thumbnail */}
      <div className="h-full w-[80px] shrink-0 overflow-hidden bg-muted">
        <img
          src={listUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Content card — pr expands on hover to reveal actions */}
      <div className="flex flex-1 min-w-0 bg-muted pr-3 transition-[padding] group-hover/panel:pr-0">
        {/* Inner card — card.jpg as background */}
        <div className="relative flex h-full flex-1 items-center min-w-0 -ml-2 overflow-hidden rounded-lg">
          {/* card.jpg background */}
          <img
            src={cardUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Gradient overlay — fades from solid background on the left to translucent on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />

          {/* Info text */}
          <div className="relative z-10 flex-1 min-w-0 px-3">
            {/* info-row--title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-sm font-bold drop-shadow-sm text-foreground">
                {title}
              </span>
              {keys != null && (
                <Badge className="h-4 shrink-0 text-[10px] font-bold">
                  {keys}K
                </Badge>
              )}
            </div>

            {/* info-row--artist */}
            <div className="truncate text-xs font-bold drop-shadow-sm text-foreground">
              by {artist}
            </div>

            {/* info-row--mapper or error */}
            {error ? (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="size-3 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            ) : (
              <div className="truncate text-xs font-bold text-primary">
                mapped by {creator}
              </div>
            )}

            {/* info-row--stats */}
            <div className="mt-1.5 flex items-center gap-2">
              {starRating != null && (
                <Badge variant="secondary" className="bg-foreground text-[10px] font-bold text-background">
                  <Star className="size-3 fill-current" />
                  {starRating.toFixed(2)}
                </Badge>
              )}
              {difficultyName && (
                <Badge className="bg-primary text-[10px] font-bold text-primary-foreground">
                  {difficultyName}
                </Badge>
              )}
              {downloads != null && downloads > 0 && (
                <Badge variant="secondary">
                  <Download className="size-3" />
                  {downloads.toLocaleString()}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions — in the right gap, vertical, visible on hover */}
        {actions && (
          <div
            className={cn(
              'flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden transition-all',
              error
                ? 'w-10 opacity-100'
                : 'w-0 opacity-0 group-hover/panel:w-10 group-hover/panel:opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
