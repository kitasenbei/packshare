import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Stack,
  Chip,
  Alert,
  Popover,
} from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ExploreIcon from '@mui/icons-material/Explore';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderIcon from '@mui/icons-material/Folder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { User } from '../api/auth';
import { getLoginUrl } from '../api/auth';
import { getMyPacks, browsePacks, type Pack, type BrowsePacksResult } from '../api/packs';
import PackCard from './PackCard';

interface HomeProps {
  user?: User | null;
}

export default function Home({ user }: HomeProps) {
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

  const [statsAnchor, setStatsAnchor] = useState<HTMLElement | null>(null);

  const totalPacks = recentPacks?.total ?? 0;
  const myPackCount = myPacks.length;
  const myTotalMaps = myPacks.reduce((sum, p) => sum + p.beatmaps.length, 0);
  const myTotalViews = myPacks.reduce((sum, p) => sum + p.views, 0);

  return (
    <Box>
      {/* Header */}
      {user ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={user.avatar_url}
                sx={{ width: 48, height: 48, border: 3, borderColor: 'primary.main' }}
              />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Welcome back, {user.username}
                </Typography>
                <Button
                  size="small"
                  onClick={(e) => setStatsAnchor(e.currentTarget)}
                  sx={{ color: 'text.secondary', textTransform: 'none', p: 0, minWidth: 0, fontSize: 13, '&:hover': { color: 'primary.main', backgroundColor: 'transparent' } }}
                >
                  See stats
                </Button>
                <Popover
                  open={!!statsAnchor}
                  anchorEl={statsAnchor}
                  onClose={() => setStatsAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{ paper: { sx: { p: 2, mt: 1, minWidth: 200 } } }}
                >
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FolderIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2"><strong>{myPackCount}</strong> Packs</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <MusicNoteIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2"><strong>{myTotalMaps}</strong> Maps</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <VisibilityIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2"><strong>{myTotalViews.toLocaleString()}</strong> Views</Typography>
                    </Box>
                  </Stack>
                </Popover>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                component={Link}
                to="/create"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
              >
                New Pack
              </Button>
              <Button
                component={Link}
                to="/my-packs"
                variant="outlined"
                startIcon={<FolderIcon />}
                sx={{ borderColor: 'primary.main', color: 'primary.main', '&:hover': { borderColor: 'primary.dark' } }}
              >
                My Packs
              </Button>
            </Stack>
          </Box>
        </>
      ) : (
        <Paper
          sx={{
            p: 4,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5, color: 'text.primary' }}>
                pack
                <Box
                  component="span"
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.5,
                    ml: 0.75,
                    fontSize: '0.8em',
                  }}
                >
                  share
                </Box>
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Create, share, and discover osu! mania beatmap packs
              </Typography>
              {totalPacks > 0 && (
                <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                  {totalPacks} packs shared by the community
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                href={getLoginUrl()}
                startIcon={
                  <Box
                    component="img"
                    src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
                    sx={{ width: 18, height: 18 }}
                  />
                }
                sx={{
                  backgroundColor: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.dark' },
                  px: 3,
                }}
              >
                Sign in with osu!
              </Button>
              <Button
                component={Link}
                to="/explore"
                variant="outlined"
                sx={{
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                Browse Packs
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {!loading && (
        <>
          {/* Popular Packs */}
          {popularPacks && popularPacks.packs.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Popular
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {popularPacks.packs.map((pack, i) => (
                  <Paper
                    key={pack.id}
                    component={Link}
                    to={`/pack/${pack.share_code}`}
                    sx={{
                      flex: 1,
                      textDecoration: 'none',
                      color: 'inherit',
                      overflow: 'hidden',
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: 2 },
                    }}
                  >
                    {/* Cover strip from first few beatmapsets */}
                    <Box sx={{ height: 72, position: 'relative', overflow: 'hidden', backgroundColor: 'action.hover', display: 'flex' }}>
                      {pack.beatmapset_ids?.slice(0, 5).map((id) => (
                        <Box
                          key={id}
                          component="img"
                          src={`https://assets.ppy.sh/beatmaps/${id}/covers/cover.jpg`}
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.7,
                          }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ))}
                      <Chip
                        label={`#${i + 1}`}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 11,
                          height: 22,
                        }}
                      />
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body1" fontWeight="bold" noWrap>
                        {pack.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar src={pack.user.avatar_url} sx={{ width: 20, height: 20 }} />
                        <Typography variant="caption" color="text.secondary">
                          {pack.user.username}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VisibilityIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {pack.views.toLocaleString()} views
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MusicNoteIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {pack.beatmap_count} beatmaps
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {/* Recent Packs Feed */}
          {recentPacks && recentPacks.packs.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ExploreIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Recent
                  </Typography>
                </Box>
                <Button
                  component={Link}
                  to="/explore"
                  size="small"
                  sx={{ color: 'primary.main' }}
                >
                  View All
                </Button>
              </Box>
              <Grid container spacing={2}>
                {recentPacks.packs.map((pack) => (
                  <Grid key={pack.id} size={{ xs: 12, sm: 6 }}>
                    <PackCard pack={pack} compact />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Empty state */}
          {(!recentPacks || recentPacks.packs.length === 0) && (!popularPacks || popularPacks.packs.length === 0) && (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <ExploreIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No packs yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Be the first to create a pack!
              </Typography>
              <Button
                component={Link}
                to="/create"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
              >
                Create Pack
              </Button>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
