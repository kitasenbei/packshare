import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Music, Eye, ArrowRight } from 'lucide-react';

interface PackCardPack {
  id: number;
  share_code: string;
  name: string;
  description?: string;
  views: number;
  user: {
    username: string;
    avatar_url: string;
  };
  beatmap_count: number;
  beatmapset_ids: number[];
  created_at: string;
}

interface PackCardProps {
  pack: PackCardPack;
  compact?: boolean;
  variant?: 'list' | 'grid';
}

export default function PackCard({ pack, compact, variant }: PackCardProps) {
  if (variant === 'grid') return <GridCard pack={pack} />;
  if (compact) return <CompactCard pack={pack} />;
  return <FullCard pack={pack} />;
}

function FullCard({ pack }: { pack: PackCardPack }) {
  const hasCoverArt = pack.beatmapset_ids && pack.beatmapset_ids.length > 0;

  return (
    <Card className="overflow-hidden transition-colors hover:border-primary">
      <Link to={`/pack/${pack.share_code}`} className="block text-inherit no-underline">
        {hasCoverArt && (
          <div className="relative">
            <div className="flex h-14 overflow-hidden bg-muted">
              {pack.beatmapset_ids.slice(0, 5).map((id) => (
                <img
                  key={id}
                  src={`https://assets.ppy.sh/beatmaps/${id}/covers/cover.jpg`}
                  alt=""
                  className="h-full min-w-0 flex-1 object-cover opacity-80"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}

        <CardContent className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={pack.user.avatar_url} />
            <AvatarFallback>{pack.user.username[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold">{pack.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">by {pack.user.username}</span>
              <Badge variant="secondary">
                <Music className="size-3" />
                {pack.beatmap_count} beatmaps
              </Badge>
              <Badge variant="secondary">
                <Eye className="size-3" />
                {pack.views.toLocaleString()} views
              </Badge>
            </div>
            {pack.description && (
              <p className="mt-2 truncate text-sm text-muted-foreground">{pack.description}</p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </CardContent>
      </Link>
    </Card>
  );
}

function GridCard({ pack }: { pack: PackCardPack }) {
  const hasCoverArt = pack.beatmapset_ids && pack.beatmapset_ids.length > 0;
  return (
    <Card className="h-full pt-0 transition-colors hover:border-primary">
      <div className="relative">
        <div className="flex aspect-[3/1] w-full overflow-hidden bg-muted">
          {hasCoverArt ? (
            pack.beatmapset_ids.slice(0, 4).map((id) => (
              <img
                key={id}
                src={`https://assets.ppy.sh/beatmaps/${id}/covers/cover.jpg`}
                alt=""
                className="h-full min-w-0 flex-1 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <Music className="size-8 text-muted-foreground/20" />
            </div>
          )}
        </div>
        <div className="absolute bottom-2 left-2 flex gap-1">
          <Badge variant="secondary" className="bg-black/60 text-white">
            <Music className="size-3" />
            {pack.beatmap_count} maps
          </Badge>
          <Badge variant="secondary" className="bg-black/60 text-white">
            <Eye className="size-3" />
            {pack.views.toLocaleString()} views
          </Badge>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="truncate">{pack.name}</CardTitle>
        {pack.description && (
          <CardDescription className="truncate">{pack.description}</CardDescription>
        )}
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={pack.user.avatar_url} />
            <AvatarFallback>{pack.user.username[0]}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">{pack.user.username}</span>
        </div>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" render={<Link to={`/pack/${pack.share_code}`} />}>
          Go to pack
          <ArrowRight />
        </Button>
      </CardFooter>
    </Card>
  );
}

function CompactCard({ pack }: { pack: PackCardPack }) {
  return (
    <Card className="overflow-hidden transition-colors hover:border-primary">
      <Link to={`/pack/${pack.share_code}`} className="block text-inherit no-underline">
        <CardContent className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={pack.user.avatar_url} />
            <AvatarFallback>{pack.user.username[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{pack.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{pack.user.username}</span>
              <Badge variant="secondary">
                <Music className="size-3" />
                {pack.beatmap_count} beatmaps
              </Badge>
              <Badge variant="secondary">
                <Eye className="size-3" />
                {pack.views.toLocaleString()} views
              </Badge>
              {/* Stacked thumbnails */}
              {pack.beatmapset_ids && pack.beatmapset_ids.length > 0 && (
                <div className="relative ml-1 h-5">
                  {pack.beatmapset_ids.slice(0, 6).map((id, idx) => (
                    <img
                      key={id}
                      src={`https://assets.ppy.sh/beatmaps/${id}/covers/list.jpg`}
                      alt=""
                      className="absolute h-5 w-7 rounded border border-background object-cover shadow-sm"
                      style={{ left: idx * 12 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </CardContent>
      </Link>
    </Card>
  );
}
