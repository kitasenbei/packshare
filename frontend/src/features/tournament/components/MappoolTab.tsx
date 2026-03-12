import { useState } from 'react';
import {
  Box,
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
  Tooltip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Badge,
  Menu,
  MenuItem,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ViewListIcon from '@mui/icons-material/ViewList';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { BeatmapsetInfo } from '../../auth/api/auth';
import { getBeatmapset } from '../../auth/api/auth';
import { browsePacks, getPack, type Pack, type BrowsePacksResult } from '../../pack/api/packs';
import {
  getTournament,
  addMapToStage,
  removeMap,
  updateMap,
  addStage,
  renameStage,
  deleteStage,
  type Tournament,
  type TournamentMap,
} from '../api/tournaments';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import SlotBadge from '../../../shared/components/SlotBadge';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import RemoveButton from '../../../shared/components/RemoveButton';
import { getSlotLabel, getSlotColor, SLOTS } from './slotUtils';

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

interface MappoolTabProps {
  tournament: Tournament;
  isOwner: boolean;
  slotConfigs: Record<string, { label: string; color: string }>;
  onTournamentChanged: (t: Tournament) => void;
  onError: (msg: string) => void;
  onTabChange: (tab: string) => void;
}

export default function MappoolTab({
  tournament,
  isOwner,
  slotConfigs,
  onTournamentChanged,
  onError,
  onTabChange,
}: MappoolTabProps) {
  const stages = tournament.stages ?? [];
  const tournamentSlots = Object.keys(slotConfigs).length > 0 ? Object.keys(slotConfigs) : SLOTS;

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
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
  const [selectedSlot, setSelectedSlot] = useState('RC');
  const [selectedMod, setSelectedMod] = useState('NM');
  const [addingMap, setAddingMap] = useState(false);

  // Library state
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryData, setLibraryData] = useState<BrowsePacksResult | null>(null);
  const [libraryPage, setLibraryPage] = useState(1);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [expandedPack, setExpandedPack] = useState<Pack | null>(null);
  const [expandingPackCode, setExpandingPackCode] = useState<string | null>(null);

  // Edit map state
  const [editingMap, setEditingMap] = useState<TournamentMap | null>(null);
  const [editSlot, setEditSlot] = useState('');
  const [editMod, setEditMod] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Slot menu
  const [slotMenuAnchor, setSlotMenuAnchor] = useState<HTMLElement | null>(null);
  const [slotMenuMap, setSlotMenuMap] = useState<TournamentMap | null>(null);

  const currentStage = stages[currentStageIndex];

  // Group maps by slot type
  const mapsBySlot: Record<string, TournamentMap[]> = {};
  if (currentStage?.maps) {
    for (const map of currentStage.maps) {
      if (!mapsBySlot[map.slot_type]) mapsBySlot[map.slot_type] = [];
      mapsBySlot[map.slot_type].push(map);
    }
  }
  const slotOrder = [...SLOTS.filter((s) => mapsBySlot[s]), ...Object.keys(mapsBySlot).filter((s) => !SLOTS.includes(s))];

  const setTournament = (updater: Tournament | ((prev: Tournament) => Tournament)) => {
    if (typeof updater === 'function') {
      onTournamentChanged(updater(tournament));
    } else {
      onTournamentChanged(updater);
    }
  };

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
      const updated = await getTournament(tournament.abbreviation);
      onTournamentChanged(updated);
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
      onTournamentChanged(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove map');
    }
  };

  return (
    <>
      {editingStages ? (
        <Box>
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
                      <IconButton size="small" color="error" onClick={() => setStageToDelete({ id: stage.id, name: stage.name })}>
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
                            }).catch(() => onError('Failed to rename stage'));
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
                        }).catch(() => onError('Failed to rename stage'));
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
                    }).catch(() => onError('Failed to add stage'));
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
                  }).catch(() => onError('Failed to add stage'));
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
                    }).catch(() => onError('Failed to delete stage'));
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
                    <IconButton size="small" onClick={() => setEditingStages(true)}>
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
                onError(err instanceof Error ? err.message : 'Failed to update slot');
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
                onError(err instanceof Error ? err.message : 'Failed to update map');
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
                        <Button size="small" variant="text" onClick={() => { setAddMapOpen(false); onTabChange('slots'); }} sx={{ fontSize: 11, textTransform: 'none', p: 0, minWidth: 0 }}>
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
    </>
  );
}
