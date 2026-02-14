import { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { StashBeatmap } from '../types/beatmap';
import { getPack, type Pack } from '../api/packs';
import { getStoredToken } from '../api/auth';
import BeatmapRow from './BeatmapRow';
import DownloadButton from './DownloadButton';
import OsuButton from './OsuButton';
import { STASH_STORAGE_KEY } from '../utils/stash';

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

  useEffect(() => {
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

  const handleDownloadSelected = () => {
    if (!pack) return;
    const toDownload = selectedIds.size > 0
      ? pack.beatmaps.filter(b => selectedIds.has(b.id))
      : pack.beatmaps;
    toDownload.forEach((beatmap, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500);
    });
    setSnackbar({ open: true, message: `Starting ${toDownload.length} downloads...` });
  };


  const handleOpenOsu = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#0d0d1a', color: 'white', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !pack) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#0d0d1a', color: 'white', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Pack not found</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>{error || 'This pack may have been deleted or the link is invalid.'}</Typography>
      </Box>
    );
  }

  const allInStash = isLoggedIn && pack.beatmaps.every(b => stashedIds.has(b.id));

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0d0d1a', color: 'white', p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {pack.name}
          </Typography>
          {pack.description && (
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
              {pack.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'primary.main' } }}>
                  by {pack.user.username}
                </Typography>
              </Link>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                by Unknown
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              · {pack.beatmaps.length} maps
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadSelected}
              sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
            >
              {selectedIds.size === 0
                ? 'Download Whole Pack'
                : selectedIds.size < pack.beatmaps.length
                  ? `Download (${selectedIds.size})`
                  : 'Download All'}
            </Button>
            {isLoggedIn && (
              <Button
                variant="outlined"
                startIcon={<LibraryAddIcon />}
                onClick={handleSaveAllToStash}
                disabled={allInStash}
                sx={{
                  borderColor: allInStash ? 'rgba(255,255,255,0.2)' : 'primary.main',
                  color: allInStash ? 'rgba(255,255,255,0.4)' : 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: 'rgba(255,102,171,0.1)',
                  },
                }}
              >
                {allInStash ? 'All Saved' : 'Save All to Stash'}
              </Button>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6 }}>
            <Typography variant="body2">sent with</Typography>
            <Typography sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              pack
              <Box
                component="span"
                sx={{
                  backgroundColor: 'primary.main',
                  px: 0.5,
                  py: 0.15,
                  borderRadius: 0.5,
                  ml: 0.5,
                  fontSize: 12,
                }}
              >
                share
              </Box>
            </Typography>
          </Box>
          <Tooltip title="Copy link">
            <IconButton
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setSnackbar({ open: true, message: 'Link copied!' });
              }}
              sx={{
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
              }}
              size="small"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Map List */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {pack.beatmaps.map((beatmap) => {
          const isInStash = isLoggedIn && stashedIds.has(beatmap.id);
          return (
            <BeatmapRow
              key={beatmap.id}
              title={beatmap.title}
              artist={beatmap.artist}
              keys={beatmap.keys}
              creator={beatmap.creator}
              creatorPrefix="mapped by"
              starRating={beatmap.star_rating}
              beatmapsetId={beatmap.beatmapset_id}
              variant="dark"
              density="compact"
              stashHighlight={isInStash}
              onClick={() => handleToggleSelect(beatmap.id)}
              sx={selectedIds.has(beatmap.id) ? { backgroundColor: 'rgba(100,180,255,0.12)' } : undefined}
              actions={
                <>
                  {isLoggedIn && (
                    <Tooltip title={isInStash ? 'Remove from stash' : 'Save to stash'}>
                      <IconButton
                        onClick={() => handleSaveToStash(beatmap)}
                        sx={{
                          color: isInStash ? 'primary.main' : 'rgba(255,255,255,0.5)',
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {isInStash ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  )}
                  <OsuButton onClick={() => handleOpenOsu(beatmap)} variant="dark" />
                  {selectedIds.has(beatmap.id) ? (
                    <Button
                      size="small"
                      startIcon={<CheckCircleIcon fontSize="small" />}
                      onClick={(e) => { e.stopPropagation(); handleToggleSelect(beatmap.id); }}
                      sx={{
                        color: '#64b4ff',
                        '&:hover': { color: '#64b4ff' },
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
                      variant="dark"
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
                    />
                  )}
                </>
              }
            />
          );
        })}
      </Box>

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
          sx={{ backgroundColor: '#1a1a2e', color: 'white', border: 1, borderColor: 'primary.main' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
