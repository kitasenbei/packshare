import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Link } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import JSZip from 'jszip';
import type { StashBeatmap } from '../../../shared/types/beatmap';
import { getPack, trackDownload, type Pack } from '../api/packs';
import { getStoredToken } from '../../auth/api/auth';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import { STASH_STORAGE_KEY } from '../../../shared/utils/stash';

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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
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
      setSnackbar({ open: true, message: 'Removed from stash' });
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
      setSnackbar({ open: true, message: 'Added to stash!' });
    }
  };

  const handleSaveAllToStash = () => {
    if (!pack) return;

    const stash = getStash();
    const existingIds = new Set(stash.map(b => b.id));
    const newMaps = pack.beatmaps.filter(b => !existingIds.has(b.id));

    if (newMaps.length === 0) {
      setSnackbar({ open: true, message: 'All maps already in stash' });
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
    setSnackbar({ open: true, message: `Added ${newMaps.length} maps to stash!` });
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
    setSnackbar({ open: true, message: `Downloading ${toDownload.length} maps...` });
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
      setSnackbar({ open: true, message: `Done! ${failed} map${failed > 1 ? 's' : ''} failed.` });
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
      setSnackbar({ open: true, message: 'All downloads failed — could not create ZIP' });
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
    setSnackbar({ open: true, message: msg });
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
    setSnackbar({ open: true, message: 'Link copied to clipboard!' });
  };

  const handleOpenOsu = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !pack) {
    const isNetworkError = error === 'network_error';
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography variant="h4">
          {isNetworkError ? 'Connection error' : 'Pack not found'}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 400, textAlign: 'center' }}>
          {isNetworkError
            ? 'Could not reach the server. If you\'re using an ad blocker or VPN, try disabling it and refreshing.'
            : 'This pack may have been deleted or the link is invalid.'}
        </Typography>
        <Button variant="outlined" onClick={loadPack} sx={{ mt: 1 }}>
          Try again
        </Button>
      </Box>
    );
  }

  const allInStash = isLoggedIn && pack.beatmaps.every(b => stashedIds.has(b.id));

  const bannerMaps = pack.beatmaps.slice(0, 6);

  return (
    <Box sx={{ minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Paper sx={{ mb: 3, textAlign: 'center', overflow: 'hidden' }}>
          {/* Banner collage */}
          {bannerMaps.length > 0 && (
            <Box sx={{ position: 'relative', height: 140, display: 'flex', overflow: 'hidden' }}>
              {bannerMaps.map((beatmap) => (
                <Box
                  key={beatmap.id}
                  sx={{
                    flex: 1,
                    backgroundImage: `url(https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              ))}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? `linear-gradient(to top, ${theme.palette.background.paper} 0%, transparent 100%)`
                      : 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none',
                }}
              />
            </Box>
          )}
          <Box sx={{ p: 4, pt: bannerMaps.length > 0 ? 0 : 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {pack.name}
          </Typography>
          {pack.description && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {pack.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
            {pack.user ? (
              <Link
                to={`/explore?user_id=${pack.user.id}&username=${encodeURIComponent(pack.user.username)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
              >
                {pack.user.avatar_url && (
                  <Box
                    component="img"
                    src={pack.user.avatar_url}
                    alt={pack.user.username}
                    sx={{ width: 24, height: 24, borderRadius: '50%' }}
                  />
                )}
                <Typography variant="body2" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  by {pack.user.username}
                </Typography>
              </Link>
            ) : (
              <Typography variant="body2" color="text.secondary">
                by Unknown
              </Typography>
            )}
            <Typography variant="body2" color="text.disabled">
              · {pack.beatmaps.length} maps
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadSelected}
              sx={{ px: 3 }}
            >
              {selectedIds.size === 0
                ? 'Download Whole Pack'
                : selectedIds.size < pack.beatmaps.length
                  ? `Download (${selectedIds.size})`
                  : 'Download All'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FolderZipIcon />}
              onClick={handleDownloadZip}
              disabled={zipping}
              sx={{ px: 3 }}
            >
              {zipping
                ? `Zipping ${zipProgress.done}/${zipProgress.total}...`
                : 'ZIP'}
            </Button>
            {isLoggedIn && (
              <Button
                variant="outlined"
                startIcon={<LibraryAddIcon />}
                onClick={handleSaveAllToStash}
                disabled={allInStash}
                sx={{
                  px: 3,
                  borderColor: allInStash ? 'divider' : undefined,
                  color: allInStash ? 'text.disabled' : undefined,
                }}
              >
                {allInStash ? 'All Saved' : 'Save All to Stash'}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              sx={{
                px: 3,
                color: 'text.secondary',
                borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'transparent' },
              }}
            >
              Share
            </Button>
          </Stack>
          </Box>
        </Paper>

        {/* Map List */}
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid',
            borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Beatmaps
            </Typography>
            <Button
              size="small"
              onClick={() => {
                setSelectedIds((prev) =>
                  prev.size === pack.beatmaps.length
                    ? new Set()
                    : new Set(pack.beatmaps.map(b => b.id)),
                );
              }}
              sx={{ color: 'primary.main' }}
            >
              {selectedIds.size === pack.beatmaps.length ? 'Deselect all' : 'Select all'}
            </Button>
          </Box>
          <Box sx={{ p: 1 }}>
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
                        <Tooltip title={isInStash ? 'Remove from stash' : 'Save to stash'}>
                          <IconButton
                            onClick={() => handleSaveToStash(beatmap)}
                            sx={{
                              color: isInStash ? 'primary.main' : 'text.disabled',
                              '&:hover': { color: 'primary.main' },
                            }}
                          >
                            {isInStash ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                      <OsuButton onClick={() => handleOpenOsu(beatmap)} />
                      {selectedIds.has(beatmap.id) ? (
                        <Button
                          size="small"
                          startIcon={<CheckCircleIcon fontSize="small" />}
                          onClick={(e) => { e.stopPropagation(); handleToggleSelect(beatmap.id); }}
                          sx={{
                            color: 'primary.main',
                            textTransform: 'none',
                            minWidth: 'auto',
                          }}
                        >
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
          </Box>
        </Paper>
        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography
            component={Link}
            to="/"
            variant="caption"
            sx={{
              textDecoration: 'none',
              color: 'text.disabled',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { color: 'text.secondary' },
            }}
          >
            powered by
            <Box component="span" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
              pack
              <Box
                component="span"
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 0.5,
                  ml: 0.25,
                  fontSize: 10,
                }}
              >
                share
              </Box>
            </Box>
          </Typography>
        </Box>
      </Container>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
