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
  Chip,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import SearchIcon from '@mui/icons-material/Search';
import { browsePacks, type BrowsePacksResult } from '../api/packs';
import PackCard from './PackCard';

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
              <PackCard key={pack.id} pack={pack} />
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
