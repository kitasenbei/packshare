import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Stack,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  Pagination,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FolderIcon from '@mui/icons-material/Folder';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import type { User, BeatmapsetInfo } from '../api/auth';
import { getBeatmapset } from '../api/auth';
import { getMyPacks, trackDownload, deletePack, updatePack, type Pack, type PackBeatmap } from '../api/packs';
import PackCard from './PackCard';
import PackBanner from './PackBanner';
import BeatmapRow from './BeatmapRow';
import DownloadButton from './DownloadButton';
import OsuButton from './OsuButton';
import RemoveButton from './RemoveButton';
import { palette } from '../theme/palette';
import { TournamentsSection, type TournamentView } from './DashboardTournaments';
import type { Tournament } from '../api/tournaments';

type Section = 'overview' | 'packs' | 'tournaments' | 'settings';

interface DashboardProps {
  user: User | null;
  permissions?: string[];
  isKeySession?: boolean;
}

type PackCardPropsFactory = (pack: Pack) => React.ComponentProps<typeof PackCard>;

const SIDEBAR_WIDTH = 240;
const MAPS_PER_PAGE = 10;

export default function Dashboard({ user, permissions = [], isKeySession = false }: DashboardProps) {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [editing, setEditing] = useState(false);
  const [tournamentView, setTournamentView] = useState<TournamentView>('list');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    getMyPacks()
      .then(setPacks)
      .catch((err) => setError(err.message || 'Failed to load packs'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  const canCreate = !isKeySession || permissions.includes('create');
  const totalMaps = packs.reduce((sum, p) => sum + p.beatmaps.length, 0);
  const totalViews = packs.reduce((sum, p) => sum + p.views, 0);
  const totalDownloads = packs.reduce(
    (sum, p) => sum + p.beatmaps.reduce((s, b) => s + (b.downloads ?? 0), 0),
    0,
  );

  const handleSelectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setEditing(false);
  };

  const handleBackFromPack = () => {
    setSelectedPack(null);
    setEditing(false);
  };

  const handleDeletePack = async (pack: Pack) => {
    try {
      await deletePack(pack.share_code);
      setPacks((prev) => prev.filter((p) => p.id !== pack.id));
      setSelectedPack(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pack');
    }
  };

  const handlePackUpdated = (updated: Pack) => {
    setPacks((prev) => prev.map((p) => (p.share_code === updated.share_code ? updated : p)));
    setSelectedPack(updated);
    setEditing(false);
  };

  const navItems: { key: Section; label: string; icon: React.ReactNode; disabled?: boolean; badge?: string }[] = [
    { key: 'overview', label: 'Overview', icon: <HomeIcon /> },
    { key: 'packs', label: 'Packs', icon: <FolderIcon /> },
    { key: 'tournaments', label: 'Tournaments', icon: <EmojiEventsIcon /> },
    { key: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  const packCardProps = (pack: Pack): React.ComponentProps<typeof PackCard> => ({
    pack: {
      ...pack,
      user: pack.user ?? { username: user.username, avatar_url: user.avatar_url },
      beatmap_count: pack.beatmaps.length,
      beatmapset_ids: pack.beatmaps.map((b: Pack['beatmaps'][0]) => b.beatmapset_id),
    },
  });

  return (
    <Box sx={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 120px)', width: '100%' }}>
      {/* Sidebar */}
      <Paper
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          position: 'fixed',
          top: 80,
          bottom: 0,
          overflowY: 'auto',
        }}
      >
        {/* Profile header */}
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={user.avatar_url}
              sx={{ width: 40, height: 40, border: 2, borderColor: 'primary.main' }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight="bold" noWrap>
                {user.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {packs.length} pack{packs.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Navigation */}
        <List disablePadding sx={{ py: 0.5 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.key}
              selected={!selectedPack && section === item.key}
              disabled={item.disabled}
              onClick={() => { setSection(item.key); setSelectedPack(null); setEditing(false); if (item.key !== 'tournaments') { setTournamentView('list'); setSelectedTournament(null); } }}
              sx={{
                py: 1,
                px: 2,
                '&.Mui-selected': {
                  backgroundColor: `rgba(132,169,140,0.12)`,
                  borderRight: `3px solid ${palette.light}`,
                  '&:hover': { backgroundColor: `rgba(132,169,140,0.18)` },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: !selectedPack && section === item.key ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    variant: 'body2',
                    fontWeight: !selectedPack && section === item.key ? 600 : 400,
                  },
                }}
              />
              {item.badge && (
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    px: 0.75,
                    py: 0.15,
                    borderRadius: 0.5,
                    fontSize: 9,
                    fontWeight: 'bold',
                  }}
                >
                  {item.badge}
                </Typography>
              )}
            </ListItemButton>
          ))}
        </List>

        <Divider />

        {/* Quick actions */}
        <Box sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
            Actions
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {canCreate && (
              <Button
                component={Link}
                to="/create"
                size="small"
                startIcon={<AddIcon />}
                variant="contained"
                fullWidth
                sx={{ justifyContent: 'flex-start', px: 1.5 }}
              >
                New Pack
              </Button>
            )}
            <Button
              size="small"
              startIcon={<EmojiEventsIcon />}
              fullWidth
              onClick={() => { setSection('tournaments'); setSelectedPack(null); setEditing(false); setTournamentView('create'); setSelectedTournament(null); }}
              sx={{ justifyContent: 'flex-start', px: 1.5, textTransform: 'none' }}
            >
              New Tournament
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Content Panel */}
      <Box sx={{ flex: 1, minWidth: 0, ml: { xs: 0, md: `${SIDEBAR_WIDTH + 24}px` } }}>
        {/* Mobile profile header (hidden on desktop) */}
        {!selectedPack && tournamentView === 'list' && (
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar
              src={user.avatar_url}
              sx={{ width: 48, height: 48, border: 2, borderColor: 'primary.main' }}
            />
            <Box>
              <Typography variant="h6" fontWeight="bold">{user.username}</Typography>
              <Typography variant="caption" color="text.secondary">
                {packs.length} pack{packs.length !== 1 ? 's' : ''} · {totalMaps} maps
              </Typography>
            </Box>
          </Box>
        )}

        {/* Mobile nav tabs */}
        {!selectedPack && tournamentView === 'list' && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: 'flex', md: 'none' }, mb: 3, overflowX: 'auto' }}
          >
            {navItems.filter((i) => !i.disabled).map((item) => (
              <Button
                key={item.key}
                size="small"
                variant={section === item.key ? 'contained' : 'outlined'}
                onClick={() => setSection(item.key)}
                sx={{ flexShrink: 0, textTransform: 'none' }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        ) : selectedPack ? (
          editing ? (
            <PackEditSection
              pack={selectedPack}
              onBack={() => setEditing(false)}
              onSaved={handlePackUpdated}
            />
          ) : (
            <PackDetailSection
              pack={selectedPack}
              onBack={handleBackFromPack}
              onEdit={() => setEditing(true)}
              onDelete={() => handleDeletePack(selectedPack)}
            />
          )
        ) : (
          <>
            {section === 'overview' && (
              <OverviewSection
                packs={packs}
                totalMaps={totalMaps}
                totalViews={totalViews}
                totalDownloads={totalDownloads}
                canCreate={canCreate}
                packCardProps={packCardProps}
                onSelectPack={handleSelectPack}
              />
            )}
            {section === 'packs' && (
              <PacksSection
                packs={packs}
                canCreate={canCreate}
                packCardProps={packCardProps}
                onSelectPack={handleSelectPack}
              />
            )}
            {section === 'tournaments' && (
              <TournamentsSection
                user={user}
                view={tournamentView}
                selectedTournament={selectedTournament}
                onViewChange={setTournamentView}
                onSelectTournament={setSelectedTournament}
              />
            )}
            {section === 'settings' && (
              <SettingsSection user={user} packs={packs} />
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

/* ── Section Components ── */

function OverviewSection({
  packs,
  totalMaps,
  totalViews,
  totalDownloads,
  canCreate,
  packCardProps,
  onSelectPack,
}: {
  packs: Pack[];
  totalMaps: number;
  totalViews: number;
  totalDownloads: number;
  canCreate: boolean;
  packCardProps: PackCardPropsFactory;
  onSelectPack: (pack: Pack) => void;
}) {
  return (
    <>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Overview
      </Typography>

      {/* Stats row */}
      {packs.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {[
            { icon: <FolderIcon />, label: 'Packs', value: packs.length },
            { icon: <MusicNoteIcon />, label: 'Maps', value: totalMaps },
            { icon: <VisibilityIcon />, label: 'Views', value: totalViews },
            { icon: <DownloadIcon />, label: 'Downloads', value: totalDownloads },
          ].map((stat) => (
            <Paper
              key={stat.label}
              sx={{
                flex: 1,
                p: 2,
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ color: 'primary.main', mb: 0.5 }}>{stat.icon}</Box>
              <Typography variant="h6" fontWeight="bold">
                {stat.value.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Recent Packs */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
        Recent Packs
      </Typography>

      {packs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <FolderIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            You haven't created any packs yet
          </Typography>
          {canCreate && (
            <Button
              component={Link}
              to="/create"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Create your first pack
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={2}>
          {packs.slice(0, 3).map((pack) => (
            <Box
              key={pack.id}
              onClick={(e) => { e.preventDefault(); onSelectPack(pack); }}
              sx={{ cursor: 'pointer', '& a': { pointerEvents: 'none' } }}
            >
              <PackCard {...packCardProps(pack)} />
            </Box>
          ))}
        </Stack>
      )}
    </>
  );
}

function PacksSection({
  packs,
  canCreate,
  packCardProps,
  onSelectPack,
}: {
  packs: Pack[];
  canCreate: boolean;
  packCardProps: PackCardPropsFactory;
  onSelectPack: (pack: Pack) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'views' | 'maps'>('newest');

  const filtered = packs
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name': return a.name.localeCompare(b.name);
        case 'views': return b.views - a.views;
        case 'maps': return b.beatmaps.length - a.beatmaps.length;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          All Packs
        </Typography>
        {canCreate && (
          <Button
            component={Link}
            to="/create"
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
          >
            New Pack
          </Button>
        )}
      </Box>

      {packs.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search packs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Stack direction="row" spacing={0.5}>
            {([
              { key: 'newest', label: 'Newest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'name', label: 'A-Z' },
              { key: 'views', label: 'Views' },
              { key: 'maps', label: 'Maps' },
            ] as const).map((s) => (
              <Button
                key={s.key}
                size="small"
                variant={sortBy === s.key ? 'contained' : 'text'}
                onClick={() => setSortBy(s.key)}
                sx={{ minWidth: 0, px: 1.5, fontSize: 12, textTransform: 'none' }}
              >
                {s.label}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      {packs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <FolderIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No packs yet
          </Typography>
          {canCreate && (
            <Button
              component={Link}
              to="/create"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Create your first pack
            </Button>
          )}
        </Paper>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No packs match "{search}"
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filtered.map((pack) => (
            <Box
              key={pack.id}
              onClick={(e) => { e.preventDefault(); onSelectPack(pack); }}
              sx={{ cursor: 'pointer', '& a': { pointerEvents: 'none' } }}
            >
              <PackCard {...packCardProps(pack)} />
            </Box>
          ))}
        </Stack>
      )}
    </>
  );
}

/* ── Pack Detail (inline) ── */

function PackDetailSection({
  pack,
  onBack,
  onEdit,
  onDelete,
}: {
  pack: Pack;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pageCount = Math.ceil(pack.beatmaps.length / MAPS_PER_PAGE);
  const displayMaps = pack.beatmaps.slice(
    (currentPage - 1) * MAPS_PER_PAGE,
    currentPage * MAPS_PER_PAGE,
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
        trackDownload(pack.share_code, beatmap.beatmapset_id);
      }, index * 500);
    });
    setSelectedIds(new Set());
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/s/${pack.share_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: pack.name, text: `Check out this beatmap pack: ${pack.name}`, url: shareUrl });
        return;
      } catch { /* cancelled */ }
    }
    navigator.clipboard.writeText(shareUrl);
    setSnackbar({ open: true, message: 'Link copied to clipboard!' });
  };

  const totalDownloads = pack.beatmaps.reduce((s, b) => s + (b.downloads ?? 0), 0);

  return (
    <>
      {/* Back + title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1 }}>
          {pack.name}
        </Typography>
      </Box>

      {/* Banner */}
      <Paper sx={{ overflow: 'hidden', mb: 3, borderRadius: 2 }}>
        <PackBanner beatmaps={pack.beatmaps} />
      </Paper>

      {/* Action buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{ borderRadius: 99, px: 2, textTransform: 'none' }}
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
            borderColor: 'divider',
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
          target="_blank"
          startIcon={<OpenInNewIcon />}
          sx={{
            color: 'text.secondary',
            borderColor: 'divider',
            borderRadius: 99,
            px: 2,
            textTransform: 'none',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'transparent' },
          }}
        >
          Public Page
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          onClick={onEdit}
          sx={{
            color: 'text.secondary',
            borderColor: 'divider',
            borderRadius: 99,
            px: 2,
            textTransform: 'none',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'transparent' },
          }}
        >
          Edit
        </Button>
        {!confirmDelete ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => setConfirmDelete(true)}
            sx={{
              color: 'error.main',
              borderColor: 'divider',
              borderRadius: 99,
              px: 2,
              textTransform: 'none',
              '&:hover': { borderColor: 'error.main', backgroundColor: 'transparent' },
            }}
          >
            Delete
          </Button>
        ) : (
          <Button
            variant="contained"
            size="small"
            onClick={onDelete}
            sx={{
              borderRadius: 99,
              px: 2,
              textTransform: 'none',
              backgroundColor: 'error.main',
              '&:hover': { backgroundColor: 'error.dark' },
            }}
          >
            Confirm Delete
          </Button>
        )}
      </Stack>

      {/* Two-column: beatmap list + info sidebar */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: { xs: 'stretch', md: 'flex-start' }, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Beatmap list */}
        <Paper sx={{ overflow: 'hidden', flex: 1, minWidth: 0, borderRadius: 2 }}>
          {hasSelection && (
            <Box sx={{
              p: 1.5,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'action.hover',
            }}>
              <Button
                size="small"
                onClick={() => setSelectedIds(new Set())}
                sx={{ textTransform: 'none', fontSize: 13, minWidth: 0, p: 0 }}
              >
                Deselect {selectedIds.size}
              </Button>
            </Box>
          )}

          <Box sx={{ p: 1 }}>
            {displayMaps.map((beatmap) => {
              const isSelected = selectedIds.has(beatmap.id);
              return (
                <BeatmapRow
                  key={beatmap.id}
                  title={beatmap.title}
                  artist={beatmap.artist}
                  keys={beatmap.keys}
                  creator={beatmap.downloads ? `${beatmap.creator} · ${beatmap.downloads} download${beatmap.downloads !== 1 ? 's' : ''}` : beatmap.creator}
                  creatorPrefix="mapped by"
                  difficultyName={beatmap.difficulty_name}
                  starRating={beatmap.star_rating}
                  beatmapsetId={beatmap.beatmapset_id}
                  onClick={() => toggleSelect(beatmap.id)}
                  sx={isSelected ? {
                    backgroundColor: 'rgba(132,169,140,0.15)',
                    border: '1px solid rgba(132,169,140,0.4)',
                    '&:hover': { backgroundColor: 'rgba(132,169,140,0.22)' },
                  } : undefined}
                  actions={
                    <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                      <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank')} />
                      <DownloadButton
                        downloadUrl={`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`}
                        downloadName={`${beatmap.artist} - ${beatmap.title}`}
                        onDownloaded={() => trackDownload(pack.share_code, beatmap.beatmapset_id)}
                      />
                    </Stack>
                  }
                />
              );
            })}
          </Box>

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Pagination
                count={pageCount}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </Paper>

        {/* Info sidebar */}
        <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
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
                <VisibilityIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  {pack.views.toLocaleString()} views
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DownloadIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  {totalDownloads.toLocaleString()} downloads
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
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="success" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

/* ── Pack Edit (inline) ── */

function PackEditSection({
  pack,
  onBack,
  onSaved,
}: {
  pack: Pack;
  onBack: () => void;
  onSaved: (updated: Pack) => void;
}) {
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description || '');
  const [beatmaps, setBeatmaps] = useState<PackBeatmap[]>([...pack.beatmaps]);
  const [beatmapInput, setBeatmapInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingBeatmap, setAddingBeatmap] = useState(false);

  // Difficulty selection
  const [diffSelectOpen, setDiffSelectOpen] = useState(false);
  const [pendingBeatmapset, setPendingBeatmapset] = useState<BeatmapsetInfo | null>(null);

  const extractBeatmapId = (input: string): string | null => {
    if (/^\d+$/.test(input.trim())) return input.trim();
    const match = input.match(/osu\.ppy\.sh\/beatmapsets\/(\d+)/);
    if (match) return match[1];
    const nerinyanMatch = input.match(/nerinyan\.moe.*?(\d+)/);
    if (nerinyanMatch) return nerinyanMatch[1];
    return null;
  };

  const handleAddBeatmap = async () => {
    const id = extractBeatmapId(beatmapInput);
    if (!id) { setError('Invalid beatmap ID or URL'); return; }
    if (beatmaps.some((b) => b.beatmapset_id === parseInt(id))) { setError('Beatmap already in pack'); return; }

    setError('');
    setAddingBeatmap(true);
    try {
      const beatmapset = await getBeatmapset(parseInt(id));
      if (!beatmapset || beatmapset.beatmaps.length === 0) {
        setError('Beatmapset not found or has no mania difficulties');
        setAddingBeatmap(false);
        return;
      }

      if (beatmapset.beatmaps.length === 1) {
        const diff = beatmapset.beatmaps[0];
        setBeatmaps((prev) => [...prev, {
          id: diff.beatmap_id,
          beatmapset_id: beatmapset.beatmapset_id,
          title: beatmapset.title,
          artist: beatmapset.artist,
          creator: beatmapset.creator,
          keys: diff.keys,
          difficulty_name: diff.difficulty_name,
          star_rating: diff.star_rating,
          sort_order: prev.length,
        }]);
        setBeatmapInput('');
      } else {
        setPendingBeatmapset(beatmapset);
        setDiffSelectOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch beatmap info');
    }
    setAddingBeatmap(false);
  };

  const handleSelectDifficulty = (diffIndex: number | 'all') => {
    if (!pendingBeatmapset) return;
    if (diffIndex === 'all') {
      const newBeatmaps: PackBeatmap[] = pendingBeatmapset.beatmaps.map((diff, i) => ({
        id: diff.beatmap_id,
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        difficulty_name: diff.difficulty_name,
        star_rating: diff.star_rating,
        sort_order: beatmaps.length + i,
      }));
      setBeatmaps((prev) => [...prev, ...newBeatmaps]);
    } else {
      const diff = pendingBeatmapset.beatmaps[diffIndex];
      setBeatmaps((prev) => [...prev, {
        id: diff.beatmap_id,
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        difficulty_name: diff.difficulty_name,
        star_rating: diff.star_rating,
        sort_order: prev.length,
      }]);
    }
    setBeatmapInput('');
    setDiffSelectOpen(false);
    setPendingBeatmapset(null);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Pack name is required'); return; }
    if (beatmaps.length === 0) { setError('Pack must have at least one beatmap'); return; }

    setSaving(true);
    setError('');
    try {
      const updated = await updatePack(pack.share_code, {
        name: name.trim(),
        description: description.trim() || undefined,
        beatmaps: beatmaps.map((b) => ({
          beatmapset_id: b.beatmapset_id,
          title: b.title,
          artist: b.artist,
          creator: b.creator,
          keys: b.keys,
          difficulty_name: b.difficulty_name,
          star_rating: b.star_rating,
        })),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
    setSaving(false);
  };

  return (
    <>
      {/* Back + title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1 }}>
          Edit Pack
        </Typography>
      </Box>

      {/* Name & Description */}
      <Stack spacing={2.5} sx={{ mb: 3 }}>
        <TextField
          label="Pack Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Description (optional)"
          fullWidth
          multiline
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Stack>

      {/* Add beatmap */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
        Beatmaps
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          placeholder="Add beatmap (ID or osu! URL)"
          fullWidth
          size="small"
          value={beatmapInput}
          onChange={(e) => setBeatmapInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && beatmapInput.trim() && handleAddBeatmap()}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleAddBeatmap}
          disabled={!beatmapInput.trim() || addingBeatmap}
          sx={{ minWidth: 50 }}
        >
          {addingBeatmap ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <AddIcon />}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Beatmap list */}
      <Paper sx={{ overflow: 'hidden', borderRadius: 2, mb: 3 }}>
        <Box sx={{ p: 1 }}>
          {beatmaps.map((beatmap, index) => (
            <BeatmapRow
              key={beatmap.id}
              title={beatmap.title}
              artist={beatmap.artist}
              keys={beatmap.keys || undefined}
              creator={beatmap.creator}
              beatmapsetId={beatmap.beatmapset_id}
              difficultyName={beatmap.difficulty_name}
              starRating={beatmap.star_rating}
              titleOnly
              density="compact"
              actions={
                <Stack direction="row" spacing={0} alignItems="center">
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() => setBeatmaps((prev) => {
                      const next = [...prev];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })}
                    sx={{ p: 0.25 }}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === beatmaps.length - 1}
                    onClick={() => setBeatmaps((prev) => {
                      const next = [...prev];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      return next;
                    })}
                    sx={{ p: 0.25 }}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  </IconButton>
                  <RemoveButton onClick={() => setBeatmaps((prev) => prev.filter((b) => b.id !== beatmap.id))} />
                </Stack>
              }
            />
          ))}
          {beatmaps.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">
                No beatmaps — add some above
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Save / Cancel */}
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : undefined}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outlined" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
      </Stack>

      {/* Difficulty Selection Dialog */}
      <Dialog
        open={diffSelectOpen}
        onClose={() => { setDiffSelectOpen(false); setPendingBeatmapset(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select Difficulty</DialogTitle>
        <DialogContent dividers>
          {pendingBeatmapset && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {pendingBeatmapset.artist} - {pendingBeatmapset.title}
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => handleSelectDifficulty('all')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                Add all {pendingBeatmapset.beatmaps.length} difficulties
              </Button>
              <Divider sx={{ my: 1 }}>or select one</Divider>
              {pendingBeatmapset.beatmaps.map((diff, index) => (
                <Button
                  key={diff.beatmap_id}
                  variant="outlined"
                  fullWidth
                  onClick={() => handleSelectDifficulty(index)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 22,
                      backgroundColor: 'primary.main',
                      borderRadius: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 'bold',
                      mr: 1.5,
                    }}
                  >
                    {diff.keys}K
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'left' }}>
                    <Typography variant="body2">{diff.difficulty_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ★ {diff.star_rating.toFixed(2)}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDiffSelectOpen(false); setPendingBeatmapset(null); }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/* ── Settings Section ── */

function SettingsSection({ user, packs }: { user: User; packs: Pack[] }) {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const handleExportPacks = () => {
    const exportData = packs.map((p) => ({
      name: p.name,
      description: p.description,
      share_code: p.share_code,
      beatmaps: p.beatmaps.map((b) => ({
        beatmapset_id: b.beatmapset_id,
        title: b.title,
        artist: b.artist,
        creator: b.creator,
        keys: b.keys,
        difficulty_name: b.difficulty_name,
        star_rating: b.star_rating,
      })),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packshare-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Packs exported!' });
  };

  const handleExportCsv = () => {
    const rows = [['Pack Name', 'Beatmapset ID', 'Title', 'Artist', 'Creator', 'Keys', 'Difficulty', 'Star Rating']];
    for (const p of packs) {
      for (const b of p.beatmaps) {
        rows.push([p.name, String(b.beatmapset_id), b.title, b.artist, b.creator, String(b.keys || ''), b.difficulty_name || '', String(b.star_rating || '')]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packshare-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'CSV exported!' });
  };

  const totalMaps = packs.reduce((sum, p) => sum + p.beatmaps.length, 0);
  const totalViews = packs.reduce((sum, p) => sum + p.views, 0);
  const totalDownloads = packs.reduce((sum, p) => sum + p.beatmaps.reduce((s, b) => s + (b.downloads ?? 0), 0), 0);

  // Unique beatmapset IDs across all packs
  const uniqueBeatmapsets = new Set(packs.flatMap((p) => p.beatmaps.map((b) => b.beatmapset_id)));

  return (
    <>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
        Settings
      </Typography>

      {/* Account Info */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
          Account
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar src={user.avatar_url} sx={{ width: 56, height: 56, border: 2, borderColor: 'primary.main' }} />
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">{user.username}</Typography>
            <Typography variant="body2" color="text.secondary">osu! ID: {user.osu_id}</Typography>
          </Box>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.open(`https://osu.ppy.sh/users/${user.osu_id}`, '_blank')}
          startIcon={<OpenInNewIcon />}
          sx={{ textTransform: 'none', borderRadius: 99, borderColor: 'divider', color: 'text.secondary' }}
        >
          View osu! Profile
        </Button>
      </Paper>

      {/* Stats Overview */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
          Statistics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
          {[
            { label: 'Packs', value: packs.length },
            { label: 'Total Maps', value: totalMaps },
            { label: 'Unique Maps', value: uniqueBeatmapsets.size },
            { label: 'Total Views', value: totalViews },
            { label: 'Total Downloads', value: totalDownloads },
            { label: 'Avg Maps/Pack', value: packs.length > 0 ? (totalMaps / packs.length).toFixed(1) : '0' },
          ].map((stat) => (
            <Box key={stat.label} sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, backgroundColor: 'action.hover' }}>
              <Typography variant="h6" fontWeight="bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Export */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Export Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Download all your pack data for backup or analysis
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportPacks}
            disabled={packs.length === 0}
            sx={{ textTransform: 'none' }}
          >
            Export JSON
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={packs.length === 0}
            sx={{ textTransform: 'none' }}
          >
            Export CSV
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="success" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
