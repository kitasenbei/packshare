import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Pagination,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BackButton from './BackButton';
import { getPack, type Pack } from '../api/packs';
import BeatmapRow from './BeatmapRow';
import DownloadButton from './DownloadButton';
import OsuButton from './OsuButton';
import PackBanner from './PackBanner';

const MAPS_PER_PAGE = 10;

interface PackViewerProps {
  packId?: string;
}

export default function PackViewer({ packId }: PackViewerProps) {
  const navigate = useNavigate();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !pack) {
    return (
      <Box sx={{}}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Pack not found</Typography>
          <Typography color="text.secondary">{error || 'This pack may have been deleted or the link is invalid.'}</Typography>
        </Paper>
        <BackButton onClick={() => navigate(-1)} />
      </Box>
    );
  }

  const pageCount = Math.ceil(pack.beatmaps.length / MAPS_PER_PAGE);
  const displayMaps = pack.beatmaps.slice(
    (currentPage - 1) * MAPS_PER_PAGE,
    currentPage * MAPS_PER_PAGE
  );

  const hasSelection = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = () => {
    const targets = hasSelection
      ? pack.beatmaps.filter((b) => selectedIds.has(b.id))
      : pack.beatmaps;
    targets.forEach((beatmap, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500);
    });
    setSelectedIds(new Set());
  };


  const handleOpenOsu = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank');
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/s/${pack.share_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pack.name,
          text: `Check out this beatmap pack: ${pack.name}`,
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

  return (
    <Box sx={{}}>
      {/* Header Card */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <PackBanner beatmaps={pack.beatmaps} />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                {pack.name}
              </Typography>
              {pack.description && (
                <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 600 }}>
                  {pack.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {pack.user?.avatar_url && (
                    <Box
                      component="img"
                      src={pack.user.avatar_url}
                      sx={{ width: 24, height: 24, borderRadius: '50%' }}
                    />
                  )}
                  <Typography variant="body2" color="text.secondary">{pack.user?.username || 'Unknown'}</Typography>
                </Box>
                <Typography variant="body2" color="text.disabled">
                  {pack.beatmaps.length} maps
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  {pack.views.toLocaleString()} views
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Created at {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  sx={{
                    backgroundColor: hasSelection ? '#64b5f6' : 'primary.main',
                    '&:hover': { backgroundColor: hasSelection ? '#42a5f5' : 'primary.dark' },
                    borderRadius: 99,
                    px: 3,
                  }}
                >
                  {hasSelection ? `Download Selected (${selectedIds.size})` : 'Download All'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                  sx={{
                    color: 'text.secondary',
                    borderColor: '#e0e0e0',
                    borderRadius: 99,
                    px: 3,
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'transparent' },
                  }}
                >
                  Share
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to={`/s/${pack.share_code}`}
                  startIcon={<OpenInNewIcon />}
                  sx={{
                    color: 'text.secondary',
                    borderColor: '#e0e0e0',
                    borderRadius: 99,
                    px: 3,
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'transparent' },
                  }}
                >
                  Shared Page
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Beatmaps List */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Beatmaps
          </Typography>
          {hasSelection && (
            <Button
              size="small"
              onClick={() => setSelectedIds(new Set())}
              sx={{ color: '#64b5f6', textTransform: 'none', fontSize: 13 }}
            >
              Deselect All
            </Button>
          )}
        </Box>
        <Box sx={{ p: 1 }}>
          {displayMaps.map((beatmap) => {
            const isSelected = selectedIds.has(beatmap.id);
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
                onClick={() => toggleSelect(beatmap.id)}
                sx={isSelected ? {
                  backgroundColor: 'rgba(100,181,246,0.15)',
                  border: '1px solid rgba(100,181,246,0.4)',
                  '&:hover': { backgroundColor: 'rgba(100,181,246,0.22)' },
                } : undefined}
                actions={
                  <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                    <OsuButton onClick={() => handleOpenOsu(beatmap)} />
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
                        sourcePackId: pack.share_code,
                        sourcePackName: pack.name,
                      }}
                    />
                  </Stack>
                }
              />
            );
          })}
        </Box>

        {/* Pagination */}
        {pageCount > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #eee' }}>
            <Pagination
              count={pageCount}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <BackButton onClick={() => navigate(-1)} />

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
