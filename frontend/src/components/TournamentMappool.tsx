import { useState, useEffect } from 'react';
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
import type { StashBeatmap } from '../types/beatmap';
import type { User } from '../api/auth';
import { getBeatmapset } from '../api/auth';
import type { Tournament, TournamentMap } from '../api/tournaments';
import { getTournament, addMapToStage, removeMap } from '../api/tournaments';
import BeatmapRow from './BeatmapRow';
import DownloadButton from './DownloadButton';
import OsuButton from './OsuButton';
import RemoveButton from './RemoveButton';
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
  const [selectedMod, setSelectedMod] = useState('NM');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [fetchedDiffs, setFetchedDiffs] = useState<{ beatmap_id: number; difficulty_name: string; star_rating: number; keys: number }[]>([]);

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

  const handleOpenAddDialog = () => {
    setSelectedStashIds(new Set());
    setSelectedSlot('RC');
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
        slot_type: selectedSlot,
        mod: selectedMod,
        beatmapset_id: beatmapsetId,
        title,
        artist,
        creator,
        keys,
        star_rating: starRating,
        difficulty_name: difficultyName,
      });
      setSnackbar({ open: true, message: `Added to ${slotLabels[selectedSlot]} (${selectedMod})` });
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
          slot_type: selectedSlot,
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

    setSnackbar({ open: true, message: `Added ${selectedMaps.length} map(s) to ${slotLabels[selectedSlot]} (${selectedMod})` });
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
        <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Stack direction="row" spacing={3} alignItems="center">
              {tournament.logo_url && (
                <Avatar
                  src={tournament.logo_url}
                  sx={{
                    width: 80,
                    height: 80,
                    border: '3px solid #ff66ab',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                />
              )}
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {tournament.name}
                </Typography>
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
                    backgroundColor: slotColors[slot] || '#666',
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
                    slotBadge={{ label: `${map.slot_type}${map.slot_number}`, color: slotColors[map.slot_type] || '#666' }}
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
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            {/* Slot selector */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Slot</InputLabel>
              <Select value={selectedSlot} label="Slot" onChange={(e) => setSelectedSlot(e.target.value)}>
                {slots.map(slot => (
                  <MenuItem key={slot} value={slot}>
                    <Chip label={slot} size="small" sx={{ backgroundColor: slotColors[slot] || '#666', color: 'white', mr: 1, minWidth: 40 }} />
                    {slotLabels[slot]}
                  </MenuItem>
                ))}
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

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Selected maps will be added as <strong>{slotLabels[selectedSlot]}</strong> with <strong>{modLabels[selectedMod]}</strong> mod
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
            disabled={selectedStashIds.size === 0}
            sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
          >
            Add to {selectedSlot} ({selectedMod})
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
