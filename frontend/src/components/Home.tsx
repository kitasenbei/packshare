import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Stack,
  Chip,
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

  useEffect(() => {
    let cancelled = false;
    const fetches: Promise<unknown>[] = [
      browsePacks(1, 6, 'recent').catch(() => null),
      browsePacks(1, 3, 'popular').catch(() => null),
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
    });
    return () => { cancelled = true; };
  }, [user]);

  const totalPacks = recentPacks?.total ?? 0;
  const myPackCount = myPacks.length;
  const myTotalMaps = myPacks.reduce((sum, p) => sum + p.beatmaps.length, 0);
  const myTotalViews = myPacks.reduce((sum, p) => sum + p.views, 0);

  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      {user ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={user.avatar_url}
              sx={{ width: 48, height: 48, border: '3px solid #ff66ab' }}
            />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Welcome back, {user.username}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {myPackCount} packs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {myTotalMaps} maps
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {myTotalViews.toLocaleString()} views
                </Typography>
              </Stack>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              component={Link}
              to="/create"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
            >
              New Pack
            </Button>
            <Button
              component={Link}
              to="/my-packs"
              variant="outlined"
              startIcon={<FolderIcon />}
              sx={{ borderColor: '#ff66ab', color: '#ff66ab', '&:hover': { borderColor: '#ff4499' } }}
            >
              My Packs
            </Button>
          </Stack>
        </Box>
      ) : (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 3,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b3d 100%)',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                pack
                <Box
                  component="span"
                  sx={{
                    backgroundColor: '#ff66ab',
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
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Create, share, and discover osu! mania beatmap packs
              </Typography>
              {totalPacks > 0 && (
                <Typography variant="body2" sx={{ opacity: 0.5, mt: 0.5 }}>
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
                  backgroundColor: '#ff66ab',
                  '&:hover': { backgroundColor: '#ff4499' },
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
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  '&:hover': { borderColor: '#ff66ab' },
                }}
              >
                Browse Packs
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#ff66ab' }} />
        </Box>
      )}

      {!loading && (
        <>
          {/* Popular Packs */}
          {popularPacks && popularPacks.packs.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <TrendingUpIcon sx={{ color: '#ff66ab', fontSize: 20 }} />
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
                    elevation={2}
                    sx={{
                      flex: 1,
                      textDecoration: 'none',
                      color: 'inherit',
                      overflow: 'hidden',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    }}
                  >
                    {/* Cover strip from first few beatmapsets */}
                    <Box sx={{ height: 48, position: 'relative', overflow: 'hidden', backgroundColor: '#1a1a2e', display: 'flex' }}>
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
                            {pack.views.toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MusicNoteIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {pack.beatmap_count}
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
                  <ExploreIcon sx={{ color: '#ff66ab', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Recent
                  </Typography>
                </Box>
                <Button
                  component={Link}
                  to="/explore"
                  size="small"
                  sx={{ color: '#ff66ab' }}
                >
                  View All
                </Button>
              </Box>
              <Stack spacing={1.5}>
                {recentPacks.packs.map((pack) => (
                  <PackCard key={pack.id} pack={pack} compact />
                ))}
              </Stack>
            </Box>
          )}

          {/* Empty state */}
          {(!recentPacks || recentPacks.packs.length === 0) && (!popularPacks || popularPacks.packs.length === 0) && (
            <Paper sx={{ p: 6, textAlign: 'center' }} elevation={2}>
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
                sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
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
