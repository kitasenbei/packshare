import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Compass } from 'lucide-react';
import { browsePacks, getUsers, type BrowsePacksResult, type UserInfo } from '../features/pack/api/packs';
import PackCard from '../features/pack/components/PackCard';
import SearchField from '../shared/components/SearchField';
import UserFilter from '../shared/components/UserFilter';
import SortButtons from '../shared/components/SortButtons';

const PACKS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { key: 'recent', label: 'Recent' },
  { key: 'popular', label: 'Popular' },
  { key: 'views', label: 'Most Viewed' },
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

  // Build page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (pageCount <= 7) {
      for (let i = 1; i <= pageCount; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < pageCount - 2) pages.push('ellipsis');
      pages.push(pageCount);
    }
    return pages;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Compass className="size-6 text-primary" />
        {selectedUser && (
          <Avatar size="sm">
            <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.username} />
            <AvatarFallback>{selectedUser.username[0]}</AvatarFallback>
          </Avatar>
        )}
        <h2 className="text-xl font-bold">
          {selectedUser ? `Packs by ${selectedUser.username}` : 'Explore'}
        </h2>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <SortButtons
          value={sort}
          onChange={(v) => { setSort(v as typeof sort); setPage(1); }}
          options={SORT_OPTIONS}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner className="size-6 text-primary" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && data && data.packs.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Compass className="size-16 text-muted-foreground/30" />
            </EmptyMedia>
            <EmptyTitle>
              {search ? 'No packs found' : 'No packs yet'}
            </EmptyTitle>
            <EmptyDescription>
              {search ? 'Try a different search term' : 'Be the first to create a pack!'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!loading && !error && data && data.packs.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} variant="grid" />
            ))}
          </div>

          {pageCount > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {getPageNumbers().map((p, i) =>
                  p === 'ellipsis' ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(pageCount, page + 1))}
                    className={page >= pageCount ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
