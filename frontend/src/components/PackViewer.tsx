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
  Divider,
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
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
    <Box>
      {/* Banner collage */}
      <Paper sx={{ overflow: 'hidden', mb: 3, borderRadius: 2 }}>
        <PackBanner beatmaps={pack.beatmaps} />
      </Paper>

      {/* Header row: pack name + action buttons */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h4" fontWeight="bold">
          {pack.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{
              backgroundColor: hasSelection ? '#64b5f6' : 'primary.main',
              '&:hover': { backgroundColor: hasSelection ? '#42a5f5' : 'primary.dark' },
              borderRadius: 99,
              px: 2,
              textTransform: 'none',
            }}
          >
            {hasSelection ? `Download (${selectedIds.size})` : 'Download All'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShareIcon />}
            onClick={handleShare}
            sx={{
              color: 'text.secondary',
              borderColor: '#e0e0e0',
              borderRadius: 99,
              px: 2,
              textTransform: 'none',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'transparent' },
            }}
          >
            Share
          </Button>
          <Button
            variant="outlined"
            size="small"
            component={Link}
            to={`/s/${pack.share_code}`}
            startIcon={<OpenInNewIcon />}
            sx={{
              color: 'text.secondary',
              borderColor: '#e0e0e0',
              borderRadius: 99,
              px: 2,
              textTransform: 'none',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'transparent' },
            }}
          >
            Shared Page
          </Button>
        </Stack>
      </Box>

      {/* Two-column layout: beatmap list (left) + sidebar (right) */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: { xs: 'stretch', md: 'flex-start' }, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left column — Beatmap list */}
        <Paper sx={{ overflow: 'hidden', flex: 1, minWidth: 0, borderRadius: 2 }}>
          {/* Info bar */}
          <Box sx={{
            p: 1.5,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
          }}>
            <Typography variant="body2" fontWeight={600}>
              {pack.beatmaps.length} beatmaps
            </Typography>
            {hasSelection && (
              <Button
                size="small"
                onClick={() => setSelectedIds(new Set())}
                sx={{ color: '#64b5f6', textTransform: 'none', fontSize: 13, minWidth: 0, p: 0 }}
              >
                Deselect {selectedIds.size}
              </Button>
            )}
          </Box>

          {/* Beatmap rows */}
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

        {/* Right column — Sidebar */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          {/* About */}
          <Paper sx={{ borderRadius: 2, p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              About
            </Typography>
            {pack.description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {pack.description}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2, fontStyle: 'italic' }}>
                No description provided.
              </Typography>
            )}
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <MusicNoteIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  {pack.beatmaps.length} beatmaps
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <VisibilityIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  {pack.views.toLocaleString()} views
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  Created {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Creator */}
          <Paper sx={{ borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              Creator
            </Typography>
            <Box
              component={Link}
              to={pack.user ? `/explore?user_id=${pack.user.id}&username=${encodeURIComponent(pack.user.username)}` : '#'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 1,
                p: 0.5,
                m: -0.5,
                '&:hover': { backgroundColor: '#f5f5f5' },
              }}
            >
              {pack.user?.avatar_url && (
                <Box
                  component="img"
                  src={pack.user.avatar_url}
                  sx={{ width: 32, height: 32, borderRadius: '50%' }}
                />
              )}
              <Typography variant="body2" fontWeight={500}>
                {pack.user?.username || 'Unknown'}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>

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
