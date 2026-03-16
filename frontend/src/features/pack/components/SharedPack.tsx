import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, FolderArchive, Share2, LibraryBig } from 'lucide-react';
import JSZip from 'jszip';
import type { StashBeatmap } from '../../../shared/types/beatmap';
import { getPack, trackDownload, type Pack } from '../api/packs';
import { getStoredToken } from '../../auth/api/auth';
import BeatmapPanel from './BeatmapPanel';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import { STASH_STORAGE_KEY } from '../../../shared/utils/stash';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  const [_downloadProgress, setDownloadProgress] = useState<Map<number, number>>(new Map());
  const [failedIds, setFailedIds] = useState<Map<number, string>>(new Map());

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

    const toastId = toast.loading(`Downloading ${toDownload.length} maps...`, {
      description: (
        <div className="mt-1">
          <p className="text-xs text-muted-foreground mb-1">0 / {toDownload.length}</p>
          <Progress value={0} className="h-1.5" />
        </div>
      ),
    });

    const dlFailed: { beatmapsetId: number; name: string; error: string }[] = [];
    let done = 0;

    for (const beatmap of toDownload) {
      const mapName = `${beatmap.artist} - ${beatmap.title}`;
      const pct = Math.round((done / toDownload.length) * 100);
      toast.loading(`Downloading ${toDownload.length} maps...`, {
        id: toastId,
        description: (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-1 truncate">{mapName}</p>
            <p className="text-xs text-muted-foreground mb-1">{done} / {toDownload.length}</p>
            <Progress value={pct} className="h-1.5" />
          </div>
        ),
      });
      try {
        const blob = await fetchWithProgress(beatmap);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapName}.osz`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        trackDownload(pack.share_code, beatmap.beatmapset_id);
      } catch (err) {
        dlFailed.push({ beatmapsetId: beatmap.beatmapset_id, name: mapName, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      done++;
    }

    // Mark failed maps on the list
    if (dlFailed.length > 0) {
      setFailedIds(prev => {
        const next = new Map(prev);
        for (const f of dlFailed) next.set(f.beatmapsetId, f.error);
        return next;
      });
      toast.success(`Downloaded ${done - dlFailed.length} / ${toDownload.length} maps`, {
        id: toastId,
        description: (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-1">{dlFailed.length} failed:</p>
            <ul className="text-xs text-muted-foreground list-disc pl-4">
              {dlFailed.map((f, i) => <li key={i}>{f.name}: {f.error}</li>)}
            </ul>
          </div>
        ),
      });
    } else {
      toast.success(`All ${toDownload.length} maps downloaded!`, { id: toastId });
    }
  };

  const fetchWithProgress = async (beatmap: Pack['beatmaps'][0]): Promise<Blob> => {
    const res = await fetch(`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`);
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const text = await res.text();
        const body = JSON.parse(text);
        if (body.message) message = body.message;
      } catch {
        // Non-JSON response, use HTTP status
      }
      throw new Error(message);
    }
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

    const toastId = toast.loading(`Zipping ${pack.name}...`, {
      description: (
        <div className="mt-1">
          <p className="text-xs text-muted-foreground mb-1">0 / {toDownload.length} maps</p>
          <Progress value={0} className="h-1.5" />
        </div>
      ),
    });

    const zip = new JSZip();
    const failedMaps: { beatmapsetId: number; name: string; error: string }[] = [];
    let done = 0;

    const updateToast = (currentMap?: string) => {
      const pct = Math.round((done / toDownload.length) * 100);
      toast.loading(`Zipping ${pack.name}...`, {
        id: toastId,
        description: (
          <div className="mt-1">
            {currentMap && <p className="text-xs text-muted-foreground mb-1 truncate">{currentMap}</p>}
            <p className="text-xs text-muted-foreground mb-1">{done} / {toDownload.length} maps</p>
            <Progress value={pct} className="h-1.5" />
          </div>
        ),
      });
    };

    // Fetch with concurrency limit of 3
    const queue = [...toDownload];
    const workers = Array.from({ length: 3 }, async () => {
      while (queue.length > 0) {
        const beatmap = queue.shift()!;
        const mapName = `${beatmap.artist} - ${beatmap.title}`;
        updateToast(mapName);
        try {
          const blob = await fetchWithProgress(beatmap);
          zip.file(`${mapName}.osz`, blob);
          trackDownload(pack.share_code, beatmap.beatmapset_id);
        } catch (err) {
          failedMaps.push({ beatmapsetId: beatmap.beatmapset_id, name: mapName, error: err instanceof Error ? err.message : 'Unknown error' });
        }
        done++;
        updateToast();
      }
    });

    await Promise.all(workers);

    // Mark failed maps on the list
    if (failedMaps.length > 0) {
      setFailedIds(new Map(failedMaps.map(f => [f.beatmapsetId, f.error])));
    }

    if (zip.length === 0) {
      setZipping(false);
      toast.error('All downloads failed — could not create ZIP', {
        id: toastId,
        description: (
          <ul className="mt-1 text-xs text-muted-foreground list-disc pl-4">
            {failedMaps.map((f, i) => <li key={i}>{f.name}: {f.error}</li>)}
          </ul>
        ),
      });
      return;
    }

    toast.loading('Generating ZIP file...', { id: toastId });
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
    if (failedMaps.length > 0) {
      toast.success(`${pack.name}.zip downloaded!`, {
        id: toastId,
        description: (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-1">{failedMaps.length} map{failedMaps.length > 1 ? 's' : ''} failed:</p>
            <ul className="text-xs text-muted-foreground list-disc pl-4">
              {failedMaps.map((f, i) => <li key={i}>{f.name}: {f.error}</li>)}
            </ul>
          </div>
        ),
      });
    } else {
      toast.success(`${pack.name}.zip downloaded!`, { id: toastId });
    }
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
                {zipping ? 'Zipping...' : 'ZIP'}
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
          <div className="flex flex-col gap-2 p-2">
            {pack.beatmaps.map((beatmap) => {
              const mapError = failedIds.get(beatmap.beatmapset_id);
              return (
                <BeatmapPanel
                  key={beatmap.id}
                  title={beatmap.title}
                  artist={beatmap.artist}
                  creator={beatmap.creator}
                  keys={beatmap.keys}
                  difficultyName={beatmap.difficulty_name}
                  starRating={beatmap.star_rating}
                  beatmapsetId={beatmap.beatmapset_id}
                  downloads={beatmap.downloads}
                  selected={selectedIds.has(beatmap.id)}
                  error={mapError}
                  onClick={() => handleToggleSelect(beatmap.id)}
                  actions={
                    mapError ? (
                      <OsuButton onClick={() => handleOpenOsu(beatmap)} iconOnly />
                    ) : (
                      <>
                        <OsuButton onClick={() => handleOpenOsu(beatmap)} iconOnly />
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
                          onError={(msg) => setFailedIds(prev => new Map(prev).set(beatmap.beatmapset_id, msg))}
                          iconOnly
                        />
                      </>
                    )
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
