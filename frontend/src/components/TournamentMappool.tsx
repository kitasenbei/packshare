import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import type { StashBeatmap } from '../types/beatmap';
import BeatmapRow from './BeatmapRow';

const STORAGE_KEY = 'packshare_tournaments';
const STASH_STORAGE_KEY = 'packshare_stash';
const MAPPOOL_STORAGE_KEY = 'packshare_mappools';

// Slot colors (map categories)
const slotColors: Record<string, string> = {
  RC: '#4a90d9',      // Rice
  LN: '#4ad98f',      // Long Notes
  HB: '#b44ad9',      // Hybrid
  TECH: '#f5c842',    // Technical
  JACK: '#d94a4a',    // Jack
  SPEED: '#4ad9d9',   // Speed
  STAM: '#d9a44a',    // Stamina
  SV: '#ff66ab',      // Slider Velocity
  TB: '#ff4444',      // Tiebreaker
};

// Mod colors (game modifiers)
const modColors: Record<string, string> = {
  NM: '#666666',      // No Mod
  HD: '#f5c842',      // Hidden
  HR: '#d94a4a',      // Hard Rock
  DT: '#b44ad9',      // Double Time
  FM: '#4ad98f',      // Free Mod
  FL: '#333333',      // Flashlight
};

const slots = ['RC', 'LN', 'HB', 'TECH', 'JACK', 'SPEED', 'STAM', 'SV', 'TB'];
const slotLabels: Record<string, string> = {
  RC: 'Rice',
  LN: 'Long Notes',
  HB: 'Hybrid',
  TECH: 'Technical',
  JACK: 'Jack',
  SPEED: 'Speed',
  STAM: 'Stamina',
  SV: 'Slider Velocity',
  TB: 'Tiebreaker',
};

const mods = ['NM', 'HD', 'HR', 'DT', 'FM', 'FL'];
const modLabels: Record<string, string> = {
  NM: 'No Mod',
  HD: 'Hidden',
  HR: 'Hard Rock',
  DT: 'Double Time',
  FM: 'Free Mod',
  FL: 'Flashlight',
};

interface MapInfo {
  slot: string;       // RC, LN, HB, etc.
  mod: string;        // NM, HD, HR, DT, FM
  num: number;
  artist: string;
  title: string;
  diff: string;
  star: number;
  mapper: string;
  beatmapId?: number;
}

interface StoredTournament {
  id: string;
  name: string;
  banner: string;
  logo: string;
  stages: string[];
  currentStage: string;
  format: string;
  isUserCreated?: boolean;
}

// Default tournaments with full mappool data
const defaultTournaments: Record<string, { name: string; logo: string; stages: Record<string, MapInfo[]> }> = {
  'owc2024': {
    name: 'osu! World Cup 2024',
    logo: 'https://picsum.photos/seed/owclogo/100/100',
    stages: {
      'Grand Finals': [
        { slot: 'RC', mod: 'NM', num: 1, artist: 'UNDEAD CORPORATION', title: 'Everything will freeze', diff: 'Time Freeze', star: 7.21, mapper: 'Ekoro' },
        { slot: 'RC', mod: 'NM', num: 2, artist: 'DragonForce', title: 'Through the Fire and Flames', diff: 'Myth', star: 7.45, mapper: 'Ponoyoshi' },
        { slot: 'RC', mod: 'HD', num: 1, artist: 'xi', title: 'Blue Zenith', diff: 'FOUR DIMENSIONS', star: 6.98, mapper: 'Asphyxia' },
        { slot: 'RC', mod: 'HR', num: 1, artist: 'Camellia', title: 'GHOST', diff: 'Extreme', star: 7.12, mapper: 'Akali' },
        { slot: 'LN', mod: 'NM', num: 1, artist: 'Camellia', title: "Exit This Earth's Atmosphere", diff: 'Evolution', star: 7.32, mapper: 'rrtyui' },
        { slot: 'LN', mod: 'NM', num: 2, artist: 'YOASOBI', title: 'Idol', diff: 'Oshi', star: 6.54, mapper: 'Skyflame' },
        { slot: 'HB', mod: 'NM', num: 1, artist: 'Hana', title: 'Sakura no Uta', diff: 'Euphoria', star: 6.21, mapper: 'BeasttrollMC' },
        { slot: 'HB', mod: 'DT', num: 1, artist: 'Linked Horizon', title: 'Shinzou wo Sasageyo!', diff: 'Heart', star: 5.89, mapper: 'Monstrata' },
        { slot: 'SPEED', mod: 'NM', num: 1, artist: 'ClariS', title: 'Hitorigoto', diff: 'Soliloquy', star: 5.34, mapper: 'Doormat' },
        { slot: 'JACK', mod: 'NM', num: 1, artist: 'Kano', title: 'Dear Brave', diff: 'Valor', star: 5.67, mapper: 'Fycho' },
        { slot: 'SV', mod: 'NM', num: 1, artist: 'REDALiCE', title: 'Taboo tears you up', diff: 'Insane', star: 6.34, mapper: 'Muya' },
        { slot: 'TB', mod: 'FM', num: 1, artist: 'Imperial Circus Dead Decadence', title: 'Uta', diff: 'Himei', star: 8.32, mapper: 'DoKito' },
      ],
      'Finals': [
        { slot: 'RC', mod: 'NM', num: 1, artist: 'Cres', title: 'End Time', diff: 'Extra', star: 6.45, mapper: 'Akali' },
        { slot: 'RC', mod: 'NM', num: 2, artist: 'Nanahira', title: 'Petals', diff: 'Blossom', star: 6.12, mapper: 'Lasse' },
        { slot: 'LN', mod: 'NM', num: 1, artist: 'Aoi', title: 'Thriving City', diff: 'Prosperity', star: 5.88, mapper: 'Niva' },
        { slot: 'HB', mod: 'NM', num: 1, artist: 'Reol', title: 'No title', diff: 'Nameless', star: 5.67, mapper: 'Kowari' },
        { slot: 'SPEED', mod: 'DT', num: 1, artist: 'Shiena Nishizawa', title: 'Brand-new World', diff: 'New', star: 5.12, mapper: 'Log Off Now' },
        { slot: 'TB', mod: 'FM', num: 1, artist: 'Demetori', title: 'Emotional Skyscraper', diff: 'Reverie', star: 7.45, mapper: 'GoldenWolf' },
      ],
    },
  },
  'mwc2024': {
    name: '4K Mania World Cup 2024',
    logo: 'https://picsum.photos/seed/mwclogo/100/100',
    stages: {
      'Semifinals': [
        { slot: 'RC', mod: 'NM', num: 1, artist: 'Camellia', title: 'crystallized', diff: 'Coalescence', star: 6.8, mapper: 'Abraxos' },
        { slot: 'RC', mod: 'NM', num: 2, artist: 'xi', title: 'Parousia', diff: 'Sanctum', star: 7.1, mapper: 'Shoegazer' },
        { slot: 'LN', mod: 'NM', num: 1, artist: 'PSYQUI', title: 'Hype feat. Such', diff: 'Energetic', star: 5.9, mapper: 'Vortex-' },
        { slot: 'JACK', mod: 'NM', num: 1, artist: 'Kobaryo', title: 'Bookmaker', diff: 'Gambit', star: 6.5, mapper: 'Fresh Chicken' },
        { slot: 'SPEED', mod: 'DT', num: 1, artist: 'Memme', title: 'Acid Burst', diff: 'Corrosive', star: 5.2, mapper: 'Lude' },
        { slot: 'TB', mod: 'FM', num: 1, artist: 'Frums', title: 'Theyaremanycolors', diff: 'Chromatic', star: 7.8, mapper: 'Blocko' },
      ],
    },
  },
  'community-cup': {
    name: 'Community Cup #12',
    logo: 'https://picsum.photos/seed/cclogo/100/100',
    stages: {
      'Qualifiers': [
        { slot: 'RC', mod: 'NM', num: 1, artist: 'Foreground Eclipse', title: 'From Under Cover', diff: 'Insane', star: 5.2, mapper: 'Seni' },
        { slot: 'RC', mod: 'NM', num: 2, artist: 'FELT', title: 'Flower Flag', diff: 'Extra', star: 5.5, mapper: 'MrSergio' },
        { slot: 'LN', mod: 'NM', num: 1, artist: 'Halozy', title: 'Genryuu Kaiko', diff: 'Higan', star: 5.1, mapper: 'Hollow Wings' },
        { slot: 'HB', mod: 'NM', num: 1, artist: 'Demetori', title: 'Kuuchuu ni Shizumu', diff: 'Extra', star: 4.8, mapper: 'GoldenWolf' },
        { slot: 'SV', mod: 'NM', num: 1, artist: 'Hanatan', title: 'Airman ga Taosenai', diff: 'Holy Shit!', star: 4.2, mapper: 'SOUND HOLIC' },
      ],
    },
  },
};

function getTournamentData(tournamentId: string) {
  // Check localStorage for user-created tournaments
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const userTournaments: StoredTournament[] = JSON.parse(saved);
      const found = userTournaments.find(t => t.id === tournamentId);
      if (found) {
        // Check for saved mappool data
        const mappoolData = localStorage.getItem(`${MAPPOOL_STORAGE_KEY}_${tournamentId}`);
        let stageData: Record<string, MapInfo[]> = {};

        if (mappoolData) {
          stageData = JSON.parse(mappoolData);
        } else {
          // Generate empty stage structure for user tournaments
          found.stages.forEach(stage => {
            stageData[stage] = [];
          });
        }

        return {
          name: found.name,
          logo: found.logo,
          banner: found.banner,
          stages: stageData,
          isUserCreated: true,
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fall back to default tournaments
  if (defaultTournaments[tournamentId]) {
    return {
      ...defaultTournaments[tournamentId],
      banner: `https://picsum.photos/seed/${tournamentId}/1200/300`,
      isUserCreated: false,
    };
  }

  // Not found - return placeholder
  return {
    name: 'Tournament Not Found',
    logo: '',
    banner: '',
    stages: {},
    isUserCreated: false,
  };
}

interface TournamentMappoolProps {
  tournamentId?: string;
  stage?: string;
}

export default function TournamentMappool({ tournamentId, stage }: TournamentMappoolProps) {
  const [tournamentData, setTournamentData] = useState(() => getTournamentData(tournamentId || ''));
  const stages = Object.keys(tournamentData.stages);
  const [currentStage, setCurrentStage] = useState(stage || stages[0] || '');
  const [maps, setMaps] = useState<MapInfo[]>(tournamentData.stages[currentStage] || []);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [stash, setStash] = useState<StashBeatmap[]>([]);
  const [selectedStashIds, setSelectedStashIds] = useState<Set<number>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState('RC');
  const [selectedMod, setSelectedMod] = useState('NM');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Load stash when dialog opens
  useEffect(() => {
    if (addDialogOpen) {
      const saved = localStorage.getItem(STASH_STORAGE_KEY);
      if (saved) {
        try {
          setStash(JSON.parse(saved));
        } catch {
          setStash([]);
        }
      }
    }
  }, [addDialogOpen]);

  // Update maps when stage changes
  useEffect(() => {
    setMaps(tournamentData.stages[currentStage] || []);
  }, [currentStage, tournamentData]);

  // Group maps by slot
  const groupedMaps = maps.reduce((acc, map) => {
    if (!acc[map.slot]) acc[map.slot] = [];
    acc[map.slot].push(map);
    return acc;
  }, {} as Record<string, typeof maps>);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleOpenAddDialog = () => {
    setSelectedStashIds(new Set());
    setSelectedSlot('RC');
    setSelectedMod('NM');
    setUrlInput('');
    setUrlError('');
    setAddDialogOpen(true);
  };

  const extractBeatmapId = (input: string): string | null => {
    if (/^\d+$/.test(input.trim())) {
      return input.trim();
    }
    const match = input.match(/osu\.ppy\.sh\/beatmapsets\/(\d+)/);
    if (match) return match[1];
    const nerinyanMatch = input.match(/nerinyan\.moe.*?(\d+)/);
    if (nerinyanMatch) return nerinyanMatch[1];
    return null;
  };

  // Mock fetch beatmap - in production this would call an API
  const mockFetchBeatmap = (id: string): Promise<{ id: number; title: string; artist: string; creator: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: parseInt(id),
          title: `Beatmap ${id}`,
          artist: 'Various Artists',
          creator: 'Mapper' + Math.floor(Math.random() * 100),
        });
      }, 500);
    });
  };

  const handleAddByUrl = async () => {
    const id = extractBeatmapId(urlInput);
    if (!id) {
      setUrlError('Invalid beatmap ID or URL');
      return;
    }

    // Check if already in pool
    if (maps.some(m => m.beatmapId === parseInt(id))) {
      setUrlError('Beatmap already in mappool');
      return;
    }

    setUrlLoading(true);
    setUrlError('');

    try {
      const beatmap = await mockFetchBeatmap(id);

      // Get the next number for this slot
      const existingSlotMaps = maps.filter(m => m.slot === selectedSlot);
      const nextNum = existingSlotMaps.length + 1;

      const newMap: MapInfo = {
        slot: selectedSlot,
        mod: selectedMod,
        num: nextNum,
        artist: beatmap.artist,
        title: beatmap.title,
        diff: 'Normal',
        star: 5.0,
        mapper: beatmap.creator,
        beatmapId: beatmap.id,
      };

      const updatedMaps = [...maps, newMap];
      setMaps(updatedMaps);

      // Save to localStorage
      if (tournamentId && tournamentData.isUserCreated) {
        const allStages = { ...tournamentData.stages, [currentStage]: updatedMaps };
        localStorage.setItem(`${MAPPOOL_STORAGE_KEY}_${tournamentId}`, JSON.stringify(allStages));
        setTournamentData(prev => ({ ...prev, stages: allStages }));
      }

      setUrlInput('');
      setSnackbar({ open: true, message: `Added to ${slotLabels[selectedSlot]} (${selectedMod})` });
    } catch {
      setUrlError('Failed to fetch beatmap');
    }

    setUrlLoading(false);
  };

  const handleToggleStashItem = (id: number) => {
    setSelectedStashIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAddSelectedMaps = () => {
    const selectedMaps = stash.filter(b => selectedStashIds.has(b.id));
    if (selectedMaps.length === 0) return;

    // Get the next number for this slot
    const existingSlotMaps = maps.filter(m => m.slot === selectedSlot);
    let nextNum = existingSlotMaps.length + 1;

    const newMaps: MapInfo[] = selectedMaps.map(beatmap => ({
      slot: selectedSlot,
      mod: selectedMod,
      num: nextNum++,
      artist: beatmap.artist,
      title: beatmap.title,
      diff: 'Normal', // Default difficulty name
      star: 5.0, // Default star rating
      mapper: beatmap.creator,
      beatmapId: beatmap.id,
    }));

    const updatedMaps = [...maps, ...newMaps];
    setMaps(updatedMaps);

    // Save to localStorage
    if (tournamentId && tournamentData.isUserCreated) {
      const allStages = { ...tournamentData.stages, [currentStage]: updatedMaps };
      localStorage.setItem(`${MAPPOOL_STORAGE_KEY}_${tournamentId}`, JSON.stringify(allStages));
      setTournamentData(prev => ({ ...prev, stages: allStages }));
    }

    setSnackbar({ open: true, message: `Added ${selectedMaps.length} map(s) to ${slotLabels[selectedSlot]} (${selectedMod})` });
    setAddDialogOpen(false);
  };

  const handleRemoveMap = (mapIndex: number) => {
    const updatedMaps = maps.filter((_, i) => i !== mapIndex);

    // Renumber maps within each slot
    const renumbered = updatedMaps.map((map, _, arr) => {
      const sameSlotMaps = arr.filter(m => m.slot === map.slot);
      const idx = sameSlotMaps.indexOf(map);
      return { ...map, num: idx + 1 };
    });

    setMaps(renumbered);

    // Save to localStorage
    if (tournamentId && tournamentData.isUserCreated) {
      const allStages = { ...tournamentData.stages, [currentStage]: renumbered };
      localStorage.setItem(`${MAPPOOL_STORAGE_KEY}_${tournamentId}`, JSON.stringify(allStages));
      setTournamentData(prev => ({ ...prev, stages: allStages }));
    }

    setSnackbar({ open: true, message: 'Map removed from mappool' });
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0d0d1a', color: 'white' }}>
      {/* Banner Header */}
      <Box
        sx={{
          position: 'relative',
          background: tournamentData.banner
            ? `linear-gradient(to bottom, rgba(13,13,26,0.2) 0%, rgba(13,13,26,0.7) 40%, #0d0d1a 100%), url(${tournamentData.banner}) center / cover no-repeat`
            : 'linear-gradient(to bottom, rgba(255,102,171,0.2), #0d0d1a)',
          px: 4,
          pt: 5,
          pb: 2,
        }}
      >
        <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                src={tournamentData.logo}
                sx={{
                  width: 80,
                  height: 80,
                  border: '3px solid #ff66ab',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              />
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {tournamentData.name}
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                  {currentStage ? `${currentStage} Mappool` : 'Mappool'}
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
                <Tab key={s} label={s} value={s} />
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
        {tournamentData.isUserCreated && (
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
                {slotMaps.map((map, i) => {
                  const globalIndex = maps.findIndex(m => m === map);
                  return (
                    <BeatmapRow
                      key={i}
                      title={map.title}
                      artist={map.artist}
                      creator={map.mapper}
                      creatorPrefix="mapped by"
                      difficultyName={map.diff}
                      starRating={map.star}
                      starRatingSeparate
                      variant="dark"
                      density="compact"
                      slotBadge={{ label: `${map.slot}${map.num}`, color: slotColors[map.slot] || '#666' }}
                      modChip={map.mod !== 'NM' ? { label: map.mod, color: modColors[map.mod] || '#666' } : undefined}
                      actions={
                        <>
                          <Tooltip title="Open on osu!">
                            <IconButton
                              sx={{ color: 'rgba(255,255,255,0.5)' }}
                              onClick={() => map.beatmapId && window.open(`https://osu.ppy.sh/beatmapsets/${map.beatmapId}`, '_blank')}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              sx={{ color: '#66ff99' }}
                              onClick={() => map.beatmapId && window.open(`https://api.nerinyan.moe/d/${map.beatmapId}`, '_blank')}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {tournamentData.isUserCreated && (
                            <Tooltip title="Remove from mappool">
                              <IconButton
                                sx={{ color: '#ff6b6b' }}
                                onClick={() => handleRemoveMap(globalIndex)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      }
                    />
                  );
                })}
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
              <Select
                value={selectedSlot}
                label="Slot"
                onChange={(e) => setSelectedSlot(e.target.value)}
              >
                {slots.map(slot => (
                  <MenuItem key={slot} value={slot}>
                    <Chip
                      label={slot}
                      size="small"
                      sx={{
                        backgroundColor: slotColors[slot] || '#666',
                        color: 'white',
                        mr: 1,
                        minWidth: 40,
                      }}
                    />
                    {slotLabels[slot]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Mod selector */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Mod</InputLabel>
              <Select
                value={selectedMod}
                label="Mod"
                onChange={(e) => setSelectedMod(e.target.value)}
              >
                {mods.map(mod => (
                  <MenuItem key={mod} value={mod}>
                    <Chip
                      label={mod}
                      size="small"
                      sx={{
                        backgroundColor: modColors[mod] || '#666',
                        color: 'white',
                        mr: 1,
                        minWidth: 40,
                      }}
                    />
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
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="Enter beatmap ID or osu.ppy.sh URL"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && urlInput.trim() && !urlLoading && handleAddByUrl()}
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
                onClick={handleAddByUrl}
                disabled={urlLoading || !urlInput.trim()}
                sx={{
                  minWidth: 80,
                  backgroundColor: '#ff66ab',
                  '&:hover': { backgroundColor: '#ff4499' }
                }}
              >
                {urlLoading ? <CircularProgress size={20} color="inherit" /> : 'Add'}
              </Button>
            </Stack>
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
              {stash.map((beatmap, i) => {
                const isSelected = selectedStashIds.has(beatmap.id);
                const alreadyInPool = maps.some(m => m.beatmapId === beatmap.id);
                return (
                  <BeatmapRow
                    key={beatmap.id}
                    title={beatmap.title}
                    artist={beatmap.artist}
                    keys={beatmap.keys}
                    creator={beatmap.creator}
                    bpm={beatmap.bpm}
                    density="compact"
                    showDivider={i > 0}
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
          sx={{ backgroundColor: '#1a1a2e', color: 'white', border: '1px solid #ff66ab' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
