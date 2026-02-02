import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Pagination,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  Chip,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Link } from 'react-router-dom';
import ExploreIcon from '@mui/icons-material/Explore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';
import { browsePacks, type BrowsePacksResult } from '../api/packs';

const PACKS_PER_PAGE = 12;

export default function Explore() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BrowsePacksResult | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'recent' | 'popular' | 'views'>('recent');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchPacks = useCallback(() => {
    setLoading(true);
    setError(null);
    browsePacks(page, PACKS_PER_PAGE, sort, search)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load packs');
        setLoading(false);
      });
  }, [page, sort, search]);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  const handleSortChange = (_: React.MouseEvent<HTMLElement>, newSort: 'recent' | 'popular' | 'views' | null) => {
    if (newSort) {
      setSort(newSort);
      setPage(1);
    }
  };

  const pageCount = data ? Math.ceil(data.total / PACKS_PER_PAGE) : 0;

  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ExploreIcon sx={{ color: '#ff66ab' }} />
        <Typography variant="h5" fontWeight="bold">
          Explore
        </Typography>
        {data && (
          <Chip label={`${data.total} packs`} size="small" />
        )}
      </Box>

      {/* Search & Filters */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            placeholder="Search packs..."
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <ToggleButtonGroup
            value={sort}
            exclusive
            onChange={handleSortChange}
            size="small"
          >
            <ToggleButton value="recent">Recent</ToggleButton>
            <ToggleButton value="popular">Popular</ToggleButton>
            <ToggleButton value="views">Most Viewed</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#ff66ab' }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && data && data.packs.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }} elevation={2}>
          <ExploreIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {search ? 'No packs found' : 'No packs yet'}
          </Typography>
          <Typography color="text.secondary">
            {search ? 'Try a different search term' : 'Be the first to create a pack!'}
          </Typography>
        </Paper>
      )}

      {!loading && !error && data && data.packs.length > 0 && (
        <>
          <Stack spacing={2}>
            {data.packs.map((pack) => (
              <Paper
                key={pack.id}
                component={Link}
                to={`/pack/${pack.share_code}`}
                elevation={2}
                sx={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                  }}
                >
                  <Avatar
                    src={pack.user.avatar_url}
                    sx={{ width: 48, height: 48 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {pack.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        by {pack.user.username}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MusicNoteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {pack.beatmap_count} maps
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <VisibilityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {pack.views.toLocaleString()}
                        </Typography>
                      </Box>
                      {/* Stacked thumbnails */}
                      {pack.beatmapset_ids && pack.beatmapset_ids.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          <Box sx={{ display: 'flex', position: 'relative', height: 24 }}>
                            {pack.beatmapset_ids.slice(0, 10).map((id, idx) => (
                              <Box
                                key={id}
                                component="img"
                                src={`https://assets.ppy.sh/beatmaps/${id}/covers/list.jpg`}
                                sx={{
                                  width: 32,
                                  height: 24,
                                  borderRadius: 0.5,
                                  objectFit: 'cover',
                                  position: 'absolute',
                                  left: idx * 14,
                                  border: '1px solid #fff',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ))}
                          </Box>
                          {pack.beatmapset_ids.length > 10 && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: `${10 * 14 + 36}px`, fontWeight: 500 }}
                            >
                              ...
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                    {pack.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pack.description}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {new Date(pack.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Stack>

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
