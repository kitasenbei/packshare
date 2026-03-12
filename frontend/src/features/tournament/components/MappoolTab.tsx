import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  Plus,
  Trash2,
  Pencil,
  Link,
  Check,
  X,
  List,
  FolderOpen,
} from 'lucide-react';
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
  const [slotMenuOpen, setSlotMenuOpen] = useState(false);
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
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditingStages(false); setRenamingStageId(null); }}
              className="text-xs"
            >
              <List className="size-4" />
              Back to Mappool
            </Button>
            <span className="ml-2 text-sm text-muted-foreground">
              Editing stages ({stages.length})
            </span>
          </div>

          <div className="mb-4 overflow-hidden rounded-lg border">
            {stages.map((stage, i) => (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2',
                  i < stages.length - 1 && 'border-b',
                )}
              >
                {renamingStageId === stage.id ? (
                  <div className="mr-8 flex flex-1 items-center gap-1">
                    <Input
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
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon-xs" onClick={() => {
                      if (!renameStageValue.trim()) return;
                      renameStage(tournament.abbreviation, stage.id, renameStageValue.trim()).then(() => {
                        setTournament((prev) => ({
                          ...prev,
                          stages: prev.stages?.map((s) => s.id === stage.id ? { ...s, name: renameStageValue.trim() } : s),
                        }));
                        setRenamingStageId(null);
                      }).catch(() => onError('Failed to rename stage'));
                    }}>
                      <Check className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => setRenamingStageId(null)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer hover:opacity-70"
                    onClick={() => { setRenamingStageId(stage.id); setRenameStageValue(stage.name); }}
                  >
                    <span className="text-sm font-medium">{stage.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{stage.maps?.length ?? 0} maps</span>
                  </div>
                )}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive"
                        onClick={() => setStageToDelete({ id: stage.id, name: stage.name })}
                      />
                    }
                  >
                    <Trash2 className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Delete stage</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
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
              className="flex-1"
            />
            <Button
              size="sm"
              disabled={!newStageName.trim()}
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
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {/* Delete stage confirmation */}
          <Dialog open={!!stageToDelete} onOpenChange={(o) => { if (!o) setStageToDelete(null); }}>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle>Delete Stage</DialogTitle>
              </DialogHeader>
              <p>
                Delete <strong>{stageToDelete?.name}</strong>? All maps in this stage will be removed. This cannot be undone.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStageToDelete(null)}>Cancel</Button>
                <Button
                  variant="destructive"
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
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : stages.length > 0 ? (
        <div>
          {/* Stage tabs + Add button */}
          <div className="mb-4 flex items-center gap-2">
            <Tabs value={currentStageIndex.toString()} onValueChange={(v) => setCurrentStageIndex(Number(v))} className="min-w-0 flex-1">
              <TabsList className="justify-start">
                {stages.map((stage, i) => (
                  <TabsTrigger key={stage.id} value={i.toString()} className="text-[13px]">
                    {stage.name}
                    {(stage.maps?.length ?? 0) > 0 && (
                      <Badge className="ml-1 h-4 min-w-4 px-1 text-[9px]">
                        {stage.maps?.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {isOwner && (
              <>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingStages(true)} />
                    }
                  >
                    <Pencil className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Edit stages</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button size="sm" onClick={() => setAddMapOpen(true)} className="shrink-0 text-xs" />
                    }
                  >
                    <Plus className="size-4" />
                    Add Map
                  </TooltipTrigger>
                  <TooltipContent>Add map to stage</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Map list */}
          {currentStage && (!currentStage.maps || currentStage.maps.length === 0) ? (
            <Card className="py-10 text-center">
              <List className="mx-auto mb-2 size-10 text-muted-foreground" />
              <p className="mb-3 text-muted-foreground">
                No maps in {currentStage.name}
              </p>
              {isOwner && (
                <Button size="sm" variant="outline" onClick={() => setAddMapOpen(true)}>
                  <Plus className="size-4" />
                  Add maps to this stage
                </Button>
              )}
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {slotOrder.map((slotType) => (
                <Card key={slotType} className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm font-bold">
                      {getSlotLabel(slotType, slotConfigs)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mapsBySlot[slotType].length} map{mapsBySlot[slotType].length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <CardContent className="!p-1">
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
                          onClick: isOwner ? (e) => { e.stopPropagation(); setSlotMenuMap(map); setSlotMenuOpen(true); } : undefined,
                        }}
                        modChips={map.mod.match(/.{2}/g)?.map((m) => ({
                          label: m,
                          color: modColors[m] || '#666',
                          icon: modIcons[m],
                        }))}
                        actions={
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${map.beatmapset_id}`, '_blank')} />
                            <DownloadButton
                              downloadUrl={`https://api.nerinyan.moe/d/${map.beatmapset_id}`}
                              downloadName={`${map.artist} - ${map.title}`}
                            />
                            {isOwner && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => { setEditingMap(map); setEditSlot(map.slot_type); setEditMod(map.mod); }}
                                      />
                                    }
                                  >
                                    <Pencil className="size-4" />
                                  </TooltipTrigger>
                                  <TooltipContent>Edit slot/mod</TooltipContent>
                                </Tooltip>
                                <RemoveButton onClick={() => handleRemoveMap(map.id)} />
                              </>
                            )}
                          </div>
                        }
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="py-12 text-center">
          <List className="mx-auto mb-2 size-10 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold">No stages yet</h3>
          <p className="mx-auto mb-6 max-w-[400px] text-sm text-muted-foreground">
            Stages are rounds of your tournament (e.g. Qualifiers, Group Stage, Finals). Create your first stage to start building your mappool.
          </p>
          {isOwner && (
            <Button onClick={() => setEditingStages(true)}>
              <Plus className="size-4" />
              Add Stage
            </Button>
          )}
        </Card>
      )}

      {/* Inline slot menu */}
      <DropdownMenu open={slotMenuOpen && !!slotMenuMap} onOpenChange={(o) => { if (!o) { setSlotMenuOpen(false); setSlotMenuMap(null); } }}>
        <DropdownMenuTrigger className="hidden" />
        <DropdownMenuContent className="min-w-[140px]">
          {tournamentSlots.map((s) => (
            <DropdownMenuItem
              key={s}
              className={cn('gap-3 text-[13px]', slotMenuMap?.slot_type === s && 'bg-accent')}
              onSelect={async () => {
                if (!slotMenuMap || slotMenuMap.slot_type === s) {
                  setSlotMenuOpen(false);
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
                setSlotMenuOpen(false);
                setSlotMenuMap(null);
              }}
            >
              <SlotBadge label={s} color={getSlotColor(s, slotConfigs)} />
              {getSlotLabel(s, slotConfigs)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Map Dialog */}
      <Dialog open={!!editingMap} onOpenChange={(o) => { if (!o) setEditingMap(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Map</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Slot Type</h4>
              <div className="grid grid-cols-3 gap-1.5">
                {tournamentSlots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditSlot(s)}
                    className={cn(
                      'cursor-pointer rounded-full px-2 py-1 text-xs font-bold transition-colors',
                      editSlot === s
                        ? 'text-white'
                        : 'border bg-muted text-foreground',
                    )}
                    style={editSlot === s ? { backgroundColor: getSlotColor(s, slotConfigs) } : undefined}
                  >
                    {s} — {getSlotLabel(s, slotConfigs)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Mod</h4>
              <div className={cn('grid gap-1.5', `grid-cols-${MODS.length}`)}>
                {MODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setEditMod(m)}
                    className={cn(
                      'flex cursor-pointer items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-colors',
                      editMod === m
                        ? 'text-white'
                        : 'border bg-muted text-foreground',
                    )}
                    style={editMod === m ? { backgroundColor: modColors[m] || '#666' } : undefined}
                  >
                    {modIcons[m] && (
                      <img
                        src={modIcons[m]}
                        className={cn('size-[18px]', editMod !== m && 'dark:invert-0 invert')}
                        alt=""
                      />
                    )}
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMap(null)}>Cancel</Button>
            <Button
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Map Dialog */}
      <Dialog
        open={addMapOpen}
        onOpenChange={(o) => { if (!o) { setAddMapOpen(false); setFetchedBeatmapset(null); setMapInput(''); setMapError(''); } }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Add Map to {currentStage?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {/* Fetch beatmap */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Beatmap ID or URL"
                  value={mapInput}
                  onChange={(e) => setMapInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && mapInput.trim() && handleFetchBeatmap()}
                  className="pl-8"
                />
              </div>
              <Button
                onClick={handleFetchBeatmap}
                disabled={!mapInput.trim() || mapLoading}
                className="min-w-[80px]"
              >
                {mapLoading ? <Spinner className="size-5 text-white" /> : 'Fetch'}
              </Button>
            </div>

            {mapError && (
              <Alert variant="destructive">
                <AlertDescription>{mapError}</AlertDescription>
              </Alert>
            )}

            {/* Check Library */}
            <div>
              <Button
                size="sm"
                variant="ghost"
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
                className="text-xs text-muted-foreground"
              >
                <FolderOpen className="size-4" />
                {showLibrary ? 'Hide Library' : 'Check Library'}
              </Button>
              {showLibrary && (
                <div className="mt-2 overflow-hidden rounded-lg border">
                  <div className="border-b p-2">
                    <Input
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
                      className="text-[13px]"
                    />
                  </div>
                  <div className="max-h-[280px] overflow-auto">
                    {libraryLoading ? (
                      <div className="flex justify-center py-6">
                        <Spinner className="size-5" />
                      </div>
                    ) : !libraryData || libraryData.packs.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        No packs found
                      </p>
                    ) : (
                      <>
                        {libraryData.packs.map((pack) => (
                          <div key={pack.id}>
                            <div
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
                              className="flex cursor-pointer items-center gap-2 border-b bg-muted px-3 py-2 hover:opacity-80"
                            >
                              <FolderOpen className="size-4 text-muted-foreground" />
                              <span className="flex-1 text-xs font-bold">
                                {pack.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {pack.beatmap_count} maps
                              </span>
                              {expandingPackCode === pack.share_code && <Spinner className="size-3.5" />}
                            </div>
                            {expandedPack?.share_code === pack.share_code && expandedPack.beatmaps.map((bm) => (
                              <div
                                key={bm.id}
                                onClick={() => {
                                  setMapInput(bm.beatmapset_id.toString());
                                  setShowLibrary(false);
                                }}
                                className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 hover:bg-muted"
                              >
                                <img
                                  src={`https://assets.ppy.sh/beatmaps/${bm.beatmapset_id}/covers/list.jpg`}
                                  alt=""
                                  className="size-9 shrink-0 rounded object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm">{bm.artist} - {bm.title}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {bm.difficulty_name && `[${bm.difficulty_name}]`} {bm.star_rating && ` ★ ${bm.star_rating.toFixed(2)}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  {libraryData && libraryData.total > 10 && (
                    <div className="flex items-center justify-center gap-2 border-t p-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={libraryPage <= 1 || libraryLoading}
                        onClick={() => {
                          const p = libraryPage - 1;
                          setLibraryLoading(true);
                          browsePacks(p, 10, 'recent', librarySearch)
                            .then((data) => { setLibraryData(data); setLibraryPage(p); })
                            .catch(() => {})
                            .finally(() => setLibraryLoading(false));
                        }}
                        className="text-[11px]"
                      >
                        Prev
                      </Button>
                      <span className="text-xs leading-[30px]">
                        {libraryPage} / {Math.ceil(libraryData.total / 10)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={libraryPage >= Math.ceil(libraryData.total / 10) || libraryLoading}
                        onClick={() => {
                          const p = libraryPage + 1;
                          setLibraryLoading(true);
                          browsePacks(p, 10, 'recent', librarySearch)
                            .then((data) => { setLibraryData(data); setLibraryPage(p); })
                            .catch(() => {})
                            .finally(() => setLibraryLoading(false));
                        }}
                        className="text-[11px]"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fetched beatmapset info */}
            {fetchedBeatmapset && (
              <>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <img
                    src={`https://assets.ppy.sh/beatmaps/${fetchedBeatmapset.beatmapset_id}/covers/list.jpg`}
                    alt=""
                    className="size-14 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold">
                      {fetchedBeatmapset.artist} - {fetchedBeatmapset.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      mapped by {fetchedBeatmapset.creator}
                    </p>
                  </div>
                </div>

                {/* Difficulty selection */}
                <div>
                  <h4 className="mb-2 text-sm font-medium">Select Difficulty</h4>
                  <div className="flex flex-col gap-1">
                    {fetchedBeatmapset.beatmaps.map((diff, i) => (
                      <div
                        key={diff.beatmap_id}
                        onClick={() => setSelectedDiffIndex(i)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors hover:border-primary',
                          selectedDiffIndex === i
                            ? 'border-primary bg-primary/5'
                            : 'border-border',
                        )}
                      >
                        <span className="inline-flex h-[22px] items-center rounded-full bg-primary px-2 text-[11px] font-bold text-white">
                          {diff.keys}K
                        </span>
                        <span className="flex-1 text-sm">{diff.difficulty_name}</span>
                        <span className="inline-flex h-5 items-center rounded-full bg-black px-2 text-[11px] font-bold text-white">
                          ★ {diff.star_rating.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slot & Mod selection */}
                {selectedDiffIndex !== null && (
                  <>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium">Slot Type</h4>
                        <button
                          onClick={() => { setAddMapOpen(false); onTabChange('slots'); }}
                          className="cursor-pointer p-0 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Edit Slots
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {tournamentSlots.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedSlot(s)}
                            className={cn(
                              'cursor-pointer rounded-full px-2 py-1 text-xs font-bold transition-colors hover:opacity-85',
                              selectedSlot === s
                                ? 'text-white'
                                : 'border bg-muted text-foreground',
                            )}
                            style={selectedSlot === s ? { backgroundColor: getSlotColor(s, slotConfigs) } : undefined}
                          >
                            {s} — {getSlotLabel(s, slotConfigs)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-medium">Mod</h4>
                      <div className={cn('grid gap-1.5', `grid-cols-${MODS.length}`)}>
                        {MODS.map((m) => (
                          <button
                            key={m}
                            onClick={() => setSelectedMod(m)}
                            className={cn(
                              'flex cursor-pointer items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-colors hover:opacity-85',
                              selectedMod === m
                                ? 'text-white'
                                : 'border bg-muted text-foreground',
                            )}
                            style={selectedMod === m ? { backgroundColor: modColors[m] || '#666' } : undefined}
                          >
                            {modIcons[m] && (
                              <img
                                src={modIcons[m]}
                                className={cn('size-[18px]', selectedMod !== m && 'dark:invert-0 invert')}
                                alt=""
                              />
                            )}
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddMapOpen(false); setFetchedBeatmapset(null); setMapInput(''); setMapError(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMap}
              disabled={!fetchedBeatmapset || selectedDiffIndex === null || addingMap}
            >
              {addingMap ? <Spinner className="size-4 text-white" /> : <Plus className="size-4" />}
              {addingMap ? 'Adding...' : 'Add Map'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
