import { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Grid,
  Card,
  Typography,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
} from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import { useSearchParams } from 'react-router-dom';
import { browsePacks, getUsers, type BrowsePacksResult, type UserInfo } from '../features/pack/api/packs';
import PackCard from '../features/pack/components/PackCard';
import SearchField from '../shared/components/SearchField';
import UserFilter from '../shared/components/UserFilter';
import SortToggle from '../shared/components/SortToggle';

const PACKS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  { value: 'popular', label: 'Popular' },
  { value: 'views', label: 'Most Viewed' },
];

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
      </Box>

      {/* Search & Filters */}
      <Card sx={{ p: 2, mb: 3, backgroundColor: 'action.hover' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search packs..."
          />
          <UserFilter
            users={users}
            value={selectedUser}
            onChange={(user) => {
              if (user) {
                setSearchParams({ user_id: user.id.toString() });
              } else {
                setSearchParams({});
              }
              setPage(1);
            }}
          />
          <SortToggle
            value={sort}
            onChange={(v) => { setSort(v as 'recent' | 'popular' | 'views'); setPage(1); }}
            options={SORT_OPTIONS}
          />
        </Stack>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && data && data.packs.length === 0 && (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <ExploreIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {search ? 'No packs found' : 'No packs yet'}
          </Typography>
          <Typography color="text.secondary">
            {search ? 'Try a different search term' : 'Be the first to create a pack!'}
          </Typography>
        </Card>
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
