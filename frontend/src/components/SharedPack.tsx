import { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Snackbar, Alert, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import type { StashBeatmap } from '../types/beatmap';
import { getPack, type Pack } from '../api/packs';

const STASH_STORAGE_KEY = 'packshare_stash';

interface SharedPackProps {
  packId?: string;
}

export default function SharedPack({ packId }: SharedPackProps) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleDownloadAll = () => {
    if (!pack) return;
    // Download with delays to avoid popup blocker
    pack.beatmaps.forEach((beatmap, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // 500ms delay between each download
    });
    setSnackbar({ open: true, message: `Starting ${pack.beatmaps.length} downloads...` });
  };

  const handleDownloadSingle = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`, '_blank');
  };

  const handleOpenOsu = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#0d0d1a', color: 'white', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#ff66ab' }} />
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

  const allInStash = pack.beatmaps.every(b => stashedIds.has(b.id));

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
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 2 }}>
            by {pack.user?.username || 'Unknown'} · {pack.beatmaps.length} maps
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadAll}
              sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
            >
              Download All
            </Button>
            <Button
              variant="outlined"
              startIcon={<LibraryAddIcon />}
              onClick={handleSaveAllToStash}
              disabled={allInStash}
              sx={{
                borderColor: allInStash ? 'rgba(255,255,255,0.2)' : '#ff66ab',
                color: allInStash ? 'rgba(255,255,255,0.4)' : '#ff66ab',
                '&:hover': {
                  borderColor: '#ff4499',
                  backgroundColor: 'rgba(255,102,171,0.1)',
                },
              }}
            >
              {allInStash ? 'All Saved' : 'Save All to Stash'}
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6 }}>
          <Typography variant="body2">sent with</Typography>
          <Typography sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            pack
            <Box
              component="span"
              sx={{
                backgroundColor: '#ff66ab',
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
      </Box>

      {/* Map List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {pack.beatmaps.map((beatmap) => {
          const isInStash = stashedIds.has(beatmap.id);
          return (
            <Box
              key={beatmap.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: isInStash ? 'rgba(255,102,171,0.08)' : 'rgba(255,255,255,0.03)',
                '&:hover': { backgroundColor: isInStash ? 'rgba(255,102,171,0.12)' : 'rgba(255,255,255,0.06)' },
                border: isInStash ? '1px solid rgba(255,102,171,0.3)' : '1px solid transparent',
              }}
            >
              {/* Thumbnail */}
              <Box
                component="img"
                src={`https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/list.jpg`}
                sx={{
                  width: 50,
                  height: 38,
                  borderRadius: 0.5,
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {beatmap.keys && (
                <Box
                  sx={{
                    width: 36,
                    height: 26,
                    bgcolor: '#ff66ab',
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {beatmap.keys}K
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 500 }}>
                  {beatmap.artist} - {beatmap.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  mapped by {beatmap.creator}
                  {beatmap.star_rating && ` · ${beatmap.star_rating.toFixed(2)}*`}
                </Typography>
              </Box>
              <Tooltip title={isInStash ? 'Remove from stash' : 'Save to stash'}>
                <IconButton
                  onClick={() => handleSaveToStash(beatmap)}
                  sx={{
                    color: isInStash ? '#ff66ab' : 'rgba(255,255,255,0.5)',
                    '&:hover': { color: '#ff66ab' },
                  }}
                >
                  {isInStash ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Open on osu!">
                <IconButton onClick={() => handleOpenOsu(beatmap)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton onClick={() => handleDownloadSingle(beatmap)} sx={{ color: '#66ff99' }}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
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
          sx={{ backgroundColor: '#1a1a2e', color: 'white', border: '1px solid #ff66ab' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
