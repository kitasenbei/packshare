import { useState, useEffect, useRef } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import type { StashBeatmap } from '../types/beatmap';
import type { User } from '../api/auth';
import { getBeatmapset } from '../api/auth';
import type { Tournament, TournamentMap } from '../api/tournaments';
import { getTournament, addMapToStage, removeMap, updateTournament } from '../api/tournaments';
import BeatmapRow from './BeatmapRow';
import DownloadButton from './DownloadButton';
import OsuButton from './OsuButton';
import RemoveButton from './RemoveButton';
import ImageUpload from './ImageUpload';
import { STASH_STORAGE_KEY } from '../utils/stash';

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
  FL: '#333333',
};

const colorPalette = ['#4a90d9', '#4ad98f', '#b44ad9', '#f5c842', '#d94a4a', '#4ad9d9', '#d9a44a', '#ff66ab', '#ff4444', '#666666'];

const slots = ['RC', 'LN', 'HB', 'TECH', 'JACK', 'SPEED', 'STAM', 'SV', 'TB'];
const slotLabels: Record<string, string> = {
  RC: 'Rice', LN: 'Long Notes', HB: 'Hybrid', TECH: 'Technical',
  JACK: 'Jack', SPEED: 'Speed', STAM: 'Stamina', SV: 'Slider Velocity', TB: 'Tiebreaker',
};

const mods = ['NM', 'HD', 'HR', 'DT', 'FM', 'FL'];
const modLabels: Record<string, string> = {
  NM: 'No Mod', HD: 'Hidden', HR: 'Hard Rock', DT: 'Double Time', FM: 'Free Mod', FL: 'Flashlight',
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
  const [selectedStashIds, setSelectedStashIds] = useState<Set<number>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState('RC');
  const [customSlot, setCustomSlot] = useState('');
  const [customSlotColor, setCustomSlotColor] = useState('#4a90d9');
  const [selectedMod, setSelectedMod] = useState('NM');
  const [customSlotColors, setCustomSlotColors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [fetchedDiffs, setFetchedDiffs] = useState<{ beatmap_id: number; difficulty_name: string; star_rating: number; keys: number }[]>([]);

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

  // Resolve the actual slot value (custom or preset)
  const resolvedSlot = selectedSlot === '__custom__' ? customSlot.trim().toUpperCase() : selectedSlot;
  const resolvedSlotLabel = slotLabels[resolvedSlot] || resolvedSlot || 'Custom';
  const allSlotColors = { ...slotColors, ...customSlotColors };
  const resolvedSlotColor = selectedSlot === '__custom__' ? customSlotColor : (allSlotColors[resolvedSlot] || '#666');

  const handleOpenAddDialog = () => {
    setSelectedStashIds(new Set());
    setSelectedSlot('RC');
    setCustomSlot('');
    setCustomSlotColor('#4a90d9');
    setSelectedMod('NM');
    setUrlInput('');
    setUrlError('');
    setFetchedDiffs([]);
    setSelectedDiffIndex(null);
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

  const handleFetchBeatmap = async () => {
    const id = extractBeatmapsetId(urlInput);
    if (!id) {
      setUrlError('Invalid beatmap ID or URL');
      return;
    }

    setUrlLoading(true);
    setUrlError('');
    setFetchedDiffs([]);
    setSelectedDiffIndex(null);

    try {
      const beatmapset = await getBeatmapset(parseInt(id));
      if (!beatmapset) {
        setUrlError('Beatmap not found');
        setUrlLoading(false);
        return;
      }

      if (beatmapset.beatmaps.length === 1) {
        // Single diff — add directly
        const diff = beatmapset.beatmaps[0];
        await handleAddMapAPI(
          beatmapset.beatmapset_id,
          beatmapset.title,
          beatmapset.artist,
          beatmapset.creator,
          diff.keys,
          diff.star_rating,
          diff.difficulty_name,
        );
      } else {
        // Multiple diffs — show picker
        setFetchedDiffs(beatmapset.beatmaps.map(b => ({
          beatmap_id: b.beatmap_id,
          difficulty_name: b.difficulty_name,
          star_rating: b.star_rating,
          keys: b.keys,
        })));
        // Store beatmapset info for later use
        setUrlInput(JSON.stringify({
          beatmapset_id: beatmapset.beatmapset_id,
          title: beatmapset.title,
          artist: beatmapset.artist,
          creator: beatmapset.creator,
        }));
      }
    } catch {
      setUrlError('Failed to fetch beatmap');
    }

    setUrlLoading(false);
  };

  const handleAddSelectedDiff = async () => {
    if (selectedDiffIndex === null) return;
    const diff = fetchedDiffs[selectedDiffIndex];
    try {
      const meta = JSON.parse(urlInput);
      await handleAddMapAPI(
        meta.beatmapset_id,
        meta.title,
        meta.artist,
        meta.creator,
        diff.keys,
        diff.star_rating,
        diff.difficulty_name,
      );
      setFetchedDiffs([]);
      setSelectedDiffIndex(null);
      setUrlInput('');
    } catch {
      setUrlError('Failed to add map');
    }
  };

  const handleAddMapAPI = async (
    beatmapsetId: number, title: string, artist: string, creator: string,
    keys: number, starRating: number, difficultyName: string,
  ) => {
    if (!abbreviation || !currentStage) return;
    try {
      await addMapToStage(abbreviation, currentStage, {
        slot_type: resolvedSlot,
        mod: selectedMod,
        beatmapset_id: beatmapsetId,
        title,
        artist,
        creator,
        keys,
        star_rating: starRating,
        difficulty_name: difficultyName,
      });
      // Persist custom slot color for display
      if (selectedSlot === '__custom__' && resolvedSlot) {
        setCustomSlotColors(prev => ({ ...prev, [resolvedSlot]: customSlotColor }));
      }
      setSnackbar({ open: true, message: `Added to ${resolvedSlotLabel} (${selectedMod})` });
      loadTournament();
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to add map');
    }
  };

  const handleToggleStashItem = (id: number) => {
    setSelectedStashIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleAddSelectedMaps = async () => {
    const selectedMaps = stash.filter(b => selectedStashIds.has(b.id));
    if (selectedMaps.length === 0 || !abbreviation || !currentStage) return;

    for (const beatmap of selectedMaps) {
      try {
        await addMapToStage(abbreviation, currentStage, {
          slot_type: resolvedSlot,
          mod: selectedMod,
          beatmapset_id: beatmap.id,
          title: beatmap.title,
          artist: beatmap.artist,
          creator: beatmap.creator,
          keys: beatmap.keys,
        });
      } catch {
        // continue with others
      }
    }

    setSnackbar({ open: true, message: `Added ${selectedMaps.length} map(s) to ${resolvedSlotLabel} (${selectedMod})` });
    setAddDialogOpen(false);
    loadTournament();
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
                    modChip={map.mod !== 'NM' ? { label: map.mod, color: modColors[map.mod] || '#666' } : undefined}
                    actions={
                      <>
                        <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${map.beatmapset_id}`, '_blank')} variant="dark" />
                        <DownloadButton
                          downloadUrl={`https://api.nerinyan.moe/d/${map.beatmapset_id}`}
                          downloadName={`${map.artist} - ${map.title}`}
                          variant="dark"
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
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2}>
              {/* Slot selector */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Slot</InputLabel>
                <Select value={selectedSlot} label="Slot" onChange={(e) => setSelectedSlot(e.target.value)}>
                  {slots.map(slot => (
                    <MenuItem key={slot} value={slot}>
                      <Chip label={slot} size="small" sx={{ backgroundColor: allSlotColors[slot] || '#666', color: 'white', mr: 1, minWidth: 40 }} />
                      {slotLabels[slot]}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem value="__custom__">
                    <EditIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                    Custom...
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Mod selector */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Mod</InputLabel>
                <Select value={selectedMod} label="Mod" onChange={(e) => setSelectedMod(e.target.value)}>
                  {mods.map(mod => (
                    <MenuItem key={mod} value={mod}>
                      <Chip label={mod} size="small" sx={{ backgroundColor: modColors[mod] || '#666', color: 'white', mr: 1, minWidth: 40 }} />
                      {modLabels[mod]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {selectedSlot === '__custom__' && (
              <Stack direction="row" spacing={2} alignItems="center" sx={{ pl: 0.5 }}>
                <TextField
                  size="small"
                  label="Slot Name"
                  value={customSlot}
                  onChange={(e) => setCustomSlot(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. ACC"
                  sx={{ width: 120 }}
                />
                {customSlot && (
                  <Chip
                    label={customSlot}
                    size="small"
                    sx={{ backgroundColor: customSlotColor, color: 'white', fontWeight: 'bold', minWidth: 40 }}
                  />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  {colorPalette.map(color => (
                    <Box
                      key={color}
                      onClick={() => setCustomSlotColor(color)}
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: customSlotColor === color ? 'white' : 'transparent',
                        outline: customSlotColor === color ? `2px solid ${color}` : 'none',
                        transition: 'all 0.15s',
                        '&:hover': { transform: 'scale(1.15)' },
                      }}
                    />
                  ))}
                  <TextField
                    size="small"
                    value={customSlotColor}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (!v.startsWith('#')) v = '#' + v;
                      setCustomSlotColor(v.slice(0, 7));
                    }}
                    sx={{
                      width: 90,
                      ml: 0.5,
                      '& .MuiInputBase-input': { fontSize: 12, py: 0.5, px: 1, fontFamily: 'monospace' },
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: customSlotColor, border: '1px solid rgba(0,0,0,0.2)' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
              </Stack>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Selected maps will be added as <strong>{resolvedSlotLabel}</strong> with <strong>{modLabels[selectedMod]}</strong> mod
          </Typography>

          {/* Add by URL */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              Add by URL or ID
            </Typography>
            {fetchedDiffs.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">Select a difficulty:</Typography>
                {fetchedDiffs.map((diff, i) => (
                  <Box
                    key={diff.beatmap_id}
                    onClick={() => setSelectedDiffIndex(i)}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selectedDiffIndex === i ? '#ff66ab' : 'transparent',
                      backgroundColor: selectedDiffIndex === i ? 'rgba(255,102,171,0.08)' : 'transparent',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">{diff.difficulty_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {diff.keys}K · {diff.star_rating.toFixed(2)}*
                    </Typography>
                  </Box>
                ))}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => { setFetchedDiffs([]); setUrlInput(''); }}>Back</Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={selectedDiffIndex === null}
                    onClick={handleAddSelectedDiff}
                    sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
                  >
                    Add Selected
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Enter beatmapset ID or osu.ppy.sh URL"
                  value={typeof urlInput === 'string' && !urlInput.startsWith('{') ? urlInput : ''}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && urlInput.trim() && !urlLoading && handleFetchBeatmap()}
                  error={!!urlError}
                  helperText={urlError}
                  disabled={urlLoading}
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
                  onClick={handleFetchBeatmap}
                  disabled={urlLoading || !urlInput.trim()}
                  sx={{ minWidth: 80, backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
                >
                  {urlLoading ? <CircularProgress size={20} color="inherit" /> : 'Add'}
                </Button>
              </Stack>
            )}
          </Box>

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
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {stash.map((beatmap) => {
                const isSelected = selectedStashIds.has(beatmap.id);
                const alreadyInPool = maps.some(m => m.beatmapset_id === beatmap.id);
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
                    checkbox={{
                      checked: isSelected,
                      disabled: alreadyInPool,
                      onChange: () => handleToggleStashItem(beatmap.id),
                    }}
                    statusChip={alreadyInPool ? { label: 'Already in pool' } : undefined}
                    onClick={!alreadyInPool ? () => handleToggleStashItem(beatmap.id) : undefined}
                    sx={{
                      cursor: alreadyInPool ? 'not-allowed' : 'pointer',
                      backgroundColor: isSelected ? 'rgba(255,102,171,0.1)' : 'transparent',
                      opacity: alreadyInPool ? 0.5 : 1,
                      '&:hover': {
                        backgroundColor: alreadyInPool ? 'transparent' : isSelected ? 'rgba(255,102,171,0.15)' : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {selectedStashIds.size} map(s) selected
          </Typography>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddSelectedMaps}
            disabled={selectedStashIds.size === 0 || !resolvedSlot}
            sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
          >
            Add to {resolvedSlot || '...'} ({selectedMod})
          </Button>
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
