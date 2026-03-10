import { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
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
  Menu,
  MenuItem,

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
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import DnsIcon from '@mui/icons-material/Dns';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import SettingsIcon from '@mui/icons-material/Settings';
import CampaignIcon from '@mui/icons-material/Campaign';
import ImageIcon from '@mui/icons-material/Image';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { User, BeatmapsetInfo } from '../../auth/api/auth';
import { browsePacks, getPack, type Pack, type BrowsePacksResult } from '../../pack/api/packs';
import { palette } from '../../../shared/theme/palette';
import { placeholderBanner, placeholderLogo } from '../utils/placeholders';
import { getBeatmapset } from '../../auth/api/auth';
import {
  getTournament,
  updateTournament,
  deleteTournament,
  addMapToStage,
  removeMap,
  updateMap,
  addStage,
  renameStage,
  deleteStage,
  type Tournament,
  type TournamentMap,
  uploadImage,
} from '../api/tournaments';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import SlotBadge from '../../../shared/components/SlotBadge';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import RemoveButton from '../../../shared/components/RemoveButton';
import TournamentPlayers, { toPlayers, parseBracketData, type Player, type BracketData } from './TournamentPlayers';
import TournamentBracket from './TournamentBracket';
import { toAnnouncements, type Announcement } from './TournamentAnnouncements';
import TournamentStatus, { statusColors } from './TournamentStatus';
import SlotsEditor from './SlotsEditor';
import TournamentAnnouncements from './TournamentAnnouncements';
import SiteSettings from './SiteSettings';
import { parseSlotConfigs, getSlotLabel, getSlotColor, SLOTS } from './slotUtils';

const statusIcons: Record<string, React.ReactElement> = {
  upcoming: <ScheduleIcon />,
  live: <LiveTvIcon />,
  completed: <CheckCircleIcon />,
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

const MODS = ['NM', 'HD', 'HR', 'DT', 'FM', 'FL'];

interface TournamentDetailSectionProps {
  tournament: Tournament;
  user: User;
  onBack: () => void;
  onUpdated: (t: Tournament) => void;
  onDeleted: () => void;
}

export default function TournamentDetailSection({
  tournament: initialTournament,
  user,
  onBack,
  onUpdated,
  onDeleted,
}: TournamentDetailSectionProps) {
  const [tournament, setTournament] = useState<Tournament>(initialTournament);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailTab, setDetailTab] = useState<'mappool' | 'players' | 'bracket' | 'slots' | 'news' | 'website' | 'details'>('mappool');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(tournament.name);
  const [savingName, setSavingName] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  // Stage editing state
  const [editingStages, setEditingStages] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [stageToDelete, setStageToDelete] = useState<{ id: number; name: string } | null>(null);
  const [renamingStageId, setRenamingStageId] = useState<number | null>(null);
  const [renameStageValue, setRenameStageValue] = useState('');

  // Add map state
  const [addMapOpen, setAddMapOpen] = useState(false);
  const [mapInput, setMapInput] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [fetchedBeatmapset, setFetchedBeatmapset] = useState<BeatmapsetInfo | null>(null);
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryData, setLibraryData] = useState<BrowsePacksResult | null>(null);
  const [libraryPage, setLibraryPage] = useState(1);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [expandedPack, setExpandedPack] = useState<Pack | null>(null);
  const [expandingPackCode, setExpandingPackCode] = useState<string | null>(null);
  const [editingMap, setEditingMap] = useState<TournamentMap | null>(null);
  const [slotMenuAnchor, setSlotMenuAnchor] = useState<HTMLElement | null>(null);
  const [slotMenuMap, setSlotMenuMap] = useState<TournamentMap | null>(null);
  const [editSlot, setEditSlot] = useState('');
  const [editMod, setEditMod] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('RC');
  const [selectedMod, setSelectedMod] = useState('NM');
  const [addingMap, setAddingMap] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [imageModal, setImageModal] = useState<'banner' | 'logo' | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [cropUploading, setCropUploading] = useState(false);

  // Players, bracket, announcements (from API, not localStorage)
  const [players, setPlayers] = useState<Player[]>([]);
  const [bracketData, setBracketData] = useState<BracketData>({ matches: [], bestOf: 7, generated: false });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Load full tournament data
  useEffect(() => {
    setLoading(true);
    getTournament(tournament.abbreviation)
      .then((full) => {
        setTournament(full);
        setEditName(full.name);
        setPlayers(toPlayers(full.players));
        setBracketData(parseBracketData(full.bracket_data));
        setAnnouncements(toAnnouncements(full.announcements));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tournament.abbreviation]);

  const stages = tournament.stages ?? [];
  const currentStage = stages[currentStageIndex];
  const isOwner = user.osu_id === tournament.user?.osu_id;
  const slotConfigs = parseSlotConfigs(tournament.slot_configs);
  // Available slots: use tournament config if set, otherwise defaults
  const tournamentSlots = Object.keys(slotConfigs).length > 0
    ? Object.keys(slotConfigs)
    : SLOTS;

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

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleBannerFile = async (file: File) => {
    try {
      const url = await uploadImage(file);
      const updated = await updateTournament(tournament.abbreviation, { banner_url: url });
      setTournament(updated);
      onUpdated(updated);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to upload banner' });
    }
  };

  const handleLogoFile = async (file: File) => {
    try {
      const url = await uploadImage(file);
      const updated = await updateTournament(tournament.abbreviation, { logo_url: url });
      setTournament(updated);
      onUpdated(updated);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to upload logo' });
    }
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const startCrop = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = async () => {
    if (!cropImage || !croppedArea || !imageModal) return;
    setCropUploading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = croppedArea.width;
      canvas.height = croppedArea.height;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = cropImage;
      });
      ctx.drawImage(img, croppedArea.x, croppedArea.y, croppedArea.width, croppedArea.height, 0, 0, croppedArea.width, croppedArea.height);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
      const croppedFile = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      if (imageModal === 'banner') await handleBannerFile(croppedFile);
      else await handleLogoFile(croppedFile);
      setCropImage(null);
      setImageModal(null);
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to crop image' });
    } finally {
      setCropUploading(false);
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

      {/* ── Hero card (contains everything) ── */}
      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ background: `linear-gradient(180deg, ${palette.mid}15 0%, ${palette.light}08 100%)` }}>
        {/* Banner */}
        <Box
          sx={{ aspectRatio: '4/1', position: 'relative', cursor: isOwner ? 'pointer' : 'default' }}
          onClick={() => isOwner && setImageModal('banner')}
        >
          <Box
            component="img"
            src={tournament.banner_url || placeholderBanner}
            sx={{
              width: '100%', height: '100%', objectFit: 'cover',
              maskImage: 'linear-gradient(180deg, black 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, black 40%, transparent 100%)',
            }}
          />
        </Box>
        <CardHeader
          avatar={
            <Avatar
              src={tournament.logo_url || placeholderLogo}
              variant="rounded"
              sx={{ width: 48, height: 48, cursor: isOwner ? 'pointer' : 'default' }}
              onClick={() => isOwner && setImageModal('logo')}
            />
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
                  icon={statusIcons[tournament.status]}
                  label={tournament.status}
                  size="small"
                  sx={{
                    height: 22, fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize', ml: 0.5,
                    backgroundColor: `${statusColors[tournament.status]}dd`,
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white', fontSize: 12, ml: 0.5 },
                  }}
                />
              </Box>
            )
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
          sx={{ pb: 0 }}
        />

        {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{error}</Alert>}

        {/* Tab bar */}
        <Tabs
          value={detailTab}
          onChange={(_, v) => setDetailTab(v as typeof detailTab)}
          sx={{
            minHeight: 40, px: 2,
            '& .MuiTab-root': {
              fontWeight: 600, fontSize: 13,
              minHeight: 40, py: 0, px: 2,
              gap: 0.75,
            },
          }}
        >
          <Tab icon={<ViewListIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Mappool" value="mappool" />
          <Tab icon={<GroupIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Players" value="players" />
          <Tab icon={<AccountTreeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Bracket" value="bracket" />
          <Tab icon={<DnsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Slots" value="slots" />
          <Tab icon={<CampaignIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="News" value="news" />
          {isOwner && <Tab icon={<CodeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Website (Soon)" value="website" disabled sx={{ opacity: 0.4 }} />}
          <Tab icon={<SettingsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Settings" value="details" />
        </Tabs>

        {/* Tab content */}
        <Box sx={{ p: 2.5 }}>
        {/* Mappool */}
        {detailTab === 'mappool' && (
          <>
            {editingStages ? (
              <Box>
                  /* ── Stage editor (replaces mappool content) ── */
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewListIcon sx={{ fontSize: 16 }} />}
                        onClick={() => { setEditingStages(false); setRenamingStageId(null); }}
                        sx={{ fontSize: 12 }}
                      >
                        Back to Mappool
                      </Button>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        Editing stages ({stages.length})
                      </Typography>
                    </Box>

                    <List disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
                      {stages.map((stage, i) => (
                        <ListItem
                          key={stage.id}
                          divider={i < stages.length - 1}
                          secondaryAction={
                            <Tooltip title="Delete stage">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setStageToDelete({ id: stage.id, name: stage.name })}
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          }
                          sx={{ py: 0.75, px: 1.5 }}
                        >
                          {renamingStageId === stage.id ? (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1, mr: 4 }}>
                              <TextField
                                size="small"
                                value={renameStageValue}
                                onChange={(e) => setRenameStageValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && renameStageValue.trim()) {
                                    renameStage(tournament.abbreviation, stage.id, renameStageValue.trim()).then(() => {
                                      setTournament((prev) => ({
                                        ...prev,
                                        stages: prev.stages?.map((s) => s.id === stage.id ? { ...s, name: renameStageValue.trim() } : s),
                                      }));
                                      setRenamingStageId(null);
                                    }).catch(() => setError('Failed to rename stage'));
                                  }
                                  if (e.key === 'Escape') setRenamingStageId(null);
                                }}
                                autoFocus
                                sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: 14 } }}
                              />
                              <IconButton size="small" onClick={() => {
                                if (!renameStageValue.trim()) return;
                                renameStage(tournament.abbreviation, stage.id, renameStageValue.trim()).then(() => {
                                  setTournament((prev) => ({
                                    ...prev,
                                    stages: prev.stages?.map((s) => s.id === stage.id ? { ...s, name: renameStageValue.trim() } : s),
                                  }));
                                  setRenamingStageId(null);
                                }).catch(() => setError('Failed to rename stage'));
                              }}>
                                <CheckIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => setRenamingStageId(null)}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Stack>
                          ) : (
                            <ListItemText
                              primary={stage.name}
                              secondary={`${stage.maps?.length ?? 0} maps`}
                              slotProps={{ primary: { variant: 'body2', fontWeight: 500 }, secondary: { variant: 'caption' } }}
                              onClick={() => { setRenamingStageId(stage.id); setRenameStageValue(stage.name); }}
                              sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                            />
                          )}
                        </ListItem>
                      ))}
                    </List>

                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        placeholder="New stage name..."
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newStageName.trim()) {
                            addStage(tournament.abbreviation, newStageName.trim()).then((stage) => {
                              setTournament((prev) => ({
                                ...prev,
                                stages: [...(prev.stages || []), { ...stage, maps: [] }],
                              }));
                              setNewStageName('');
                            }).catch(() => setError('Failed to add stage'));
                          }
                        }}
                        sx={{ flex: 1 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!newStageName.trim()}
                        startIcon={<AddIcon />}
                        onClick={() => {
                          addStage(tournament.abbreviation, newStageName.trim()).then((stage) => {
                            setTournament((prev) => ({
                              ...prev,
                              stages: [...(prev.stages || []), { ...stage, maps: [] }],
                            }));
                            setNewStageName('');
                          }).catch(() => setError('Failed to add stage'));
                        }}
                      >
                        Add
                      </Button>
                    </Stack>

                    {/* Delete stage confirmation */}
                    <Dialog open={!!stageToDelete} onClose={() => setStageToDelete(null)} maxWidth="xs" fullWidth>
                      <DialogTitle>Delete Stage</DialogTitle>
                      <DialogContent>
                        <Typography>
                          Delete <strong>{stageToDelete?.name}</strong>? All maps in this stage will be removed. This cannot be undone.
                        </Typography>
                      </DialogContent>
                      <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button variant="outlined" onClick={() => setStageToDelete(null)}>Cancel</Button>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => {
                            if (!stageToDelete) return;
                            deleteStage(tournament.abbreviation, stageToDelete.id).then(() => {
                              setTournament((prev) => ({
                                ...prev,
                                stages: prev.stages?.filter((s) => s.id !== stageToDelete.id),
                              }));
                              if (currentStageIndex >= (stages.length - 1)) {
                                setCurrentStageIndex(Math.max(0, stages.length - 2));
                              }
                              setStageToDelete(null);
                            }).catch(() => setError('Failed to delete stage'));
                          }}
                        >
                          Delete
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </>
              </Box>
            ) : stages.length > 0 ? (
              <Box>
                  <>
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
                    <>
                      <Tooltip title="Edit stages">
                        <IconButton
                          size="small"
                          onClick={() => setEditingStages(true)}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
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
                    </>
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
                        <Box sx={{
                          py: 1, px: 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {getSlotLabel(slotType, slotConfigs)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {mapsBySlot[slotType].length} map{mapsBySlot[slotType].length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
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
                                color: getSlotColor(map.slot_type, slotConfigs),
                                onClick: isOwner ? (e) => { e.stopPropagation(); setSlotMenuAnchor(e.currentTarget as HTMLElement); setSlotMenuMap(map); } : undefined,
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
                                    <>
                                      <Tooltip title="Edit slot/mod">
                                        <IconButton size="small" onClick={() => { setEditingMap(map); setEditSlot(map.slot_type); setEditMod(map.mod); }}>
                                          <EditIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                      <RemoveButton onClick={() => handleRemoveMap(map.id)} />
                                    </>
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
                  </>
              </Box>
            ) : (
              <Card variant="outlined" sx={{ py: 6, textAlign: 'center' }}>
                <ViewListIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                  No stages yet
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  Stages are rounds of your tournament (e.g. Qualifiers, Group Stage, Finals). Create your first stage to start building your mappool.
                </Typography>
                {isOwner && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setEditingStages(true)}
                  >
                    Add Stage
                  </Button>
                )}
              </Card>
            )}
          </>
        )}

        {/* Players */}
        {detailTab === 'players' && (
          <TournamentPlayers
            tournamentAbbrev={tournament.abbreviation}
            isOwner={isOwner}
            players={players}
            bracketData={bracketData}
            onPlayersChanged={setPlayers}
            onBracketChanged={setBracketData}
          />
        )}

        {/* Bracket */}
        {detailTab === 'bracket' && (
          <TournamentBracket
            tournamentAbbrev={tournament.abbreviation}
            isOwner={isOwner}
            players={players}
            bracketData={bracketData}
            onBracketChanged={setBracketData}
          />
        )}

        {/* Slots */}
        {detailTab === 'slots' && (
          <SlotsEditor
            tournament={tournament}
            slotConfigs={slotConfigs}
            isOwner={isOwner}
            onUpdated={(updated) => { setTournament(updated); onUpdated(updated); }}
            onError={(msg) => setSnackbar({ open: true, message: msg })}
          />
        )}

        {/* News */}
        {detailTab === 'news' && (
          <TournamentAnnouncements
            tournamentAbbrev={tournament.abbreviation}
            isOwner={isOwner}
            announcements={announcements}
            onAnnouncementsChanged={setAnnouncements}
          />
        )}

        {/* Website */}
        {detailTab === 'website' && isOwner && (
          <SiteSettings tournament={tournament} />
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
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => bannerInputRef.current?.click()}
                    startIcon={<ImageIcon />}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  >
                    {tournament.banner_url ? 'Change Banner' : 'Upload Banner'}
                  </Button>
                </Box>
                <Box>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => logoInputRef.current?.click()}
                    startIcon={<ImageIcon />}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  >
                    {tournament.logo_url ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                </Box>
              </Box>
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
      </Box>
      </Card>

      {/* Inline slot menu */}
      <Menu
        anchorEl={slotMenuAnchor}
        open={!!slotMenuAnchor && !!slotMenuMap}
        onClose={() => { setSlotMenuAnchor(null); setSlotMenuMap(null); }}
        slotProps={{ paper: { sx: { minWidth: 140 } } }}
      >
        {tournamentSlots.map((s) => (
          <MenuItem
            key={s}
            selected={slotMenuMap?.slot_type === s}
            onClick={async () => {
              if (!slotMenuMap || slotMenuMap.slot_type === s) {
                setSlotMenuAnchor(null);
                setSlotMenuMap(null);
                return;
              }
              try {
                const updated = await updateMap(tournament.abbreviation, slotMenuMap.id, { slot_type: s });
                setTournament((prev) => ({
                  ...prev,
                  stages: prev.stages?.map((stage) => ({
                    ...stage,
                    maps: stage.maps?.map((m) => m.id === updated.id ? { ...m, ...updated } : m),
                  })),
                }));
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update slot');
              }
              setSlotMenuAnchor(null);
              setSlotMenuMap(null);
            }}
            sx={{ fontSize: 13, gap: 1.5 }}
          >
            <SlotBadge label={s} color={getSlotColor(s, slotConfigs)} />
            {getSlotLabel(s, slotConfigs)}
          </MenuItem>
        ))}
      </Menu>

      {/* Edit Map Dialog */}
      <Dialog open={!!editingMap} onClose={() => setEditingMap(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Map</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Slot Type</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
                {tournamentSlots.map((s) => (
                  <Chip
                    key={s}
                    label={`${s} — ${getSlotLabel(s, slotConfigs)}`}
                    size="small"
                    onClick={() => setEditSlot(s)}
                    sx={{
                      fontWeight: 'bold', cursor: 'pointer',
                      backgroundColor: editSlot === s ? getSlotColor(s, slotConfigs) : 'action.hover',
                      color: editSlot === s ? 'white' : 'text.primary',
                      border: editSlot === s ? 'none' : '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Mod</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${MODS.length}, 1fr)`, gap: 0.75 }}>
                {MODS.map((m) => (
                  <Chip
                    key={m}
                    label={m}
                    size="small"
                    icon={modIcons[m] ? <Box component="img" src={modIcons[m]} sx={(theme) => ({ width: 18, height: 18, filter: editMod === m || theme.palette.mode === 'dark' ? 'none' : 'invert(1)' })} /> : undefined}
                    onClick={() => setEditMod(m)}
                    sx={{
                      fontWeight: 'bold', cursor: 'pointer',
                      backgroundColor: editMod === m ? (modColors[m] || '#666') : 'action.hover',
                      color: editMod === m ? 'white' : 'text.primary',
                      border: editMod === m ? 'none' : '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditingMap(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={editSaving}
            onClick={async () => {
              if (!editingMap) return;
              setEditSaving(true);
              try {
                const updated = await updateMap(tournament.abbreviation, editingMap.id, {
                  slot_type: editSlot,
                  mod: editMod,
                });
                setTournament((prev) => ({
                  ...prev,
                  stages: prev.stages?.map((stage) => ({
                    ...stage,
                    maps: stage.maps?.map((m) => m.id === updated.id ? { ...m, ...updated } : m),
                  })),
                }));
                setEditingMap(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update map');
              } finally {
                setEditSaving(false);
              }
            }}
          >
            {editSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

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

            {/* Check Library */}
            <Box>
              <Button
                size="small"
                variant="text"
                startIcon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  const opening = !showLibrary;
                  setShowLibrary(opening);
                  if (opening && !libraryData) {
                    setLibraryLoading(true);
                    browsePacks(1, 10, 'recent')
                      .then((data) => { setLibraryData(data); setLibraryPage(1); })
                      .catch(() => {})
                      .finally(() => setLibraryLoading(false));
                  }
                }}
                sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary' }}
              >
                {showLibrary ? 'Hide Library' : 'Check Library'}
              </Button>
              {showLibrary && (
                <Box sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  {/* Search */}
                  <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Search packs..."
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setLibraryLoading(true);
                          browsePacks(1, 10, 'recent', librarySearch)
                            .then((data) => { setLibraryData(data); setLibraryPage(1); })
                            .catch(() => {})
                            .finally(() => setLibraryLoading(false));
                        }
                      }}
                      sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: 13 } }}
                    />
                  </Box>
                  <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
                    {libraryLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={20} />
                      </Box>
                    ) : !libraryData || libraryData.packs.length === 0 ? (
                      <Typography variant="body2" color="text.disabled" sx={{ p: 2, textAlign: 'center' }}>
                        No packs found
                      </Typography>
                    ) : (
                      <>
                        {libraryData.packs.map((pack) => (
                          <Box key={pack.id}>
                            <Box
                              onClick={() => {
                                if (expandedPack?.share_code === pack.share_code) {
                                  setExpandedPack(null);
                                  return;
                                }
                                setExpandingPackCode(pack.share_code);
                                getPack(pack.share_code)
                                  .then(setExpandedPack)
                                  .catch(() => {})
                                  .finally(() => setExpandingPackCode(null));
                              }}
                              sx={{
                                px: 1.5, py: 1, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 1,
                                bgcolor: 'action.hover',
                                borderBottom: '1px solid', borderColor: 'divider',
                                '&:hover': { opacity: 0.8 },
                              }}
                            >
                              <FolderOpenIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" fontWeight="bold" sx={{ flex: 1 }}>
                                {pack.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {pack.beatmap_count} maps
                              </Typography>
                              {expandingPackCode === pack.share_code && <CircularProgress size={14} />}
                            </Box>
                            {expandedPack?.share_code === pack.share_code && expandedPack.beatmaps.map((bm) => (
                              <Box
                                key={bm.id}
                                onClick={() => {
                                  setMapInput(bm.beatmapset_id.toString());
                                  setShowLibrary(false);
                                }}
                                sx={{
                                  px: 1.5, py: 0.75, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 1,
                                  '&:hover': { bgcolor: 'action.hover' },
                                  borderBottom: '1px solid', borderColor: 'divider',
                                }}
                              >
                                <Box
                                  component="img"
                                  src={`https://assets.ppy.sh/beatmaps/${bm.beatmapset_id}/covers/list.jpg`}
                                  sx={{ width: 36, height: 36, borderRadius: 0.5, objectFit: 'cover', flexShrink: 0 }}
                                />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" noWrap>{bm.artist} - {bm.title}</Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {bm.difficulty_name && `[${bm.difficulty_name}]`} {bm.star_rating && ` ★ ${bm.star_rating.toFixed(2)}`}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </>
                    )}
                  </Box>
                  {/* Pagination */}
                  {libraryData && libraryData.total > 10 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Button
                        size="small"
                        disabled={libraryPage <= 1 || libraryLoading}
                        onClick={() => {
                          const p = libraryPage - 1;
                          setLibraryLoading(true);
                          browsePacks(p, 10, 'recent', librarySearch)
                            .then((data) => { setLibraryData(data); setLibraryPage(p); })
                            .catch(() => {})
                            .finally(() => setLibraryLoading(false));
                        }}
                        sx={{ fontSize: 11, minWidth: 0 }}
                      >
                        Prev
                      </Button>
                      <Typography variant="caption" sx={{ lineHeight: '30px' }}>
                        {libraryPage} / {Math.ceil(libraryData.total / 10)}
                      </Typography>
                      <Button
                        size="small"
                        disabled={libraryPage >= Math.ceil(libraryData.total / 10) || libraryLoading}
                        onClick={() => {
                          const p = libraryPage + 1;
                          setLibraryLoading(true);
                          browsePacks(p, 10, 'recent', librarySearch)
                            .then((data) => { setLibraryData(data); setLibraryPage(p); })
                            .catch(() => {})
                            .finally(() => setLibraryLoading(false));
                        }}
                        sx={{ fontSize: 11, minWidth: 0 }}
                      >
                        Next
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

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
                        <Chip
                          label={`★ ${diff.star_rating.toFixed(2)}`}
                          size="small"
                          sx={{ height: 20, fontSize: 11, fontWeight: 'bold', bgcolor: 'black', color: 'white' }}
                        />
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                {/* Slot & Mod selection */}
                {selectedDiffIndex !== null && (
                  <>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">Slot Type</Typography>
                        <Button size="small" variant="text" onClick={() => { setAddMapOpen(false); setDetailTab('slots'); }} sx={{ fontSize: 11, textTransform: 'none', p: 0, minWidth: 0 }}>
                          Edit Slots
                        </Button>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
                        {tournamentSlots.map((s) => (
                          <Chip
                            key={s}
                            label={`${s} — ${getSlotLabel(s, slotConfigs)}`}
                            size="small"
                            onClick={() => setSelectedSlot(s)}
                            sx={{
                              fontWeight: 'bold', cursor: 'pointer',
                              backgroundColor: selectedSlot === s ? getSlotColor(s, slotConfigs) : 'action.hover',
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
                      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${MODS.length}, 1fr)`, gap: 0.75 }}>
                        {MODS.map((m) => (
                          <Chip
                            key={m}
                            label={m}
                            size="small"
                            icon={modIcons[m] ? <Box component="img" src={modIcons[m]} sx={(theme) => ({ width: 18, height: 18, filter: selectedMod === m || theme.palette.mode === 'dark' ? 'none' : 'invert(1)' })} /> : undefined}
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
          background: 'linear-gradient(0deg, rgba(132,169,140,0.15) 0%, rgba(132,169,140,0.03) 100%)',
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

      {/* Hidden file inputs (always in DOM) */}
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; if (f) { startCrop(f); setImageModal('banner'); } e.target.value = ''; }} style={{ display: 'none' }} />
      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; if (f) { startCrop(f); setImageModal('logo'); } e.target.value = ''; }} style={{ display: 'none' }} />

      {/* Image modal */}
      <Dialog open={!!imageModal} onClose={() => { setImageModal(null); setCropImage(null); }} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => { setImageModal(null); setCropImage(null); }}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
            size="small"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {cropImage ? (
            <Box sx={{ position: 'relative', width: '100%', height: imageModal === 'banner' ? 300 : 350 }}>
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={imageModal === 'banner' ? 4 : 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </Box>
          ) : (
            <>
              {imageModal === 'banner' && (
                <Box
                  component="img"
                  src={tournament.banner_url || placeholderBanner}
                  sx={{ width: '100%', display: 'block' }}
                />
              )}
              {imageModal === 'logo' && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <Box
                    component="img"
                    src={tournament.logo_url || placeholderLogo}
                    sx={{ maxWidth: 256, maxHeight: 256 }}
                  />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        {isOwner && (
          <DialogActions sx={{ px: 2, pb: 2 }}>
            {cropImage ? (
              <>
                <Button variant="outlined" size="small" onClick={() => setCropImage(null)}>
                  Cancel
                </Button>
                <Button variant="contained" size="small" onClick={applyCrop} disabled={cropUploading}>
                  {cropUploading ? 'Uploading…' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={async () => {
                    try {
                      const field = imageModal === 'banner' ? 'banner_url' : 'logo_url';
                      const updated = await updateTournament(tournament.abbreviation, { [field]: '' });
                      setTournament(updated);
                      onUpdated(updated);
                      setImageModal(null);
                    } catch (err) {
                      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to clear image' });
                    }
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => {
                    if (imageModal === 'banner') bannerInputRef.current?.click();
                    else logoInputRef.current?.click();
                  }}
                >
                  {imageModal === 'banner' ? 'Upload Banner' : 'Upload Logo'}
                </Button>
              </>
            )}
          </DialogActions>
        )}
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
