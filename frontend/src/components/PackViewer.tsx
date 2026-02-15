import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Pagination,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getPack, type Pack } from '../api/packs';
import BeatmapRow from './BeatmapRow';
import DownloadButton from './DownloadButton';
import OsuButton from './OsuButton';

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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          Back
        </Button>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Pack not found</Typography>
          <Typography color="text.secondary">{error || 'This pack may have been deleted or the link is invalid.'}</Typography>
        </Paper>
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${pack.share_code}`);
    setSnackbar({ open: true, message: 'Link copied to clipboard!' });
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
      } catch {
        // User cancelled or share failed, fall back to copy
        navigator.clipboard.writeText(shareUrl);
        setSnackbar({ open: true, message: 'Link copied to clipboard!' });
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setSnackbar({ open: true, message: 'Link copied to clipboard!' });
    }
  };

  return (
    <Box sx={{}}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        Back
      </Button>

      {/* Header Card */}
      <Paper elevation={2} sx={{ overflow: 'hidden', mb: 3 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            p: 3,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                {pack.name}
              </Typography>
              {pack.description && (
                <Typography sx={{ opacity: 0.8, mb: 2, maxWidth: 600 }}>
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
                  <Typography variant="body2">{pack.user?.username || 'Unknown'}</Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.6 }}>
                  {pack.beatmaps.length} maps
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6 }}>
                  {pack.views.toLocaleString()} views
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6 }}>
                  {new Date(pack.created_at).toLocaleDateString()}
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
                    px: 3,
                  }}
                >
                  {hasSelection ? `Download Selected (${selectedIds.size})` : 'Download All'}
                </Button>
                <Tooltip title="Copy share link">
                  <IconButton
                    onClick={handleCopyLink}
                    sx={{
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share">
                  <IconButton
                    onClick={handleShare}
                    sx={{
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Beatmaps List */}
      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
