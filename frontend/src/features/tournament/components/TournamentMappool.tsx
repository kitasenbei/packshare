import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import type { StashBeatmap } from '../../../shared/types/beatmap';
import type { User } from '../../auth/api/auth';
import { getBeatmapset } from '../../auth/api/auth';
import type { Tournament, TournamentMap } from '../api/tournaments';
import { getTournament, addMapToStage, removeMap, updateTournament } from '../api/tournaments';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import RemoveButton from '../../../shared/components/RemoveButton';
import ImageUpload from '../../../shared/components/ImageUpload';
import { STASH_STORAGE_KEY } from '../../../shared/utils/stash';

// Slot colors (map categories)
const slotColors: Record<string, string> = {
  RC: '#4a90d9',
  LN: '#4ad98f',
  HB: '#b44ad9',
  TECH: '#f5c842',
  JACK: '#d94a4a',
  SPEED: '#4ad9d9',
  STAM: '#d9a44a',
  SV: '#ff66ab',
  TB: '#ff4444',
};

// Mod colors (game modifiers)
const modColors: Record<string, string> = {
  NM: '#666666',
  HD: '#f5c842',
  HR: '#d94a4a',
  DT: '#b44ad9',
  FM: '#4ad98f',
  FL: '#1a1a3e',
};

const modIcons: Record<string, string> = {
  NM: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-no-mod.svg',
  HD: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-hidden.svg',
  HR: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-hard-rock.svg',
  DT: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-double-time.svg',
  FL: 'https://raw.githubusercontent.com/ppy/osu-web/master/public/images/badges/mods/mod-flashlight.svg',
};

const colorPalette = ['#4a90d9', '#4ad98f', '#b44ad9', '#f5c842', '#d94a4a', '#4ad9d9', '#d9a44a', '#ff66ab', '#ff4444', '#666666'];

const slots = ['RC', 'LN', 'HB', 'TECH', 'JACK', 'SPEED', 'STAM', 'SV', 'TB'];
const slotLabels: Record<string, string> = {
  RC: 'Rice', LN: 'Long Notes', HB: 'Hybrid', TECH: 'Technical',
  JACK: 'Jack', SPEED: 'Speed', STAM: 'Stamina', SV: 'Slider Velocity', TB: 'Tiebreaker',
};


interface TournamentMappoolProps {
  abbreviation?: string;
  user: User | null;
}

export default function TournamentMappool({ abbreviation, user }: TournamentMappoolProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStage, setCurrentStage] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [stash, setStash] = useState<StashBeatmap[]>([]);
  const [customSlotColors, setCustomSlotColors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [fetchedDiffs, setFetchedDiffs] = useState<{ beatmap_id: number; difficulty_name: string; star_rating: number; keys: number }[]>([]);
  const [fetchedMeta, setFetchedMeta] = useState<{ beatmapset_id: number; title: string; artist: string; creator: string } | null>(null);

  // Pending maps state (new map-first flow)
  interface PendingMap {
    id: string;
    beatmapsetId: number;
    title: string;
    artist: string;
    creator: string;
    keys: number;
    starRating: number;
    difficultyName: string;
    slot: string;
    mods: string[];
    customSlotColor?: string;
    adding: boolean;
  }
  const [pendingMaps, setPendingMaps] = useState<PendingMap[]>([]);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'slot' | 'mod' | null>(null);
  const [pickerSlot, setPickerSlot] = useState('RC');
  const [pickerMods, setPickerMods] = useState<string[]>(['NM']);
  const [pickerCustomSlot, setPickerCustomSlot] = useState('');
  const [pickerCustomSlotColor, setPickerCustomSlotColor] = useState('#4a90d9');
  const pendingIdCounter = useRef(0);

  // Inline editing state
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [bannerUploadOpen, setBannerUploadOpen] = useState(false);
  const [logoUploadOpen, setLogoUploadOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abbreviation) return;
    loadTournament();
  }, [abbreviation]);

  const loadTournament = async () => {
    try {
      const data = await getTournament(abbreviation!);
      setTournament(data);
      if (data.stages && data.stages.length > 0 && currentStage === null) {
        setCurrentStage(data.stages[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  // Load stash when dialog opens
  useEffect(() => {
    if (addDialogOpen) {
      const saved = localStorage.getItem(STASH_STORAGE_KEY);
      if (saved) {
        try { setStash(JSON.parse(saved)); } catch { setStash([]); }
      }
    }
  }, [addDialogOpen]);

  // Focus name input when editing starts
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const stages = tournament?.stages || [];
  const activeStage = stages.find(s => s.id === currentStage);
  const maps = activeStage?.maps || [];
  const isOwner = tournament?.user?.osu_id === user?.osu_id;

  // Group maps by slot
  const groupedMaps = maps.reduce((acc, map) => {
    if (!acc[map.slot_type]) acc[map.slot_type] = [];
    acc[map.slot_type].push(map);
    return acc;
  }, {} as Record<string, TournamentMap[]>);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setSnackbar({ open: true, message: 'Link copied!' });
  };

  // Inline editing handlers
  const handleStartEditName = () => {
    if (!isOwner || !tournament) return;
    setEditNameValue(tournament.name);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!abbreviation || !tournament) return;
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed === tournament.name) {
      setEditingName(false);
      return;
    }
    try {
      const updated = await updateTournament(abbreviation, { name: trimmed });
      setTournament(updated);
      setSnackbar({ open: true, message: 'Name updated' });
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update name' });
    }
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditingName(false);
    }
  };

  const handleBannerUpload = async (url: string | null) => {
    if (!abbreviation || !tournament) return;
    try {
      const updated = await updateTournament(abbreviation, { banner_url: url || undefined });
      setTournament(updated);
      setBannerUploadOpen(false);
      setSnackbar({ open: true, message: url ? 'Banner updated' : 'Banner removed' });
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update banner' });
    }
  };

  const handleLogoUpload = async (url: string | null) => {
    if (!abbreviation || !tournament) return;
    try {
      const updated = await updateTournament(abbreviation, { logo_url: url || undefined });
      setTournament(updated);
      setLogoUploadOpen(false);
      setSnackbar({ open: true, message: url ? 'Logo updated' : 'Logo removed' });
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update logo' });
    }
  };

  const allSlotColors = { ...slotColors, ...customSlotColors };

  const handleOpenAddDialog = () => {
    setUrlInput('');
    setUrlError('');
    setFetchedDiffs([]);
    setFetchedMeta(null);
    setSelectedDiffIndex(null);
    setPendingMaps([]);
    setEditingMapId(null);
    setEditingField(null);
    setAddDialogOpen(true);
  };

  const extractBeatmapsetId = (input: string): string | null => {
    if (/^\d+$/.test(input.trim())) return input.trim();
    const match = input.match(/osu\.ppy\.sh\/beatmapsets\/(\d+)/);
    if (match) return match[1];
    const nerinyanMatch = input.match(/nerinyan\.moe.*?(\d+)/);
    if (nerinyanMatch) return nerinyanMatch[1];
    return null;
  };

  const makePendingId = () => {
    pendingIdCounter.current += 1;
    return `pending-${Date.now()}-${pendingIdCounter.current}`;
  };

  const pushPendingMap = useCallback((
    beatmapsetId: number, title: string, artist: string, creator: string,
    keys: number, starRating: number, difficultyName: string,
  ) => {
    setPendingMaps(prev => [...prev, {
      id: makePendingId(),
      beatmapsetId, title, artist, creator, keys, starRating, difficultyName,
      slot: 'RC', mods: ['NM'], adding: false,
    }]);
  }, []);

  const handleFetchBeatmap = async (inputOverride?: string) => {
    const id = extractBeatmapsetId(inputOverride || urlInput);
    if (!id) {
      setUrlError('Invalid beatmap ID or URL');
      return;
    }

    setUrlLoading(true);
    setUrlError('');
    setFetchedDiffs([]);
    setFetchedMeta(null);
    setSelectedDiffIndex(null);

    try {
      const beatmapset = await getBeatmapset(parseInt(id));
      if (!beatmapset) {
        setUrlError('Beatmap not found');
        setUrlLoading(false);
        return;
      }

      if (beatmapset.beatmaps.length === 1) {
        const diff = beatmapset.beatmaps[0];
        pushPendingMap(
          beatmapset.beatmapset_id, beatmapset.title, beatmapset.artist,
          beatmapset.creator, diff.keys, diff.star_rating, diff.difficulty_name,
        );
        setUrlInput('');
      } else {
        setFetchedDiffs(beatmapset.beatmaps.map(b => ({
          beatmap_id: b.beatmap_id,
          difficulty_name: b.difficulty_name,
          star_rating: b.star_rating,
          keys: b.keys,
        })));
        setFetchedMeta({
          beatmapset_id: beatmapset.beatmapset_id,
          title: beatmapset.title,
          artist: beatmapset.artist,
          creator: beatmapset.creator,
        });
      }
    } catch {
      setUrlError('Failed to fetch beatmap');
    }

    setUrlLoading(false);
  };

  const handleAddSelectedDiff = () => {
    if (selectedDiffIndex === null || !fetchedMeta) return;
    const diff = fetchedDiffs[selectedDiffIndex];
    pushPendingMap(
      fetchedMeta.beatmapset_id, fetchedMeta.title, fetchedMeta.artist,
      fetchedMeta.creator, diff.keys, diff.star_rating, diff.difficulty_name,
    );
    setFetchedDiffs([]);
    setFetchedMeta(null);
    setSelectedDiffIndex(null);
    setUrlInput('');
  };

  const handleSubmitPending = async (pendingId: string) => {
    const pm = pendingMaps.find(m => m.id === pendingId);
    if (!pm || !abbreviation || !currentStage) return;

    setPendingMaps(prev => prev.map(m => m.id === pendingId ? { ...m, adding: true } : m));

    const resolvedSlotValue = pm.slot;

    try {
      await addMapToStage(abbreviation, currentStage, {
        slot_type: resolvedSlotValue,
        mod: pm.mods.join(''),
        beatmapset_id: pm.beatmapsetId,
        title: pm.title,
        artist: pm.artist,
        creator: pm.creator,
        keys: pm.keys,
        star_rating: pm.starRating,
        difficulty_name: pm.difficultyName,
      });
      // Persist custom slot color for display
      if (pm.customSlotColor && resolvedSlotValue) {
        setCustomSlotColors(prev => ({ ...prev, [resolvedSlotValue]: pm.customSlotColor! }));
      }
      const slotLabel = slotLabels[resolvedSlotValue] || resolvedSlotValue;
      setSnackbar({ open: true, message: `Added to ${slotLabel} (${pm.mods.join('')})` });
      setPendingMaps(prev => prev.filter(m => m.id !== pendingId));
      loadTournament();
    } catch (err) {
      setPendingMaps(prev => prev.map(m => m.id === pendingId ? { ...m, adding: false } : m));
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to add map' });
    }
  };

  const handleRemovePending = (pendingId: string) => {
    setPendingMaps(prev => prev.filter(m => m.id !== pendingId));
    if (editingMapId === pendingId) {
      setEditingMapId(null);
      setEditingField(null);
    }
  };

  const handleOpenPicker = (mapId: string, field: 'slot' | 'mod') => {
    if (editingMapId === mapId && editingField === field) {
      // Toggle off
      setEditingMapId(null);
      setEditingField(null);
      return;
    }
    const pm = pendingMaps.find(m => m.id === mapId);
    if (!pm) return;
    setEditingMapId(mapId);
    setEditingField(field);
    if (field === 'slot') {
      const isCustom = !slots.includes(pm.slot);
      setPickerSlot(isCustom ? '__custom__' : pm.slot);
      setPickerCustomSlot(isCustom ? pm.slot : '');
      setPickerCustomSlotColor(pm.customSlotColor || '#4a90d9');
    } else {
      setPickerMods([...pm.mods]);
    }
  };

  const handleTogglePickerMod = (mod: string) => {
    setPickerMods(prev => {
      // NM and FM are exclusive checkboxes
      if (mod === 'NM') return ['NM'];
      if (mod === 'FM') return prev.includes('FM') ? ['NM'] : ['FM'];
      // Clicking a pill while FM is active: ignore
      if (prev.includes('FM')) return prev;
      // Clicking a pill clears NM automatically
      const real = prev.filter(m => m !== 'NM');
      if (real.includes(mod)) {
        const result = real.filter(m => m !== mod);
        return result.length === 0 ? ['NM'] : result;
      }
      return [...real, mod];
    });
  };

  const handleConfirmPicker = () => {
    if (!editingMapId || !editingField) return;
    setPendingMaps(prev => prev.map(m => {
      if (m.id !== editingMapId) return m;
      if (editingField === 'slot') {
        const newSlot = pickerSlot === '__custom__' ? pickerCustomSlot.trim().toUpperCase() : pickerSlot;
        return {
          ...m,
          slot: newSlot || 'RC',
          customSlotColor: pickerSlot === '__custom__' ? pickerCustomSlotColor : undefined,
        };
      } else {
        return { ...m, mods: [...pickerMods] };
      }
    }));
    setEditingMapId(null);
    setEditingField(null);
  };

  const handleCancelPicker = () => {
    setEditingMapId(null);
    setEditingField(null);
  };

  const handleStashClick = (beatmap: StashBeatmap) => {
    pushPendingMap(
      beatmap.id, beatmap.title, beatmap.artist, beatmap.creator,
      beatmap.keys || 4, 0, '',
    );
  };

  const handleSubmitAllPending = async () => {
    const toSubmit = pendingMaps.filter(m => !m.adding);
    if (toSubmit.length === 0 || !abbreviation || !currentStage) return;

    setPendingMaps(prev => prev.map(m => ({ ...m, adding: true })));

    let added = 0;
    for (const pm of toSubmit) {
      try {
        await addMapToStage(abbreviation, currentStage, {
          slot_type: pm.slot,
          mod: pm.mods.join(''),
          beatmapset_id: pm.beatmapsetId,
          title: pm.title,
          artist: pm.artist,
          creator: pm.creator,
          keys: pm.keys,
          star_rating: pm.starRating,
          difficulty_name: pm.difficultyName,
        });
        if (pm.customSlotColor) {
          setCustomSlotColors(prev => ({ ...prev, [pm.slot]: pm.customSlotColor! }));
        }
        setPendingMaps(prev => prev.filter(m => m.id !== pm.id));
        added++;
      } catch {
        setPendingMaps(prev => prev.map(m => m.id === pm.id ? { ...m, adding: false } : m));
      }
    }

    if (added > 0) {
      setSnackbar({ open: true, message: `Added ${added} map${added !== 1 ? 's' : ''} to pool` });
      loadTournament();
    }
  };

  const handleRemoveMap = async (mapId: number) => {
    if (!abbreviation) return;
    try {
      await removeMap(abbreviation, mapId);
      setSnackbar({ open: true, message: 'Map removed from mappool' });
      loadTournament();
    } catch {
      setSnackbar({ open: true, message: 'Failed to remove map' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0d0d1a' }}>
        <CircularProgress sx={{ color: '#ff66ab' }} />
      </Box>
    );
  }

  if (error || !tournament) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0d0d1a', color: 'white' }}>
        <Typography>{error || 'Tournament not found'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0d0d1a', color: 'white' }}>
      {/* Banner Header */}
      <Box
        sx={{
          position: 'relative',
          background: tournament.banner_url
            ? `linear-gradient(to bottom, rgba(13,13,26,0.2) 0%, rgba(13,13,26,0.7) 40%, #0d0d1a 100%), url(${tournament.banner_url}) center / cover no-repeat`
            : 'linear-gradient(to bottom, rgba(255,102,171,0.2), #0d0d1a)',
          px: 4,
          pt: 5,
          pb: 2,
        }}
      >
        {/* Owner banner edit overlay */}
        {isOwner && (
          <Button
            size="small"
            startIcon={tournament.banner_url ? <EditIcon /> : <AddPhotoAlternateIcon />}
            onClick={() => setBannerUploadOpen(true)}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: 'rgba(255,255,255,0.7)',
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' },
              textTransform: 'none',
              fontSize: 12,
            }}
          >
            {tournament.banner_url ? 'Change Banner' : 'Add Banner'}
          </Button>
        )}

        <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Stack direction="row" spacing={3} alignItems="center">
              {/* Logo area */}
              {tournament.logo_url ? (
                <Box
                  sx={{ position: 'relative', cursor: isOwner ? 'pointer' : 'default' }}
                  onClick={isOwner ? () => setLogoUploadOpen(true) : undefined}
                >
                  <Avatar
                    src={tournament.logo_url}
                    sx={{
                      width: 80,
                      height: 80,
                      border: '3px solid #ff66ab',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    }}
                  />
                  {isOwner && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <EditIcon sx={{ fontSize: 20 }} />
                    </Box>
                  )}
                </Box>
              ) : isOwner ? (
                <Box
                  onClick={() => setLogoUploadOpen(true)}
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    border: '2px dashed rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#ff66ab', backgroundColor: 'rgba(255,102,171,0.1)' },
                  }}
                >
                  <AddPhotoAlternateIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 28 }} />
                </Box>
              ) : null}

              <Box>
                {/* Editable tournament name */}
                {editingName ? (
                  <TextField
                    inputRef={nameInputRef}
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    variant="standard"
                    sx={{
                      '& .MuiInputBase-input': {
                        color: 'white',
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        lineHeight: 1.2,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        py: 0,
                      },
                      '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.3)' },
                      '& .MuiInput-underline:after': { borderBottomColor: '#ff66ab' },
                      minWidth: 300,
                    }}
                  />
                ) : (
                  <Typography
                    variant="h3"
                    onClick={isOwner ? handleStartEditName : undefined}
                    sx={{
                      fontWeight: 'bold',
                      textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                      cursor: isOwner ? 'pointer' : 'default',
                      '&:hover': isOwner ? {
                        outline: '1px dashed rgba(255,255,255,0.3)',
                        outlineOffset: 4,
                        borderRadius: 1,
                      } : {},
                    }}
                  >
                    {tournament.name}
                  </Typography>
                )}
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                  {activeStage ? `${activeStage.name} Mappool` : 'Mappool'}
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={1} alignItems="flex-end">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.3)', px: 2, py: 1, borderRadius: 2 }}>
                <Typography variant="body2">hosted on</Typography>
                <Typography sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  pack
                  <Box
                    component="span"
                    sx={{
                      backgroundColor: '#ff66ab',
                      px: 0.5,
                      py: 0.15,
                      borderRadius: 0.5,
                      ml: 0.5,
                      fontSize: 12,
                    }}
                  >
                    share
                  </Box>
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyLink}
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}
              >
                Copy Link
              </Button>
            </Stack>
          </Box>

          {/* Stage Tabs */}
          {stages.length > 0 && (
            <Tabs
              value={currentStage}
              onChange={(_, v) => setCurrentStage(v)}
              sx={{
                mt: 3,
                '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', textTransform: 'none', fontWeight: 'bold', fontSize: 16 },
                '& .Mui-selected': { color: 'white' },
                '& .MuiTabs-indicator': { backgroundColor: '#ff66ab', height: 3 },
              }}
            >
              {stages.map((s) => (
                <Tab key={s.id} label={s.name} value={s.id} />
              ))}
            </Tabs>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ maxWidth: 1200, margin: '0 auto', px: 4, py: 2, display: 'flex', gap: 2 }}>
        {maps.length > 0 && (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
          >
            Download All ({maps.length} maps)
          </Button>
        )}
        {isOwner && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{
              borderColor: '#ff66ab',
              color: '#ff66ab',
              '&:hover': { borderColor: '#ff4499', backgroundColor: 'rgba(255,102,171,0.1)' },
            }}
          >
            Add Maps
          </Button>
        )}
      </Box>

      {/* Mappool */}
      <Box sx={{ maxWidth: 1200, margin: '0 auto', px: 4, pb: 4 }}>
        {maps.length === 0 ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 4 }}>
            No maps in this mappool yet
          </Typography>
        ) : (
          Object.entries(groupedMaps).map(([slot, slotMaps]) => (
            <Box key={slot} sx={{ mb: 4 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    backgroundColor: allSlotColors[slot] || '#666',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 'bold',
                  }}
                >
                  {slotLabels[slot] || slot}
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {slotMaps.length} map{slotMaps.length !== 1 ? 's' : ''}
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {slotMaps.map((map) => (
                  <BeatmapRow
                    key={map.id}
                    title={map.title}
                    artist={map.artist}
                    creator={map.creator}
                    creatorPrefix="mapped by"
                    beatmapsetId={map.beatmapset_id}
                    difficultyName={map.difficulty_name}
                    starRating={map.star_rating}
                    starRatingSeparate
                    variant="dark"
                    density="compact"
                    slotBadge={{ label: `${map.slot_type}${map.slot_number}`, color: allSlotColors[map.slot_type] || '#666' }}
                    modChips={map.mod !== 'NM' ? (map.mod.match(/.{2}/g) || [map.mod]).map(m => ({ label: m, color: modColors[m] || '#666', icon: modIcons[m] })) : undefined}
                    actions={
                      <>
                        <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${map.beatmapset_id}`, '_blank')} variant="dark" />
                        <DownloadButton
                          downloadUrl={`https://api.nerinyan.moe/d/${map.beatmapset_id}`}
                          downloadName={`${map.artist} - ${map.title}`}
                          stashData={{
                            id: map.beatmapset_id,
                            beatmapsetId: map.beatmapset_id,
                            title: map.title,
                            artist: map.artist,
                            creator: map.creator,
                            source: 'download',
                          }}
                        />
                        {isOwner && (
                          <RemoveButton onClick={() => handleRemoveMap(map.id)} />
                        )}
                      </>
                    }
                  />
                ))}
              </Stack>
            </Box>
          ))
        )}
      </Box>

      {/* Banner Upload Dialog */}
      <Dialog open={bannerUploadOpen} onClose={() => setBannerUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{tournament.banner_url ? 'Change Banner' : 'Add Banner'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <ImageUpload
              label="Banner Image"
              value={tournament.banner_url || undefined}
              onChange={handleBannerUpload}
              aspectRatio="4/1"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBannerUploadOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Logo Upload Dialog */}
      <Dialog open={logoUploadOpen} onClose={() => setLogoUploadOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{tournament.logo_url ? 'Change Logo' : 'Add Logo'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <ImageUpload
              label="Tournament Logo"
              value={tournament.logo_url || undefined}
              onChange={handleLogoUpload}
              aspectRatio="1/1"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoUploadOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Maps Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <InventoryIcon sx={{ color: '#ff66ab' }} />
            <span>Add Maps</span>
          </Stack>
          <IconButton size="small" onClick={() => setAddDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* URL input */}
          <Box sx={{ mb: 3 }}>
            {fetchedDiffs.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">Select a difficulty:</Typography>
                {fetchedDiffs.map((diff, i) => (
                  <Box
                    key={diff.beatmap_id}
                    onClick={() => setSelectedDiffIndex(i)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selectedDiffIndex === i ? '#ff66ab' : 'transparent',
                      backgroundColor: selectedDiffIndex === i ? 'rgba(255,102,171,0.08)' : 'transparent',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                    }}
                  >
                    {fetchedMeta && (
                      <Box
                        component="img"
                        src={`https://assets.ppy.sh/beatmaps/${fetchedMeta.beatmapset_id}/covers/list.jpg`}
                        alt=""
                        sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{diff.difficulty_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {diff.keys}K · {diff.star_rating.toFixed(2)}*
                      </Typography>
                    </Box>
                  </Box>
                ))}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => { setFetchedDiffs([]); setFetchedMeta(null); setUrlInput(''); }}>Back</Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={selectedDiffIndex === null}
                    onClick={handleAddSelectedDiff}
                    sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
                  >
                    Add to Pending
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <TextField
                size="small"
                fullWidth
                placeholder="Paste a beatmapset URL or ID..."
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted && extractBeatmapsetId(pasted)) {
                    e.preventDefault();
                    setUrlInput(pasted);
                    setUrlError('');
                    handleFetchBeatmap(pasted);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && urlInput.trim() && !urlLoading && handleFetchBeatmap()}
                error={!!urlError}
                helperText={urlError}
                disabled={urlLoading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        {urlLoading ? <CircularProgress size={18} /> : <LinkIcon fontSize="small" />}
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
          </Box>

          {/* Pending Maps */}
          {pendingMaps.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Pending Maps ({pendingMaps.length})
                </Typography>
                {pendingMaps.length > 1 && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSubmitAllPending}
                    disabled={pendingMaps.some(m => m.adding)}
                    sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' }, textTransform: 'none' }}
                  >
                    Add All
                  </Button>
                )}
              </Stack>
              <Stack spacing={0}>
                {pendingMaps.map((pm) => {
                  const slotColor = pm.customSlotColor || allSlotColors[pm.slot] || '#666';
                  const isEditing = editingMapId === pm.id;
                  return (
                    <Box key={pm.id}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 1,
                          px: 1.5,
                          borderRadius: 1,
                          backgroundColor: isEditing ? 'rgba(255,102,171,0.05)' : 'transparent',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' },
                        }}
                      >
                        {/* Thumbnail */}
                        <Box
                          component="img"
                          src={`https://assets.ppy.sh/beatmaps/${pm.beatmapsetId}/covers/list.jpg`}
                          alt=""
                          sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
                        />
                        {/* Slot chip */}
                        <Chip
                          label={pm.slot}
                          size="small"
                          onClick={() => handleOpenPicker(pm.id, 'slot')}
                          sx={{
                            backgroundColor: slotColor,
                            color: 'white',
                            fontWeight: 'bold',
                            minWidth: 40,
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.85 },
                          }}
                        />
                        {/* Mod chips */}
                        {pm.mods.map(mod => (
                          <Chip
                            key={mod}
                            label={mod}
                            size="small"
                            icon={modIcons[mod] ? <Box component="img" src={modIcons[mod]} alt="" sx={{ width: 28, height: 28 }} /> : undefined}
                            onClick={() => handleOpenPicker(pm.id, 'mod')}
                            sx={{
                              backgroundColor: modColors[mod] || '#666',
                              color: 'white',
                              fontWeight: 'bold',
                              minWidth: 32,
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.85 },
                            }}
                          />
                        ))}
                        {/* Map info */}
                        <Box sx={{ flex: 1, minWidth: 0, ml: 0.5 }}>
                          <Typography variant="body2" noWrap fontWeight={500}>
                            {pm.artist} - {pm.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {pm.difficultyName && `[${pm.difficultyName}] `}
                            {pm.keys > 0 && `${pm.keys}K`}
                            {pm.starRating > 0 && ` · ${pm.starRating.toFixed(2)}*`}
                          </Typography>
                        </Box>
                        {/* Delete button */}
                        <IconButton
                          size="small"
                          onClick={() => handleRemovePending(pm.id)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        {/* Add button */}
                        <IconButton
                          size="small"
                          onClick={() => handleSubmitPending(pm.id)}
                          disabled={pm.adding}
                          sx={{
                            color: '#ff66ab',
                            backgroundColor: 'rgba(255,102,171,0.1)',
                            '&:hover': { backgroundColor: 'rgba(255,102,171,0.2)' },
                          }}
                        >
                          {pm.adding ? <CircularProgress size={18} color="inherit" /> : <AddIcon fontSize="small" />}
                        </IconButton>
                      </Box>

                      {/* Inline picker panel */}
                      {isEditing && editingField === 'slot' && (
                        <Box sx={{ mx: 1.5, mb: 1, p: 2, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            Select slot
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                            {slots.map(slot => (
                              <Chip
                                key={slot}
                                label={slot}
                                size="small"
                                onClick={() => setPickerSlot(slot)}
                                sx={{
                                  backgroundColor: pickerSlot === slot ? (allSlotColors[slot] || '#666') : 'transparent',
                                  color: pickerSlot === slot ? 'white' : 'text.primary',
                                  border: '1px solid',
                                  borderColor: pickerSlot === slot ? 'transparent' : 'divider',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  '&:hover': { opacity: 0.85 },
                                }}
                              />
                            ))}
                            <Chip
                              label="Custom..."
                              size="small"
                              onClick={() => setPickerSlot('__custom__')}
                              icon={<EditIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                backgroundColor: pickerSlot === '__custom__' ? 'action.selected' : 'transparent',
                                border: '1px solid',
                                borderColor: pickerSlot === '__custom__' ? 'transparent' : 'divider',
                                cursor: 'pointer',
                              }}
                            />
                          </Box>
                          {pickerSlot === '__custom__' && (
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                              <TextField
                                size="small"
                                label="Slot Name"
                                value={pickerCustomSlot}
                                onChange={(e) => setPickerCustomSlot(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                placeholder="e.g. ACC"
                                sx={{ width: 120 }}
                              />
                              {pickerCustomSlot && (
                                <Chip
                                  label={pickerCustomSlot}
                                  size="small"
                                  sx={{ backgroundColor: pickerCustomSlotColor, color: 'white', fontWeight: 'bold', minWidth: 40 }}
                                />
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                {colorPalette.map(color => (
                                  <Box
                                    key={color}
                                    onClick={() => setPickerCustomSlotColor(color)}
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: '50%',
                                      backgroundColor: color,
                                      cursor: 'pointer',
                                      border: '2px solid',
                                      borderColor: pickerCustomSlotColor === color ? 'white' : 'transparent',
                                      outline: pickerCustomSlotColor === color ? `2px solid ${color}` : 'none',
                                      transition: 'all 0.15s',
                                      '&:hover': { transform: 'scale(1.15)' },
                                    }}
                                  />
                                ))}
                                <TextField
                                  size="small"
                                  value={pickerCustomSlotColor}
                                  onChange={(e) => {
                                    let v = e.target.value;
                                    if (!v.startsWith('#')) v = '#' + v;
                                    setPickerCustomSlotColor(v.slice(0, 7));
                                  }}
                                  sx={{
                                    width: 85,
                                    ml: 0.5,
                                    '& .MuiInputBase-input': { fontSize: 11, py: 0.5, px: 1, fontFamily: 'monospace' },
                                  }}
                                  slotProps={{
                                    input: {
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: pickerCustomSlotColor, border: '1px solid rgba(0,0,0,0.2)' }} />
                                        </InputAdornment>
                                      ),
                                    },
                                  }}
                                />
                              </Box>
                            </Stack>
                          )}
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={handleCancelPicker}>Cancel</Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckIcon />}
                              onClick={handleConfirmPicker}
                              disabled={pickerSlot === '__custom__' && !pickerCustomSlot.trim()}
                              sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
                            >
                              OK
                            </Button>
                          </Stack>
                        </Box>
                      )}

                      {isEditing && editingField === 'mod' && (
                        <Box sx={{ mx: 1.5, mb: 1, p: 2, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            Select mods
                          </Typography>
                          {(() => {
                            const isNM = pickerMods.includes('NM');
                            const isFM = pickerMods.includes('FM');
                            const pillsDisabled = isNM || isFM;
                            return (
                              <>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1, alignItems: 'center' }}>
                                  {['HD', 'HR', 'DT', 'FL'].map(mod => {
                                    const isActive = !pillsDisabled && pickerMods.includes(mod);
                                    return (
                                      <Chip
                                        key={mod}
                                        label={mod}
                                        size="small"
                                        icon={modIcons[mod] ? <Box component="img" src={modIcons[mod]} alt="" sx={{ width: 28, height: 28, opacity: pillsDisabled ? 0.4 : 1 }} /> : undefined}
                                        onClick={() => handleTogglePickerMod(mod)}
                                        sx={{
                                          backgroundColor: isActive ? (modColors[mod] || '#666') : '#555',
                                          color: 'white',
                                          border: '2px solid',
                                          borderColor: isActive ? 'white' : 'transparent',
                                          fontWeight: 'bold',
                                          cursor: pillsDisabled ? 'not-allowed' : 'pointer',
                                          opacity: pillsDisabled ? 0.4 : 1,
                                          '&:hover': { opacity: pillsDisabled ? 0.4 : 0.85 },
                                        }}
                                      />
                                    );
                                  })}
                                </Box>
                                <Stack sx={{ mb: 1 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={isNM}
                                        onChange={() => handleTogglePickerMod('NM')}
                                        size="small"
                                        sx={{ color: 'text.secondary', '&.Mui-checked': { color: modColors.NM } }}
                                      />
                                    }
                                    label="No Mod"
                                    sx={{ '& .MuiFormControlLabel-label': { fontSize: 13, color: 'text.secondary' } }}
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={isFM}
                                        onChange={() => handleTogglePickerMod('FM')}
                                        size="small"
                                        sx={{ color: 'text.secondary', '&.Mui-checked': { color: modColors.FM } }}
                                      />
                                    }
                                    label="Free Mod — players choose their own mods"
                                    sx={{ '& .MuiFormControlLabel-label': { fontSize: 13, color: 'text.secondary' } }}
                                  />
                                </Stack>
                              </>
                            );
                          })()}
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={handleCancelPicker}>Cancel</Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckIcon />}
                              onClick={handleConfirmPicker}
                              sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
                            >
                              OK
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}

          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              or select from stash
            </Typography>
          </Divider>

          {stash.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">Your stash is empty</Typography>
              <Typography variant="body2" color="text.secondary">
                Save maps from shared packs or the Explore page first
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {stash.map((beatmap) => {
                const alreadyInPool = maps.some(m => m.beatmapset_id === beatmap.id);
                const alreadyPending = pendingMaps.some(m => m.beatmapsetId === beatmap.id);
                return (
                  <BeatmapRow
                    key={beatmap.id}
                    title={beatmap.title}
                    artist={beatmap.artist}
                    keys={beatmap.keys}
                    creator={beatmap.creator}
                    bpm={beatmap.bpm}
                    beatmapsetId={beatmap.id}
                    density="compact"
                    statusChip={alreadyInPool ? { label: 'Already in pool' } : alreadyPending ? { label: 'Pending' } : undefined}
                    onClick={!alreadyInPool && !alreadyPending ? () => handleStashClick(beatmap) : undefined}
                    sx={{
                      cursor: alreadyInPool || alreadyPending ? 'not-allowed' : 'pointer',
                      opacity: alreadyInPool ? 0.5 : alreadyPending ? 0.7 : 1,
                      '&:hover': {
                        backgroundColor: alreadyInPool || alreadyPending ? 'transparent' : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success"
          sx={{ backgroundColor: '#1a1a2e', color: 'white', border: 1, borderColor: '#ff66ab' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
