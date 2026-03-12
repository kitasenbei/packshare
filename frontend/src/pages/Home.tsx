import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Plus,
  Compass,
  Music,
  Eye,
  Folder,
  TrendingUp,
} from 'lucide-react';
import type { User } from '../features/auth/api/auth';
import { getLoginUrl } from '../features/auth/api/auth';
import { getMyPacks, browsePacks, type Pack, type BrowsePacksResult } from '../features/pack/api/packs';
import PackCard from '../features/pack/components/PackCard';

interface HomeProps {
  user?: User | null;
  onOpenCreatePack: () => void;
}

export default function Home({ user, onOpenCreatePack }: HomeProps) {
  const [recentPacks, setRecentPacks] = useState<BrowsePacksResult | null>(null);
  const [popularPacks, setPopularPacks] = useState<BrowsePacksResult | null>(null);
  const [myPacks, setMyPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetches: Promise<unknown>[] = [
      browsePacks(1, 6, 'recent'),
      browsePacks(1, 3, 'popular'),
    ];
    if (user) {
      fetches.push(getMyPacks().catch(() => [] as Pack[]));
    }
    Promise.all(fetches).then(([recent, popular, packs]) => {
      if (cancelled) return;
      setRecentPacks(recent as BrowsePacksResult | null);
      setPopularPacks(popular as BrowsePacksResult | null);
      if (packs) setMyPacks(packs as Pack[]);
      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      setError(err.message || 'Failed to load packs');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  const totalPacks = recentPacks?.total ?? 0;
  const myPackCount = myPacks.length;
  const myTotalMaps = myPacks.reduce((sum, p) => sum + p.beatmaps.length, 0);
  const myTotalViews = myPacks.reduce((sum, p) => sum + p.views, 0);

  return (
    <div>
      {/* Header */}
      {user ? (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar_url}
              alt=""
              className="size-12 rounded-full border-[3px] border-primary"
            />
            <div>
              <h2 className="text-xl font-bold">Welcome back, {user.username}</h2>
              <Popover>
                <PopoverTrigger render={<button className="text-[13px] text-muted-foreground hover:text-primary" />}>
                  See stats
                </PopoverTrigger>
                <PopoverContent className="w-[200px]" align="start">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Folder className="size-5 text-primary" />
                      <span className="text-sm"><strong>{myPackCount}</strong> Packs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Music className="size-5 text-primary" />
                      <span className="text-sm"><strong>{myTotalMaps}</strong> Maps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="size-5 text-primary" />
                      <span className="text-sm"><strong>{myTotalViews.toLocaleString()}</strong> Views</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onOpenCreatePack}>
              <Plus className="size-4" />
              New Pack
            </Button>
            <Button variant="outline" render={<Link to="/my-packs" />}>
              <Folder className="size-4" />
              My Packs
            </Button>
          </div>
        </div>
      ) : (
        <Card className="mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="mb-1 text-2xl font-bold">
                pack
                <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[0.8em] text-primary-foreground">
                  share
                </span>
              </h1>
              <p className="text-muted-foreground">
                Create, share, and discover osu! mania beatmap packs
              </p>
              {totalPacks > 0 && (
                <p className="mt-1 text-sm text-muted-foreground/60">
                  {totalPacks} packs shared by the community
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button render={<a href={getLoginUrl()} />} className="gap-1.5 px-4">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
                  alt=""
                  className="size-[18px]"
                />
                Sign in with osu!
              </Button>
              <Button variant="outline" render={<Link to="/explore" />}>
                Browse Packs
              </Button>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner className="size-6 text-primary" />
        </div>
      )}

      {!loading && (
        <>
          {/* Popular Packs */}
          {popularPacks && popularPacks.packs.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                <h3 className="text-base font-bold">Popular</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {popularPacks.packs.map((pack, i) => (
                  <Link
                    key={pack.id}
                    to={`/pack/${pack.share_code}`}
                    className="overflow-hidden rounded-lg border bg-card text-card-foreground no-underline transition-shadow hover:shadow-md"
                  >
                    {/* Cover strip */}
                    <div className="relative flex h-[72px] overflow-hidden bg-muted">
                      {pack.beatmapset_ids?.slice(0, 5).map((id) => (
                        <img
                          key={id}
                          src={`https://assets.ppy.sh/beatmaps/${id}/covers/cover.jpg`}
                          alt=""
                          className="h-full min-w-0 flex-1 object-cover opacity-70"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ))}
                      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate font-bold">{pack.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <img src={pack.user.avatar_url} alt="" className="size-5 rounded-full" />
                        <span className="text-xs text-muted-foreground">{pack.user.username}</span>
                        <span className="flex-1" />
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="size-3.5" />
                          {pack.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Music className="size-3.5" />
                          {pack.beatmap_count}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Packs */}
          {recentPacks && recentPacks.packs.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="size-5 text-primary" />
                  <h3 className="text-base font-bold">Recent</h3>
                </div>
                <Button variant="link" size="sm" render={<Link to="/explore" />}>
                  View All
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {recentPacks.packs.map((pack) => (
                  <PackCard key={pack.id} pack={pack} compact />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!recentPacks || recentPacks.packs.length === 0) && (!popularPacks || popularPacks.packs.length === 0) && (
            <Card className="p-12 text-center">
              <Compass className="mx-auto mb-4 size-12 text-muted-foreground/50" />
              <h3 className="mb-1 text-lg text-muted-foreground">No packs yet</h3>
              <p className="mb-4 text-muted-foreground">Be the first to create a pack!</p>
              <Button onClick={onOpenCreatePack}>
                <Plus className="size-4" />
                Create Pack
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
