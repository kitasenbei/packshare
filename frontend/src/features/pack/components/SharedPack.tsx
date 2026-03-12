import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, FolderArchive, Share2, Bookmark, BookmarkX, LibraryBig, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import type { StashBeatmap } from '../../../shared/types/beatmap';
import { getPack, trackDownload, type Pack } from '../api/packs';
import { getStoredToken } from '../../auth/api/auth';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import { STASH_STORAGE_KEY } from '../../../shared/utils/stash';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';

interface SharedPackProps {
  packId?: string;
}

export default function SharedPack({ packId }: SharedPackProps) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoggedIn = !!getStoredToken();
  const [stashedIds, setStashedIds] = useState<Set<number>>(() => {
    const saved = localStorage.getItem(STASH_STORAGE_KEY);
    if (saved) {
      try {
        const stash: StashBeatmap[] = JSON.parse(saved);
        return new Set(stash.map(b => b.id));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 });
  const [downloadProgress, setDownloadProgress] = useState<Map<number, number>>(new Map());

  const loadPack = useCallback(() => {
    if (!packId) {
      setError('No pack ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getPack(packId)
      .then((data) => {
        setPack(data);
        setSelectedIds(new Set(data.beatmaps.map(b => b.id)));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load pack');
        setLoading(false);
      });
  }, [packId]);

  useEffect(() => {
    loadPack();
  }, [loadPack]);

  const getStash = (): StashBeatmap[] => {
    const saved = localStorage.getItem(STASH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  };

  const saveStash = (stash: StashBeatmap[]) => {
    localStorage.setItem(STASH_STORAGE_KEY, JSON.stringify(stash));
    setStashedIds(new Set(stash.map(b => b.id)));
  };

  const handleSaveToStash = (beatmap: Pack['beatmaps'][0]) => {
    if (!pack) return;
    const stash = getStash();
    if (stash.some(b => b.id === beatmap.id)) {
      const newStash = stash.filter(b => b.id !== beatmap.id);
      saveStash(newStash);
      toast('Removed from stash');
    } else {
      const newItem: StashBeatmap = {
        id: beatmap.id,
        beatmapsetId: beatmap.beatmapset_id,
        title: beatmap.title,
        artist: beatmap.artist,
        creator: beatmap.creator,
        keys: beatmap.keys,
        addedAt: new Date(),
        source: 'browse',
        sourcePackId: pack.share_code,
        sourcePackName: pack.name,
      };
      saveStash([...stash, newItem]);
      toast('Added to stash!');
    }
  };

  const handleSaveAllToStash = () => {
    if (!pack) return;

    const stash = getStash();
    const existingIds = new Set(stash.map(b => b.id));
    const newMaps = pack.beatmaps.filter(b => !existingIds.has(b.id));

    if (newMaps.length === 0) {
      toast('All maps already in stash');
      return;
    }

    const newItems: StashBeatmap[] = newMaps.map(beatmap => ({
      id: beatmap.id,
      beatmapsetId: beatmap.beatmapset_id,
      title: beatmap.title,
      artist: beatmap.artist,
      creator: beatmap.creator,
      keys: beatmap.keys,
      addedAt: new Date(),
      source: 'browse' as const,
      sourcePackId: pack.share_code,
      sourcePackName: pack.name,
    }));

    saveStash([...stash, ...newItems]);
    toast(`Added ${newMaps.length} maps to stash!`);
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadSelected = async () => {
    if (!pack) return;
    const toDownload = selectedIds.size > 0
      ? pack.beatmaps.filter(b => selectedIds.has(b.id))
      : pack.beatmaps;
    toast(`Downloading ${toDownload.length} maps...`);
    let failed = 0;
    for (const beatmap of toDownload) {
      try {
        const res = await fetch(`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`);
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${beatmap.artist} - ${beatmap.title}.osz`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        trackDownload(pack.share_code, beatmap.beatmapset_id);
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      toast(`Done! ${failed} map${failed > 1 ? 's' : ''} failed.`);
    }
  };

  const fetchWithProgress = async (beatmap: Pack['beatmaps'][0]): Promise<Blob> => {
    const res = await fetch(`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = res.headers.get('content-length');
    if (!contentLength || !res.body) {
      // Fallback: no streaming progress
      setDownloadProgress(prev => new Map(prev).set(beatmap.id, -1));
      const blob = await res.blob();
      setDownloadProgress(prev => new Map(prev).set(beatmap.id, 1));
      return blob;
    }
    const total = parseInt(contentLength, 10);
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    setDownloadProgress(prev => new Map(prev).set(beatmap.id, 0));
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      setDownloadProgress(prev => new Map(prev).set(beatmap.id, received / total));
    }
    setDownloadProgress(prev => new Map(prev).set(beatmap.id, 1));
    return new Blob(chunks);
  };

  const handleDownloadZip = useCallback(async () => {
    if (!pack) return;
    const toDownload = selectedIds.size > 0
      ? pack.beatmaps.filter(b => selectedIds.has(b.id))
      : pack.beatmaps;

    setZipping(true);
    setZipProgress({ done: 0, total: toDownload.length });
    setDownloadProgress(new Map());

    const zip = new JSZip();
    let failed = 0;

    // Fetch with concurrency limit of 3
    const queue = [...toDownload];
    const workers = Array.from({ length: 3 }, async () => {
      while (queue.length > 0) {
        const beatmap = queue.shift()!;
        try {
          const blob = await fetchWithProgress(beatmap);
          zip.file(`${beatmap.artist} - ${beatmap.title}.osz`, blob);
          trackDownload(pack.share_code, beatmap.beatmapset_id);
        } catch {
          failed++;
          setDownloadProgress(prev => { const m = new Map(prev); m.delete(beatmap.id); return m; });
        }
        setZipProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    });

    await Promise.all(workers);

    if (zip.length === 0) {
      setZipping(false);
      setDownloadProgress(new Map());
      toast('All downloads failed — could not create ZIP');
      return;
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setZipping(false);
    setDownloadProgress(new Map());
    const msg = failed > 0
      ? `ZIP ready! ${failed} map${failed > 1 ? 's' : ''} failed to download.`
      : 'ZIP downloaded!';
    toast(msg);
  }, [pack, selectedIds]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pack?.name,
          text: pack ? `Check out this beatmap pack: ${pack.name}` : undefined,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fall back to copy
      }
    }
    navigator.clipboard.writeText(shareUrl);
    toast('Link copied to clipboard!');
  };

  const handleOpenOsu = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (error || !pack) {
    const isNetworkError = error === 'network_error';
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <h2 className="text-2xl font-bold">
          {isNetworkError ? 'Connection error' : 'Pack not found'}
        </h2>
        <p className="max-w-[400px] text-center text-muted-foreground">
          {isNetworkError
            ? 'Could not reach the server. If you\'re using an ad blocker or VPN, try disabling it and refreshing.'
            : 'This pack may have been deleted or the link is invalid.'}
        </p>
        <Button variant="outline" onClick={loadPack} className="mt-1">
          Try again
        </Button>
      </div>
    );
  }

  const allInStash = isLoggedIn && pack.beatmaps.every(b => stashedIds.has(b.id));

  const bannerMaps = pack.beatmaps.slice(0, 6);

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <Card className="mb-3 gap-0 overflow-hidden py-0 text-center">
          {/* Banner collage */}
          {bannerMaps.length > 0 && (
            <div className="relative flex h-[140px] overflow-hidden">
              {bannerMaps.map((beatmap) => (
                <div
                  key={beatmap.id}
                  className="flex-1 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg)`,
                  }}
                />
              ))}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card to-transparent"
              />
            </div>
          )}
          <div className={`p-8 ${bannerMaps.length > 0 ? 'pt-0' : ''}`}>
            <h2 className="mb-1 text-2xl font-bold">
              {pack.name}
            </h2>
            {pack.description && (
              <p className="mb-2 text-muted-foreground">
                {pack.description}
              </p>
            )}
            <div className="mb-3 flex items-center justify-center gap-1">
              {pack.user ? (
                <Link
                  to={`/explore?user_id=${pack.user.id}&username=${encodeURIComponent(pack.user.username)}`}
                  className="flex items-center gap-2 no-underline"
                >
                  {pack.user.avatar_url && (
                    <img
                      src={pack.user.avatar_url}
                      alt={pack.user.username}
                      className="size-6 rounded-full"
                    />
                  )}
                  <span className="text-sm text-muted-foreground hover:text-primary">
                    by {pack.user.username}
                  </span>
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">
                  by Unknown
                </span>
              )}
              <span className="text-sm text-muted-foreground/50">
                · {pack.beatmaps.length} maps
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Button
                onClick={handleDownloadSelected}
                className="px-3"
              >
                <Download data-icon="inline-start" />
                {selectedIds.size === 0
                  ? 'Download Whole Pack'
                  : selectedIds.size < pack.beatmaps.length
                    ? `Download (${selectedIds.size})`
                    : 'Download All'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadZip}
                disabled={zipping}
                className="px-3"
              >
                <FolderArchive data-icon="inline-start" />
                {zipping
                  ? `Zipping ${zipProgress.done}/${zipProgress.total}...`
                  : 'ZIP'}
              </Button>
              {isLoggedIn && (
                <Button
                  variant="outline"
                  onClick={handleSaveAllToStash}
                  disabled={allInStash}
                  className="px-3"
                >
                  <LibraryBig data-icon="inline-start" />
                  {allInStash ? 'All Saved' : 'Save All to Stash'}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleShare}
              >
                <Share2 data-icon="inline-start" />
                Share
              </Button>
            </div>
          </div>
        </Card>

        {/* Map List */}
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b border-border p-2">
            <span className="text-sm font-bold">
              Beatmaps
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds((prev) =>
                  prev.size === pack.beatmaps.length
                    ? new Set()
                    : new Set(pack.beatmaps.map(b => b.id)),
                );
              }}
              className="text-primary"
            >
              {selectedIds.size === pack.beatmaps.length ? 'Deselect all' : 'Select all'}
            </Button>
          </div>
          <div className="p-1">
            {pack.beatmaps.map((beatmap) => {
              const isInStash = isLoggedIn && stashedIds.has(beatmap.id);
              const dlProgress = downloadProgress.get(beatmap.id);
              const isDownloading = dlProgress !== undefined;
              let rowSx: Record<string, unknown> | undefined;
              let statusChip: { label: string } | undefined;
              if (isDownloading) {
                if (dlProgress < 0) {
                  rowSx = { background: 'rgba(100,180,255,0.10)' };
                  statusChip = { label: 'Fetching...' };
                } else if (dlProgress >= 1) {
                  rowSx = { background: 'rgba(100,200,100,0.12)' };
                  statusChip = { label: '100%' };
                } else {
                  const pct = Math.round(dlProgress * 100);
                  rowSx = { background: `linear-gradient(to right, rgba(100,180,255,0.15) ${pct}%, transparent ${pct}%)` };
                  statusChip = { label: `${pct}%` };
                }
              } else if (!zipping && selectedIds.has(beatmap.id)) {
                rowSx = { backgroundColor: 'rgba(100,180,255,0.08)' };
              }
              return (
                <BeatmapRow
                  key={beatmap.id}
                  title={beatmap.title}
                  artist={beatmap.artist}
                  keys={beatmap.keys}
                  creator={beatmap.downloads ? `${beatmap.creator} · ${beatmap.downloads} download${beatmap.downloads !== 1 ? 's' : ''}` : beatmap.creator}
                  creatorPrefix="mapped by"
                  difficultyName={beatmap.difficulty_name}
                  starRating={beatmap.star_rating}
                  beatmapsetId={beatmap.beatmapset_id}
                  density="compact"
                  stashHighlight={isInStash}
                  onClick={() => handleToggleSelect(beatmap.id)}
                  statusChip={statusChip}
                  sx={rowSx}
                  actions={
                    <>
                      {isLoggedIn && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleSaveToStash(beatmap)}
                                className={isInStash ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
                              />
                            }
                          >
                            {isInStash ? <BookmarkX className="size-4" /> : <Bookmark className="size-4" />}
                          </TooltipTrigger>
                          <TooltipContent>
                            {isInStash ? 'Remove from stash' : 'Save to stash'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <OsuButton onClick={() => handleOpenOsu(beatmap)} />
                      {selectedIds.has(beatmap.id) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleToggleSelect(beatmap.id); }}
                          className="min-w-0 text-primary"
                        >
                          <CheckCircle2 className="size-4" data-icon="inline-start" />
                          Selected
                        </Button>
                      ) : (
                        <DownloadButton
                          downloadUrl={`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`}
                          downloadName={`${beatmap.artist} - ${beatmap.title}`}
                          stashData={{
                            id: beatmap.id,
                            beatmapsetId: beatmap.beatmapset_id,
                            title: beatmap.title,
                            artist: beatmap.artist,
                            creator: beatmap.creator,
                            keys: beatmap.keys,
                            source: 'download',
                            sourcePackId: pack!.share_code,
                            sourcePackName: pack!.name,
                          }}
                          onDownloaded={() => trackDownload(pack!.share_code, beatmap.beatmapset_id)}
                        />
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        </Card>
        {/* Footer */}
        <div className="mt-4 flex justify-center">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-muted-foreground/50 no-underline hover:text-muted-foreground"
          >
            powered by
            <span className="font-bold text-muted-foreground">
              pack
              <span
                className="ml-0.5 rounded bg-primary px-1 py-px text-[10px] text-white"
              >
                share
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
