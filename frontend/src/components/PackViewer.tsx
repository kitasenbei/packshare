import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Pagination,
  Stack,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getPack, type Pack } from '../api/packs';

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
      <Box sx={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#ff66ab' }} />
      </Box>
    );
  }

  if (error || !pack) {
    return (
      <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
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

  const handleDownloadAll = () => {
    pack.beatmaps.forEach((beatmap) => {
      window.open(`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`, '_blank');
    });
  };

  const handleDownloadSingle = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`, '_blank');
  };

  const handleOpenOsu = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${pack.share_code}`);
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
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
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
                  onClick={handleDownloadAll}
                  sx={{
                    backgroundColor: '#ff66ab',
                    '&:hover': { backgroundColor: '#ff4499' },
                    px: 3,
                  }}
                >
                  Download All
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
        <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Beatmaps
          </Typography>
        </Box>
        <Box>
          {displayMaps.map((beatmap, index) => (
            <Box key={beatmap.id}>
              {index > 0 && <Divider />}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  gap: 2,
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' },
                }}
              >
                {/* Key count badge */}
                {beatmap.keys && (
                  <Box
                    sx={{
                      width: 44,
                      height: 32,
                      backgroundColor: '#ff66ab',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {beatmap.keys}K
                  </Box>
                )}

                {/* Map info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight="medium" noWrap>
                    {beatmap.artist} - {beatmap.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    mapped by {beatmap.creator}
                    {beatmap.star_rating && ` · ${beatmap.star_rating.toFixed(2)}*`}
                  </Typography>
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Open on osu!">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenOsu(beatmap)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadSingle(beatmap)}
                      sx={{ color: '#4caf50' }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </Box>
          ))}
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
    </Box>
  );
}
