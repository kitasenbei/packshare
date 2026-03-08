import { useState, useEffect } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Grid,
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
import PersonIcon from '@mui/icons-material/Person';
import { useSearchParams } from 'react-router-dom';
import { browsePacks, getUsers, type BrowsePacksResult, type UserInfo } from '../features/pack/api/packs';
import PackCard from '../features/pack/components/PackCard';

const PACKS_PER_PAGE = 12;

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterUserId = searchParams.get('user_id') ? Number(searchParams.get('user_id')) : undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BrowsePacksResult | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'recent' | 'popular' | 'views'>('recent');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState<UserInfo[]>([]);

  useEffect(() => {
    getUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const selectedUser = users.find((u) => u.id === filterUserId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    browsePacks(page, PACKS_PER_PAGE, sort, search, filterUserId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load packs');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [page, sort, search, filterUserId]);

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
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ExploreIcon sx={{ color: 'primary.main' }} />
        {selectedUser && (
          <Avatar
            src={selectedUser.avatar_url}
            alt={selectedUser.username}
            sx={{ width: 32, height: 32 }}
          />
        )}
        <Typography variant="h5" fontWeight="bold">
          {selectedUser ? `Packs by ${selectedUser.username}` : 'Explore'}
        </Typography>
        {data && (
          <Chip label={`${data.total} packs`} size="small" />
        )}
      </Box>

      {/* Search & Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
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
          <Autocomplete
            options={users}
            value={selectedUser}
            onChange={(_, user) => {
              if (user) {
                setSearchParams({ user_id: user.id.toString() });
              } else {
                setSearchParams({});
              }
              setPage(1);
            }}
            getOptionLabel={(option) => option.username}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={option.avatar_url} alt={option.username} sx={{ width: 24, height: 24 }} />
                <span>{option.username}</span>
                <Chip label={option.pack_count} size="small" sx={{ ml: 'auto' }} />
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Filter by user..."
                size="small"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
            sx={{ minWidth: 200 }}
            size="small"
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
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && data && data.packs.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
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
          <Grid container spacing={2.5}>
            {data.packs.map((pack) => (
              <Grid key={pack.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <PackCard pack={pack} variant="grid" />
              </Grid>
            ))}
          </Grid>

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
