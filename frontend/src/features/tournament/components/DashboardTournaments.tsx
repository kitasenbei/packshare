import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Snackbar,
  Divider,
  Avatar,
  Tooltip,
  Breadcrumbs,
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  ButtonGroup,
} from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StarIcon from '@mui/icons-material/Star';
import BoltIcon from '@mui/icons-material/Bolt';
import DiamondIcon from '@mui/icons-material/Diamond';
import GroupIcon from '@mui/icons-material/Group';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PaletteIcon from '@mui/icons-material/Palette';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import BarChartIcon from '@mui/icons-material/BarChart';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import CodeIcon from '@mui/icons-material/Code';
import DnsIcon from '@mui/icons-material/Dns';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import SettingsIcon from '@mui/icons-material/Settings';
import type { User, BeatmapsetInfo } from '../../auth/api/auth';
import { getBeatmapset } from '../../auth/api/auth';
import {
  listTournaments,
  createTournament,
  getTournament,
  updateTournament,
  deleteTournament,
  addMapToStage,
  removeMap,
  type Tournament,
  type TournamentMap,
  type CreateTournamentInput,
} from '../api/tournaments';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import RemoveButton from '../../../shared/components/RemoveButton';
import ImageUpload from '../../../shared/components/ImageUpload';
import TournamentBracket from './TournamentBracket';
import TournamentStatus, { statusColors } from './TournamentStatus';

// ── Constants ──

const slotColors: Record<string, string> = {
  RC: '#4a90d9', LN: '#4ad98f', HB: '#b44ad9', TECH: '#f5c842',
  JACK: '#d94a4a', SPEED: '#4ad9d9', STAM: '#d9a44a', SV: '#ff66ab', TB: '#ff4444',
};

const slotLabels: Record<string, string> = {
  RC: 'Rice', LN: 'Long Notes', HB: 'Hybrid', TECH: 'Technical',
  JACK: 'Jack', SPEED: 'Speed', STAM: 'Stamina', SV: 'Slider Velocity', TB: 'Tiebreaker',
};

const modColors: Record<string, string> = {
  NM: '#666666', HD: '#f5c842', HR: '#d94a4a', DT: '#b44ad9', FM: '#4ad98f', FL: '#1a1a3e',
};

const modIcons: Record<string, string> = {
  NM: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-no-mod.svg',
  HD: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-hidden.svg',
  HR: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-hard-rock.svg',
  DT: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-double-time.svg',
  FL: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-flashlight.svg',
};

const SLOTS = ['RC', 'LN', 'HB', 'TECH', 'JACK', 'SPEED', 'STAM', 'SV', 'TB'];
const MODS = ['NM', 'HD', 'HR', 'DT', 'FM', 'FL'];
const FORMATS = ['1v1', '2v2', '3v3', '4v4'];

const DEFAULT_STAGES = [
  'Qualifiers', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals',
];


// ── Exports ──

export type TournamentView = 'list' | 'create' | 'detail';

interface TournamentsSectionProps {
  user: User;
  view: TournamentView;
  selectedTournament: Tournament | null;
  onViewChange: (view: TournamentView) => void;
  onSelectTournament: (t: Tournament | null) => void;
}

export function TournamentsSection({
  user,
  view,
  selectedTournament,
  onViewChange,
  onSelectTournament,
}: TournamentsSectionProps) {
  switch (view) {
    case 'create':
      return (
        <TournamentCreateSection
          onBack={() => onViewChange('list')}
          onCreated={(t) => { onSelectTournament(t); onViewChange('detail'); }}
        />
      );
    case 'detail':
      return selectedTournament ? (
        <TournamentDetailSection
          tournament={selectedTournament}
          user={user}
          onBack={() => { onSelectTournament(null); onViewChange('list'); }}
          onUpdated={onSelectTournament}
          onDeleted={() => { onSelectTournament(null); onViewChange('list'); }}
        />
      ) : null;
    default:
      return (
        <TournamentListSection
          user={user}
          onCreate={() => onViewChange('create')}
          onSelect={(t) => { onSelectTournament(t); onViewChange('detail'); }}
        />
      );
  }
}

// ── List ──

function TournamentListSection({
  user,
  onCreate,
  onSelect,
}: {
  user: User;
  onCreate: () => void;
  onSelect: (t: Tournament) => void;
}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listTournaments()
      .then((all) => {
        // Show only user's tournaments
        setTournaments(all.filter((t) => t.user?.osu_id === user.osu_id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.osu_id]);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          Tournaments
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onCreate}>
          New Tournament
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : tournaments.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 6 }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'action.hover' }}>
            <EmojiEventsIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
          </Avatar>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            No tournaments yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
            Create a tournament to manage mappools, set up brackets, and share everything with your players
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} size="large"
            sx={{ fontWeight: 'bold' }}>
            Create your first tournament
          </Button>
        </Card>
      ) : (
        <Stack spacing={2}>
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} onClick={() => onSelect(t)} />
          ))}
        </Stack>
      )}
    </>
  );
}

function TournamentCard({ tournament, onClick }: { tournament: Tournament; onClick: () => void }) {
  const totalMaps = tournament.stages?.reduce((sum, s) => sum + (s.maps?.length ?? 0), 0) ?? 0;
  const stageCount = tournament.stages?.length ?? 0;

  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': { borderColor: 'primary.main', boxShadow: 3, transform: 'translateY(-1px)' },
      }}
    >
      {/* Banner or colored header strip */}
      {tournament.banner_url ? (
        <Box sx={{ height: 90, position: 'relative', overflow: 'hidden' }}>
          <Box
            component="img"
            src={tournament.banner_url}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
          }} />
          {/* Status pill on banner */}
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: 'white !important' }} />}
            label={tournament.status}
            size="small"
            sx={{
              position: 'absolute', top: 8, right: 8,
              height: 22, fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize',
              backgroundColor: `${statusColors[tournament.status]}dd`,
              color: 'white',
              backdropFilter: 'blur(4px)',
            }}
          />
        </Box>
      ) : (
        <Box sx={{
          height: 6,
          background: `linear-gradient(90deg, ${statusColors[tournament.status]}, ${statusColors[tournament.status]}44)`,
        }} />
      )}

      <CardHeader
        avatar={
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <FiberManualRecordIcon sx={{
                fontSize: 10,
                color: statusColors[tournament.status],
                filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.4))',
              }} />
            }
          >
            <Avatar
              src={tournament.logo_url || undefined}
              variant="rounded"
              sx={{ width: 44, height: 44, border: '2px solid', borderColor: 'divider' }}
            >
              <EmojiEventsIcon sx={{ fontSize: 20 }} />
            </Avatar>
          </Badge>
        }
        title={tournament.name}
        subheader={
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
            <Chip label={tournament.format} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, borderColor: 'divider' }} />
            <Chip label={`${stageCount} stages`} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, borderColor: 'divider' }} />
            <Chip label={`${totalMaps} maps`} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, borderColor: 'divider' }} />
            {!tournament.banner_url && (
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: '6px !important', color: `${statusColors[tournament.status]} !important` }} />}
                label={tournament.status}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: 10, textTransform: 'capitalize', borderColor: 'divider' }}
              />
            )}
          </Stack>
        }
        slotProps={{
          title: { variant: 'subtitle1', fontWeight: 'bold', noWrap: true },
        }}
        action={
          <Tooltip title="Open">
            <IconButton size="small" sx={{ mt: 0.5 }}>
              <OpenInNewIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            </IconButton>
          </Tooltip>
        }
      />
    </Card>
  );
}

// ── Create ──

function TournamentCreateSection({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (t: Tournament) => void;
}) {
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [format, setFormat] = useState('1v1');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [stages, setStages] = useState<string[]>([...DEFAULT_STAGES]);
  const [newStageName, setNewStageName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddStage = () => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    if (stages.length >= 20) { setError('Maximum 20 stages'); return; }
    setStages((prev) => [...prev, trimmed]);
    setNewStageName('');
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Tournament name is required'); return; }
    if (!abbreviation.trim()) { setError('Abbreviation is required'); return; }
    if (stages.length === 0) { setError('At least one stage is required'); return; }

    setSaving(true);
    setError('');
    try {
      const input: CreateTournamentInput = {
        name: name.trim(),
        abbreviation: abbreviation.trim().toLowerCase(),
        format,
        banner_url: bannerUrl || undefined,
        logo_url: logoUrl || undefined,
        stages: stages.map((s) => ({ name: s })),
      };
      const created = await createTournament(input);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    }
    setSaving(false);
  };

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 14 }} />} sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={onBack}
        >
          Tournaments
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          Create
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left: Form */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={2.5}>
            {/* Basic Info Card */}
            <Card variant="outlined">
              <CardHeader
                avatar={<Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}><EmojiEventsIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></Avatar>}
                title="Basic Information"
                slotProps={{ title: { variant: 'subtitle2', fontWeight: 'bold' } }}
                sx={{ pb: 0 }}
              />
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label="Tournament Name"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. osu!mania World Cup 2025"
                  />
                  <TextField
                    label="Abbreviation"
                    fullWidth
                    value={abbreviation}
                    onChange={(e) => setAbbreviation(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                    placeholder="e.g. MWC-2025"
                    helperText={abbreviation ? `URL: /t/${abbreviation.toLowerCase()}` : 'Used in the tournament URL'}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">/t/</InputAdornment>,
                      },
                    }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Format</InputLabel>
                    <Select value={format} label="Format" onChange={(e) => setFormat(e.target.value)}>
                      {FORMATS.map((f) => (
                        <MenuItem key={f} value={f}>{f}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
            </Card>

            {/* Stages Card */}
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Badge badgeContent={stages.length} color="primary" showZero
                    sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}>
                      <ViewListIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </Avatar>
                  </Badge>
                }
                title="Stages"
                subheader="Define the rounds of your tournament"
                slotProps={{
                  title: { variant: 'subtitle2', fontWeight: 'bold' },
                  subheader: { variant: 'caption' },
                }}
                sx={{ pb: 0 }}
              />
              <CardContent>
                <List dense disablePadding sx={{
                  border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 1.5,
                }}>
                  {stages.map((stage, i) => (
                    <ListItem
                      key={i}
                      divider={i < stages.length - 1}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 'bold', bgcolor: 'action.hover', color: 'text.secondary' }}>
                          {i + 1}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText primary={stage} slotProps={{ primary: { variant: 'body2' } }} />
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" onClick={() => handleMoveStage(i, -1)} disabled={i === 0}>
                          <Typography variant="caption">↑</Typography>
                        </IconButton>
                        <IconButton size="small" onClick={() => handleMoveStage(i, 1)} disabled={i === stages.length - 1}>
                          <Typography variant="caption">↓</Typography>
                        </IconButton>
                        <IconButton size="small" onClick={() => handleRemoveStage(i)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </ListItem>
                  ))}
                  {stages.length === 0 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.disabled">No stages added</Typography>
                    </Box>
                  )}
                </List>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    placeholder="Add stage..."
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                    sx={{ flex: 1 }}
                  />
                  <Button size="small" variant="outlined" onClick={handleAddStage} disabled={!newStageName.trim()}
                    startIcon={<AddIcon />}>
                    Add
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCreate}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <EmojiEventsIcon />}
                sx={{ fontWeight: 'bold' }}
              >
                {saving ? 'Creating...' : 'Create Tournament'}
              </Button>
              <Button variant="outlined" onClick={onBack} disabled={saving}>Cancel</Button>
            </Stack>
          </Stack>
        </Box>

        {/* Right: Branding Card */}
        <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
          <Card variant="outlined">
            <CardHeader
              avatar={<Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}><PaletteIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></Avatar>}
              title="Branding"
              subheader="Optional — can be added later"
              slotProps={{
                title: { variant: 'subtitle2', fontWeight: 'bold' },
                subheader: { variant: 'caption' },
              }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>Banner Image</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Recommended: 1200x300px
                  </Typography>
                  <ImageUpload
                    value={bannerUrl || undefined}
                    onChange={(url) => setBannerUrl(url || '')}
                    aspectRatio="4/1"
                  />
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>Logo</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Recommended: 256x256px
                  </Typography>
                  <Box sx={{ maxWidth: 150 }}>
                    <ImageUpload
                      value={logoUrl || undefined}
                      onChange={(url) => setLogoUrl(url || '')}
                      aspectRatio="1/1"
                    />
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </>
  );
}

// ── Detail ──

function TournamentDetailSection({
  tournament: initialTournament,
  user,
  onBack,
  onUpdated,
  onDeleted,
}: {
  tournament: Tournament;
  user: User;
  onBack: () => void;
  onUpdated: (t: Tournament) => void;
  onDeleted: () => void;
}) {
  const [tournament, setTournament] = useState<Tournament>(initialTournament);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailTab, setDetailTab] = useState<'mappool' | 'bracket' | 'details'>('mappool');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(tournament.name);
  const [savingName, setSavingName] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  // Add map state
  const [addMapOpen, setAddMapOpen] = useState(false);
  const [mapInput, setMapInput] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [fetchedBeatmapset, setFetchedBeatmapset] = useState<BeatmapsetInfo | null>(null);
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('RC');
  const [selectedMod, setSelectedMod] = useState('NM');
  const [addingMap, setAddingMap] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Load full tournament data
  useEffect(() => {
    setLoading(true);
    getTournament(tournament.abbreviation)
      .then((full) => {
        setTournament(full);
        setEditName(full.name);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tournament.abbreviation]);

  const stages = tournament.stages ?? [];
  const currentStage = stages[currentStageIndex];
  const isOwner = user.osu_id === tournament.user?.osu_id;

  // Group maps by slot type
  const mapsBySlot: Record<string, TournamentMap[]> = {};
  if (currentStage?.maps) {
    for (const map of currentStage.maps) {
      if (!mapsBySlot[map.slot_type]) mapsBySlot[map.slot_type] = [];
      mapsBySlot[map.slot_type].push(map);
    }
  }
  // Order by predefined slots first, then custom
  const slotOrder = [...SLOTS.filter((s) => mapsBySlot[s]), ...Object.keys(mapsBySlot).filter((s) => !SLOTS.includes(s))];

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSavingName(true);
    try {
      const updated = await updateTournament(tournament.abbreviation, { name: editName.trim() });
      setTournament(updated);
      onUpdated(updated);
      setEditingName(false);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update' });
    }
    setSavingName(false);
  };

  const handleStatusChange = async (status: string) => {
    // if (status === 'live') {
    //   setShowPaywall(true);
    //   return;
    // }
    try {
      const updated = await updateTournament(tournament.abbreviation, { status });
      setTournament(updated);
      onUpdated(updated);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update status' });
    }
  };

  const handleBannerChange = async (url: string | null) => {
    try {
      const updated = await updateTournament(tournament.abbreviation, { banner_url: url || '' });
      setTournament(updated);
      onUpdated(updated);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update banner' });
    }
  };

  const handleLogoChange = async (url: string | null) => {
    try {
      const updated = await updateTournament(tournament.abbreviation, { logo_url: url || '' });
      setTournament(updated);
      onUpdated(updated);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update logo' });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournament(tournament.abbreviation);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
    setDeleting(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/t/${tournament.abbreviation}`);
    setSnackbar({ open: true, message: 'Link copied!' });
  };

  // ── Add Map Logic ──

  const extractBeatmapId = (input: string): string | null => {
    if (/^\d+$/.test(input.trim())) return input.trim();
    const match = input.match(/osu\.ppy\.sh\/beatmapsets\/(\d+)/);
    if (match) return match[1];
    const nerinyanMatch = input.match(/nerinyan\.moe.*?(\d+)/);
    if (nerinyanMatch) return nerinyanMatch[1];
    return null;
  };

  const handleFetchBeatmap = async () => {
    const id = extractBeatmapId(mapInput);
    if (!id) { setMapError('Invalid beatmap ID or URL'); return; }

    setMapLoading(true);
    setMapError('');
    setFetchedBeatmapset(null);
    setSelectedDiffIndex(null);
    try {
      const bs = await getBeatmapset(parseInt(id));
      if (!bs || bs.beatmaps.length === 0) {
        setMapError('Beatmapset not found or has no mania difficulties');
        setMapLoading(false);
        return;
      }
      setFetchedBeatmapset(bs);
      if (bs.beatmaps.length === 1) setSelectedDiffIndex(0);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Failed to fetch');
    }
    setMapLoading(false);
  };

  const handleAddMap = async () => {
    if (!fetchedBeatmapset || selectedDiffIndex === null || !currentStage) return;
    const diff = fetchedBeatmapset.beatmaps[selectedDiffIndex];

    setAddingMap(true);
    setMapError('');
    try {
      await addMapToStage(tournament.abbreviation, currentStage.id, {
        slot_type: selectedSlot,
        mod: selectedMod,
        beatmapset_id: fetchedBeatmapset.beatmapset_id,
        title: fetchedBeatmapset.title,
        artist: fetchedBeatmapset.artist,
        creator: fetchedBeatmapset.creator,
        keys: diff.keys,
        star_rating: diff.star_rating,
        difficulty_name: diff.difficulty_name,
      });
      // Reload tournament to get updated maps
      const updated = await getTournament(tournament.abbreviation);
      setTournament(updated);
      onUpdated(updated);
      // Reset add state
      setFetchedBeatmapset(null);
      setSelectedDiffIndex(null);
      setMapInput('');
      setAddMapOpen(false);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Failed to add map');
    }
    setAddingMap(false);
  };

  const handleRemoveMap = async (mapId: number) => {
    try {
      await removeMap(tournament.abbreviation, mapId);
      const updated = await getTournament(tournament.abbreviation);
      setTournament(updated);
      onUpdated(updated);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to remove map' });
    }
  };

  const totalMaps = stages.reduce((sum, s) => sum + (s.maps?.length ?? 0), 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <>
      {/* ── Breadcrumb nav ── */}
      <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 14 }} />} sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={onBack}
        >
          Tournaments
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {tournament.name}
        </Typography>
      </Breadcrumbs>

      {/* ── Hero card ── */}
      <Card variant="outlined" sx={{ mb: 2.5, overflow: 'hidden' }}>
        {/* Banner */}
        {tournament.banner_url && (
          <Box sx={{ height: 140, position: 'relative' }}>
            <Box
              component="img"
              src={tournament.banner_url}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Box sx={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
            }} />
          </Box>
        )}

        <CardHeader
          avatar={
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <FiberManualRecordIcon sx={{
                  fontSize: 12,
                  color: statusColors[tournament.status],
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                }} />
              }
            >
              <Avatar
                src={tournament.logo_url || undefined}
                variant="rounded"
                sx={{ width: 48, height: 48, border: '2px solid', borderColor: 'divider' }}
              >
                <EmojiEventsIcon />
              </Avatar>
            </Badge>
          }
          title={
            editingName ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TextField
                  size="small"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: 16, fontWeight: 'bold' } }}
                  autoFocus
                />
                <IconButton size="small" onClick={handleSaveName} disabled={savingName}>
                  <CheckIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => { setEditingName(false); setEditName(tournament.name); }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="subtitle1" fontWeight="bold">{tournament.name}</Typography>
                {isOwner && (
                  <Tooltip title="Rename">
                    <IconButton size="small" onClick={() => setEditingName(true)} sx={{ p: 0.25 }}>
                      <EditIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Chip
                  icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${statusColors[tournament.status]} !important` }} />}
                  label={tournament.status}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11, textTransform: 'capitalize', borderColor: 'divider', ml: 0.5 }}
                />
              </Box>
            )
          }
          subheader={
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
              <Chip label={tournament.format} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, borderColor: 'divider' }} />
              <Chip label={`${stages.length} stages`} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, borderColor: 'divider' }} />
              <Chip label={`${totalMaps} maps`} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, borderColor: 'divider' }} />
              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                /t/{tournament.abbreviation}
              </Typography>
            </Stack>
          }
          action={
            <ButtonGroup size="small" variant="outlined" sx={{ mt: 0.5 }}>
              <Tooltip title="Copy link">
                <Button onClick={handleCopyLink} sx={{ minWidth: 36, px: 1 }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
              <Tooltip title="Open public page">
                <Button component={Link} to={`/t/${tournament.abbreviation}`} target="_blank" sx={{ minWidth: 36, px: 1 }}>
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
            </ButtonGroup>
          }
          sx={{ pb: 1.5 }}
        />
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Tab bar ── */}
      <Tabs
        value={detailTab}
        onChange={(_, v) => setDetailTab(v as typeof detailTab)}
        sx={{
          mb: 0, minHeight: 40,
          borderBottom: '1px solid', borderColor: 'divider',
          '& .MuiTab-root': {
            fontWeight: 600, fontSize: 13,
            minHeight: 40, py: 0, px: 2,
            gap: 0.75,
          },
        }}
      >
        <Tab icon={<ViewListIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Mappool" value="mappool" />
        <Tab icon={<AccountTreeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Bracket" value="bracket" />
        <Tab icon={<SettingsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Settings" value="details" />
      </Tabs>

      {/* ── Tab content ── */}
      <Box sx={{ pt: 2.5 }}>
        {/* Mappool */}
        {detailTab === 'mappool' && (
          <>
            {stages.length > 0 ? (
              <Box>
                {/* Stage tabs + Add button */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Tabs
                    value={currentStageIndex}
                    onChange={(_, v) => setCurrentStageIndex(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      flex: 1, minHeight: 32,
                      '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: 13 },
                      '& .MuiTabs-indicator': { height: 2 },
                    }}
                  >
                    {stages.map((stage, i) => (
                      <Tab
                        key={stage.id}
                        label={
                          <Badge
                            badgeContent={stage.maps?.length ?? 0}
                            color="primary"
                            max={99}
                            sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}
                          >
                            <Box sx={{ pr: (stage.maps?.length ?? 0) > 0 ? 1.5 : 0 }}>{stage.name}</Box>
                          </Badge>
                        }
                        value={i}
                      />
                    ))}
                  </Tabs>
                  {isOwner && (
                    <Tooltip title="Add map to stage">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setAddMapOpen(true)}
                        sx={{ flexShrink: 0, fontSize: 12 }}
                      >
                        Add Map
                      </Button>
                    </Tooltip>
                  )}
                </Box>

                {/* Map list */}
                {currentStage && (!currentStage.maps || currentStage.maps.length === 0) ? (
                  <Card variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
                    <ViewListIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.disabled" sx={{ mb: 1.5 }}>
                      No maps in {currentStage.name}
                    </Typography>
                    {isOwner && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setAddMapOpen(true)}
                        sx={{ textTransform: 'none' }}
                      >
                        Add maps to this stage
                      </Button>
                    )}
                  </Card>
                ) : (
                  <Stack spacing={1.5}>
                    {slotOrder.map((slotType) => (
                      <Card key={slotType} variant="outlined" sx={{ overflow: 'hidden' }}>
                        <CardHeader
                          avatar={
                            <Box sx={{
                              width: 32, height: 32, borderRadius: 1,
                              backgroundColor: slotColors[slotType] || '#888',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>
                                {slotType}
                              </Typography>
                            </Box>
                          }
                          title={slotLabels[slotType] || slotType}
                          subheader={`${mapsBySlot[slotType].length} map${mapsBySlot[slotType].length !== 1 ? 's' : ''}`}
                          slotProps={{
                            title: { variant: 'body2', fontWeight: 'bold' },
                            subheader: { variant: 'caption' },
                          }}
                          sx={{ py: 1, px: 2, backgroundColor: 'action.hover' }}
                        />
                        <CardContent sx={{ p: '4px !important' }}>
                          {mapsBySlot[slotType].map((map) => (
                            <BeatmapRow
                              key={map.id}
                              title={map.title}
                              artist={map.artist}
                              keys={map.keys}
                              creator={map.creator}
                              creatorPrefix="mapped by"
                              difficultyName={map.difficulty_name}
                              starRating={map.star_rating}
                              beatmapsetId={map.beatmapset_id}
                              slotBadge={{
                                label: `${map.slot_type}${map.slot_number}`,
                                color: slotColors[map.slot_type] || '#888',
                              }}
                              modChips={map.mod.match(/.{2}/g)?.map((m) => ({
                                label: m,
                                color: modColors[m] || '#666',
                                icon: modIcons[m],
                              }))}
                              actions={
                                <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                                  <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${map.beatmapset_id}`, '_blank')} />
                                  <DownloadButton
                                    downloadUrl={`https://api.nerinyan.moe/d/${map.beatmapset_id}`}
                                    downloadName={`${map.artist} - ${map.title}`}
                                  />
                                  {isOwner && (
                                    <RemoveButton onClick={() => handleRemoveMap(map.id)} />
                                  )}
                                </Stack>
                              }
                            />
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            ) : (
              <Card variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
                <Typography color="text.disabled">No stages configured</Typography>
              </Card>
            )}
          </>
        )}

        {/* Bracket */}
        {detailTab === 'bracket' && (
          <TournamentBracket tournamentAbbrev={tournament.abbreviation} isOwner={isOwner} />
        )}

        {/* Settings */}
        {detailTab === 'details' && (
          <Stack spacing={2}>
            {/* Status */}
            {isOwner && (
              <TournamentStatus value={tournament.status as 'upcoming' | 'live' | 'completed'} onChange={handleStatusChange} />
            )}

            {/* Branding */}
            {isOwner && (
              <Card variant="outlined">
                <CardHeader
                  avatar={<PaletteIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                  title="Branding"
                  subheader="Customize how your tournament appears to players"
                  slotProps={{
                    title: { variant: 'subtitle2', fontWeight: 'bold' },
                    subheader: { variant: 'caption' },
                  }}
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  {/* Live preview */}
                  <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, mb: 1, display: 'block' }}>
                    Preview
                  </Typography>
                  <Card variant="outlined" sx={{ mb: 2.5, overflow: 'hidden' }}>
                    {/* Preview banner */}
                    <Box sx={{
                      height: 80, position: 'relative',
                      backgroundColor: tournament.banner_url ? 'transparent' : 'action.hover',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {tournament.banner_url ? (
                        <>
                          <Box
                            component="img"
                            src={tournament.banner_url}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
                        </>
                      ) : (
                        <Typography variant="caption" color="text.disabled">No banner</Typography>
                      )}
                    </Box>
                    {/* Preview header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
                      <Avatar
                        src={tournament.logo_url || undefined}
                        variant="rounded"
                        sx={{ width: 36, height: 36 }}
                      >
                        <EmojiEventsIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight="bold" noWrap>{tournament.name}</Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <FiberManualRecordIcon sx={{ fontSize: 6, color: statusColors[tournament.status] }} />
                          <Typography variant="caption" color="text.secondary">{tournament.format}</Typography>
                        </Stack>
                      </Box>
                      <Chip label={tournament.status} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, textTransform: 'capitalize' }} />
                    </Box>
                  </Card>

                  {/* Upload fields */}
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2.5}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>Banner Image</Typography>
                        <Chip
                          label={tournament.banner_url ? 'Uploaded' : 'Not set'}
                          size="small"
                          variant="outlined"
                          icon={tournament.banner_url ? <CheckIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                          sx={{
                            height: 20, fontSize: 10,
                            borderColor: tournament.banner_url ? 'primary.main' : 'divider',
                            color: tournament.banner_url ? 'primary.main' : 'text.disabled',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Displayed at the top of your tournament page. Recommended: 1200x300px
                      </Typography>
                      <ImageUpload
                        value={tournament.banner_url || undefined}
                        onChange={handleBannerChange}
                        aspectRatio="4/1"
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>Logo</Typography>
                        <Chip
                          label={tournament.logo_url ? 'Uploaded' : 'Not set'}
                          size="small"
                          variant="outlined"
                          icon={tournament.logo_url ? <CheckIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                          sx={{
                            height: 20, fontSize: 10,
                            borderColor: tournament.logo_url ? 'primary.main' : 'divider',
                            color: tournament.logo_url ? 'primary.main' : 'text.disabled',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Square image shown in listings and headers. Recommended: 256x256px
                      </Typography>
                      <Box sx={{ maxWidth: 180 }}>
                        <ImageUpload
                          value={tournament.logo_url || undefined}
                          onChange={handleLogoChange}
                          aspectRatio="1/1"
                        />
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <Card variant="outlined">
              <CardHeader
                avatar={<InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                title="Information"
                slotProps={{ title: { variant: 'subtitle2', fontWeight: 'bold' } }}
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ pt: 1 }}>
                <List dense disablePadding>
                  {[
                    { icon: <LinkIcon sx={{ fontSize: 18 }} />, label: 'Abbreviation', value: tournament.abbreviation, mono: true },
                    { icon: <GroupIcon sx={{ fontSize: 18 }} />, label: 'Format', value: tournament.format },
                    { icon: <ViewListIcon sx={{ fontSize: 18 }} />, label: 'Stages', value: stages.length.toString() },
                    { icon: <EmojiEventsIcon sx={{ fontSize: 18 }} />, label: 'Total Maps', value: totalMaps.toString() },
                    { icon: <OpenInNewIcon sx={{ fontSize: 18 }} />, label: 'Public URL', value: `${window.location.origin}/t/${tournament.abbreviation}`, mono: true },
                  ].map((row, i) => (
                    <ListItem
                      key={row.label}
                      divider={i < 4}
                      sx={{ px: 0 }}
                      secondaryAction={
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{ fontFamily: row.mono ? 'monospace' : undefined, fontSize: row.mono ? 12 : undefined }}
                        >
                          {row.value}
                        </Typography>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{row.icon}</ListItemIcon>
                      <ListItemText primary={row.label} slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Danger zone */}
            {isOwner && (
              <Card variant="outlined" sx={{ borderColor: 'error.main', borderStyle: 'dashed' }}>
                <CardHeader
                  avatar={<DeleteIcon sx={{ fontSize: 18, color: 'error.main' }} />}
                  title="Danger Zone"
                  subheader="Permanently delete this tournament and all associated data"
                  slotProps={{
                    title: { variant: 'subtitle2', fontWeight: 'bold', color: 'error' },
                    subheader: { variant: 'caption' },
                  }}
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  {!confirmDelete ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setConfirmDelete(true)}
                      sx={{ textTransform: 'none' }}
                    >
                      Delete Tournament
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleDelete}
                        disabled={deleting}
                        sx={{
                          backgroundColor: 'error.main',
                          '&:hover': { backgroundColor: 'error.dark' },
                        }}
                      >
                        {deleting ? 'Deleting...' : 'Yes, delete permanently'}
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setConfirmDelete(false)}
                        sx={{ textTransform: 'none' }}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}
          </Stack>
        )}
      </Box>

      {/* Add Map Dialog */}
      <Dialog
        open={addMapOpen}
        onClose={() => { setAddMapOpen(false); setFetchedBeatmapset(null); setMapInput(''); setMapError(''); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add Map to {currentStage?.name}
          <IconButton size="small" onClick={() => setAddMapOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Fetch beatmap */}
            <Stack direction="row" spacing={1}>
              <TextField
                label="Beatmap ID or URL"
                fullWidth
                size="small"
                value={mapInput}
                onChange={(e) => setMapInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && mapInput.trim() && handleFetchBeatmap()}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><LinkIcon fontSize="small" /></InputAdornment>,
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleFetchBeatmap}
                disabled={!mapInput.trim() || mapLoading}
                sx={{ minWidth: 80 }}
              >
                {mapLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Fetch'}
              </Button>
            </Stack>

            {mapError && <Alert severity="error">{mapError}</Alert>}

            {/* Fetched beatmapset info */}
            {fetchedBeatmapset && (
              <>
                <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box
                      component="img"
                      src={`https://assets.ppy.sh/beatmaps/${fetchedBeatmapset.beatmapset_id}/covers/list.jpg`}
                      sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover' }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {fetchedBeatmapset.artist} - {fetchedBeatmapset.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        mapped by {fetchedBeatmapset.creator}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Difficulty selection */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Difficulty</Typography>
                  <Stack spacing={0.5}>
                    {fetchedBeatmapset.beatmaps.map((diff, i) => (
                      <Paper
                        key={diff.beatmap_id}
                        onClick={() => setSelectedDiffIndex(i)}
                        sx={{
                          p: 1.5, cursor: 'pointer',
                          border: '2px solid',
                          borderColor: selectedDiffIndex === i ? 'primary.main' : 'divider',
                          backgroundColor: selectedDiffIndex === i ? 'rgba(132,169,140,0.08)' : 'transparent',
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Chip
                          label={`${diff.keys}K`}
                          size="small"
                          sx={{
                            height: 22, fontWeight: 'bold', fontSize: 11,
                            backgroundColor: 'primary.main', color: 'white',
                          }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }}>{diff.difficulty_name}</Typography>
                        <Typography variant="caption" sx={{ color: '#f5c842', fontWeight: 'bold' }}>
                          ★ {diff.star_rating.toFixed(2)}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                {/* Slot & Mod selection */}
                {selectedDiffIndex !== null && (
                  <>
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Slot Type</Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {SLOTS.map((s) => (
                          <Chip
                            key={s}
                            label={s}
                            size="small"
                            onClick={() => setSelectedSlot(s)}
                            sx={{
                              fontWeight: 'bold', cursor: 'pointer',
                              backgroundColor: selectedSlot === s ? (slotColors[s] || '#888') : 'action.hover',
                              color: selectedSlot === s ? 'white' : 'text.primary',
                              border: selectedSlot === s ? 'none' : '1px solid',
                              borderColor: 'divider',
                              '&:hover': { opacity: 0.85 },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Mod</Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {MODS.map((m) => (
                          <Chip
                            key={m}
                            label={m}
                            size="small"
                            icon={modIcons[m] ? <Box component="img" src={modIcons[m]} sx={{ width: 18, height: 18 }} /> : undefined}
                            onClick={() => setSelectedMod(m)}
                            sx={{
                              fontWeight: 'bold', cursor: 'pointer',
                              backgroundColor: selectedMod === m ? (modColors[m] || '#666') : 'action.hover',
                              color: selectedMod === m ? 'white' : 'text.primary',
                              border: selectedMod === m ? 'none' : '1px solid',
                              borderColor: 'divider',
                              '&:hover': { opacity: 0.85 },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setAddMapOpen(false); setFetchedBeatmapset(null); setMapInput(''); setMapError(''); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddMap}
            disabled={!fetchedBeatmapset || selectedDiffIndex === null || addingMap}
            startIcon={addingMap ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <AddIcon />}
          >
            {addingMap ? 'Adding...' : 'Add Map'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Paywall */}
      <Dialog
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, overflow: 'hidden' } },
        }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg, rgba(132,169,140,0.15) 0%, rgba(132,169,140,0.03) 100%)',
          px: 4, pt: 4, pb: 2, textAlign: 'center',
        }}>
          <RocketLaunchIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
            Upgrade to go Live
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your tournament is ready. Choose a plan to publish it and make it accessible to players.
          </Typography>
        </Box>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 2,
          }}>
            {/* Free tier */}
            <Paper sx={{
              p: 2.5, border: '1px solid', borderColor: 'divider',
              display: 'flex', flexDirection: 'column',
            }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Starter</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                <Typography variant="h4" fontWeight="bold">Free</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>For casual tournaments</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
                {['Up to 8 players', '1 active tournament', 'Basic bracket', 'Community support'].map((f) => (
                  <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="body2">{f}</Typography>
                  </Box>
                ))}
                {['Custom branding', 'Live streaming', 'Analytics'].map((f) => (
                  <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.4 }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{f}</Typography>
                  </Box>
                ))}
              </Stack>
              <Button variant="outlined" fullWidth sx={{ textTransform: 'none' }}>
                Current Plan
              </Button>
            </Paper>

            {/* Pro tier */}
            <Paper sx={{
              p: 2.5,
              border: '2px solid', borderColor: 'primary.main',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
            }}>
              <Chip
                label="POPULAR"
                size="small"
                sx={{
                  position: 'absolute', top: -12, right: 16,
                  backgroundColor: 'primary.main', color: 'white',
                  fontWeight: 'bold', fontSize: 10, height: 22,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <BoltIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 1.5, fontWeight: 'bold' }}>Pro</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                <Typography variant="h4" fontWeight="bold">$100</Typography>
                <Typography variant="body2" color="text.secondary">/mo</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>For serious organizers</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
                {([
                  { icon: <GroupIcon sx={{ fontSize: 16 }} />, text: 'Up to 64 players' },
                  { icon: <EmojiEventsIcon sx={{ fontSize: 16 }} />, text: '5 active tournaments' },
                  { icon: <AccountTreeIcon sx={{ fontSize: 16 }} />, text: 'Single & double elimination' },
                  { icon: <PaletteIcon sx={{ fontSize: 16 }} />, text: 'Custom branding' },
                  { icon: <SupportAgentIcon sx={{ fontSize: 16 }} />, text: 'Priority support' },
                  { icon: <BarChartIcon sx={{ fontSize: 16 }} />, text: 'Mappool analytics' },
                ] as const).map((f) => (
                  <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: 'primary.main', display: 'flex' }}>{f.icon}</Box>
                    <Typography variant="body2">{f.text}</Typography>
                  </Box>
                ))}
              </Stack>
              <Button
                variant="contained"
                fullWidth
                startIcon={<StarIcon />}
                sx={{ fontWeight: 'bold' }}
              >
                Upgrade to Pro
              </Button>
            </Paper>

            {/* Enterprise tier */}
            <Paper sx={{
              p: 2.5, border: '1px solid', borderColor: 'divider',
              display: 'flex', flexDirection: 'column',
              background: 'linear-gradient(180deg, rgba(245,200,66,0.04) 0%, transparent 100%)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <DiamondIcon sx={{ fontSize: 18, color: '#f5c842' }} />
                <Typography variant="overline" sx={{ letterSpacing: 1.5, fontWeight: 'bold', color: '#f5c842' }}>Enterprise</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                <Typography variant="h4" fontWeight="bold">$500</Typography>
                <Typography variant="body2" color="text.secondary">/mo</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>For leagues & organizations</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
                {([
                  { icon: <AllInclusiveIcon sx={{ fontSize: 16 }} />, text: 'Unlimited players' },
                  { icon: <EmojiEventsIcon sx={{ fontSize: 16 }} />, text: 'Unlimited tournaments' },
                  { icon: <AccountTreeIcon sx={{ fontSize: 16 }} />, text: 'All bracket formats' },
                  { icon: <WorkspacePremiumIcon sx={{ fontSize: 16 }} />, text: 'White-label branding' },
                  { icon: <LiveTvIcon sx={{ fontSize: 16 }} />, text: 'Live streaming overlay' },
                  { icon: <CodeIcon sx={{ fontSize: 16 }} />, text: 'API access' },
                  { icon: <SupportAgentIcon sx={{ fontSize: 16 }} />, text: 'Dedicated support' },
                  { icon: <DnsIcon sx={{ fontSize: 16 }} />, text: 'Custom domain' },
                ] as const).map((f) => (
                  <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: '#f5c842', display: 'flex' }}>{f.icon}</Box>
                    <Typography variant="body2">{f.text}</Typography>
                  </Box>
                ))}
              </Stack>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  fontWeight: 'bold',
                  borderColor: '#f5c842', color: '#f5c842',
                  '&:hover': { backgroundColor: 'rgba(245,200,66,0.08)', borderColor: '#f5c842' },
                }}
              >
                Contact Sales
              </Button>
            </Paper>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 2.5 }}>
            All plans include SSL, 99.9% uptime SLA, and automatic backups. Cancel anytime.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 4, pb: 3, justifyContent: 'center' }}>
          <Button onClick={() => setShowPaywall(false)} sx={{ color: 'text.secondary' }}>
            Maybe later
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="info" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
