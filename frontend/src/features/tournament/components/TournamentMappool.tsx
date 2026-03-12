import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download, Copy, Plus, Trash2, PackageOpen, Link, Pencil, Check, ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
    toast.success('Link copied!');
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
      toast.success('Name updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
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
      toast.success(url ? 'Banner updated' : 'Banner removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update banner');
    }
  };

  const handleLogoUpload = async (url: string | null) => {
    if (!abbreviation || !tournament) return;
    try {
      const updated = await updateTournament(abbreviation, { logo_url: url || undefined });
      setTournament(updated);
      setLogoUploadOpen(false);
      toast.success(url ? 'Logo updated' : 'Logo removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update logo');
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
      toast.success(`Added to ${slotLabel} (${pm.mods.join('')})`);
      setPendingMaps(prev => prev.filter(m => m.id !== pendingId));
      loadTournament();
    } catch (err) {
      setPendingMaps(prev => prev.map(m => m.id === pendingId ? { ...m, adding: false } : m));
      toast.error(err instanceof Error ? err.message : 'Failed to add map');
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
      toast.success(`Added ${added} map${added !== 1 ? 's' : ''} to pool`);
      loadTournament();
    }
  };

  const handleRemoveMap = async (mapId: number) => {
    if (!abbreviation) return;
    try {
      await removeMap(abbreviation, mapId);
      toast.success('Map removed from mappool');
      loadTournament();
    } catch {
      toast.error('Failed to remove map');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: '#0d0d1a' }}>
        <Spinner className="size-6" style={{ color: '#ff66ab' }} />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white" style={{ backgroundColor: '#0d0d1a' }}>
        <p>{error || 'Tournament not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0d1a' }}>
      {/* Banner Header */}
      <div
        className="relative px-8 pt-10 pb-4"
        style={{
          background: tournament.banner_url
            ? `linear-gradient(to bottom, rgba(13,13,26,0.2) 0%, rgba(13,13,26,0.7) 40%, #0d0d1a 100%), url(${tournament.banner_url}) center / cover no-repeat`
            : 'linear-gradient(to bottom, rgba(255,102,171,0.2), #0d0d1a)',
        }}
      >
        {/* Owner banner edit overlay */}
        {isOwner && (
          <Button
            size="sm"
            onClick={() => setBannerUploadOpen(true)}
            className="absolute top-3 right-3 text-white/70 bg-black/40 backdrop-blur-sm hover:bg-black/60 hover:text-white"
          >
            {tournament.banner_url ? <Pencil data-icon="inline-start" /> : <ImagePlus data-icon="inline-start" />}
            {tournament.banner_url ? 'Change Banner' : 'Add Banner'}
          </Button>
        )}

        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {/* Logo area */}
              {tournament.logo_url ? (
                <div
                  className="relative"
                  style={{ cursor: isOwner ? 'pointer' : 'default' }}
                  onClick={isOwner ? () => setLogoUploadOpen(true) : undefined}
                >
                  <img
                    src={tournament.logo_url}
                    className="size-20 rounded-full object-cover"
                    style={{ border: '3px solid #ff66ab', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    alt=""
                  />
                  {isOwner && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Pencil className="size-5" />
                    </div>
                  )}
                </div>
              ) : isOwner ? (
                <div
                  className="size-20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer transition-all hover:border-[#ff66ab] hover:bg-[rgba(255,102,171,0.1)]"
                  onClick={() => setLogoUploadOpen(true)}
                >
                  <ImagePlus className="size-7 text-white/40" />
                </div>
              ) : null}

              <div>
                {/* Editable tournament name */}
                {editingName ? (
                  <input
                    ref={nameInputRef}
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    className="bg-transparent border-b border-white/30 focus:border-[#ff66ab] outline-none text-white text-[2.5rem] font-bold leading-tight min-w-[300px]"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  />
                ) : (
                  <h3
                    onClick={isOwner ? handleStartEditName : undefined}
                    className={`text-4xl font-bold ${isOwner ? 'cursor-pointer hover:outline hover:outline-dashed hover:outline-white/30 hover:outline-offset-4 hover:rounded' : ''}`}
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  >
                    {tournament.name}
                  </h3>
                )}
                <h6 className="text-xl text-white/70 mt-1">
                  {activeStage ? `${activeStage.name} Mappool` : 'Mappool'}
                </h6>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 opacity-80 bg-black/30 px-3 py-1.5 rounded-lg">
                <span className="text-sm">hosted on</span>
                <span className="font-bold flex items-center">
                  pack
                  <span
                    className="ml-1 px-1 py-0.5 rounded text-xs"
                    style={{ backgroundColor: '#ff66ab' }}
                  >
                    share
                  </span>
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="text-white/70 hover:text-white"
              >
                <Copy data-icon="inline-start" />
                Copy Link
              </Button>
            </div>
          </div>

          {/* Stage Tabs */}
          {stages.length > 0 && (
            <div className="flex gap-0 mt-6 border-b border-white/10">
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStage(s.id)}
                  className={`px-4 py-2 text-base font-bold transition-colors border-b-[3px] ${
                    currentStage === s.id
                      ? 'text-white border-[#ff66ab]'
                      : 'text-white/60 border-transparent hover:text-white/80'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-[1200px] mx-auto px-8 py-4 flex gap-3">
        {maps.length > 0 && (
          <Button
            style={{ backgroundColor: '#ff66ab' }}
            className="hover:opacity-90 text-white"
          >
            <Download data-icon="inline-start" />
            Download All ({maps.length} maps)
          </Button>
        )}
        {isOwner && (
          <Button
            variant="outline"
            onClick={handleOpenAddDialog}
            className="border-[#ff66ab] text-[#ff66ab] hover:bg-[rgba(255,102,171,0.1)] hover:border-[#ff4499]"
          >
            <Plus data-icon="inline-start" />
            Add Maps
          </Button>
        )}
      </div>

      {/* Mappool */}
      <div className="max-w-[1200px] mx-auto px-8 pb-8">
        {maps.length === 0 ? (
          <p className="text-white/40 text-center py-8">
            No maps in this mappool yet
          </p>
        ) : (
          Object.entries(groupedMaps).map(([slot, slotMaps]) => (
            <div key={slot} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-3 py-1 rounded font-bold"
                  style={{ backgroundColor: allSlotColors[slot] || '#666' }}
                >
                  {slotLabels[slot] || slot}
                </span>
                <span className="text-white/50">
                  {slotMaps.length} map{slotMaps.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-col gap-2">
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
              </div>
            </div>
          ))
        )}
      </div>

      {/* Banner Upload Dialog */}
      <Dialog open={bannerUploadOpen} onOpenChange={(open) => { if (!open) setBannerUploadOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tournament.banner_url ? 'Change Banner' : 'Add Banner'}</DialogTitle>
            <DialogDescription className="sr-only">Upload or change the tournament banner image.</DialogDescription>
          </DialogHeader>
          <ImageUpload
            label="Banner Image"
            value={tournament.banner_url || undefined}
            onChange={handleBannerUpload}
            aspectRatio="4/1"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerUploadOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logo Upload Dialog */}
      <Dialog open={logoUploadOpen} onOpenChange={(open) => { if (!open) setLogoUploadOpen(false); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{tournament.logo_url ? 'Change Logo' : 'Add Logo'}</DialogTitle>
            <DialogDescription className="sr-only">Upload or change the tournament logo.</DialogDescription>
          </DialogHeader>
          <ImageUpload
            label="Tournament Logo"
            value={tournament.logo_url || undefined}
            onChange={handleLogoUpload}
            aspectRatio="1/1"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoUploadOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Maps Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setAddDialogOpen(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageOpen className="size-5" style={{ color: '#ff66ab' }} />
              Add Maps
            </DialogTitle>
            <DialogDescription className="sr-only">Add beatmaps to the tournament mappool.</DialogDescription>
          </DialogHeader>

          {/* URL input */}
          <div className="mb-4">
            {fetchedDiffs.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Select a difficulty:</p>
                {fetchedDiffs.map((diff, i) => (
                  <div
                    key={diff.beatmap_id}
                    onClick={() => setSelectedDiffIndex(i)}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer border-2 transition-colors ${
                      selectedDiffIndex === i
                        ? 'border-[#ff66ab] bg-[rgba(255,102,171,0.08)]'
                        : 'border-transparent hover:bg-black/5'
                    }`}
                  >
                    {fetchedMeta && (
                      <img
                        src={`https://assets.ppy.sh/beatmaps/${fetchedMeta.beatmapset_id}/covers/list.jpg`}
                        alt=""
                        className="size-12 rounded object-cover shrink-0"
                      />
                    )}
                    <div>
                      <p className="text-sm font-bold">{diff.difficulty_name}</p>
                      <span className="text-xs text-muted-foreground">
                        {diff.keys}K · {diff.star_rating.toFixed(2)}*
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" onClick={() => { setFetchedDiffs([]); setFetchedMeta(null); setUrlInput(''); }}>Back</Button>
                  <Button
                    size="sm"
                    disabled={selectedDiffIndex === null}
                    onClick={handleAddSelectedDiff}
                    style={{ backgroundColor: '#ff66ab' }}
                    className="text-white hover:opacity-90"
                  >
                    Add to Pending
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                  {urlLoading ? <Spinner className="size-4" /> : <Link className="size-4 text-muted-foreground" />}
                </div>
                <Input
                  className="pl-8"
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
                  aria-invalid={!!urlError}
                  disabled={urlLoading}
                />
                {urlError && <p className="text-xs text-destructive mt-1">{urlError}</p>}
              </div>
            )}
          </div>

          {/* Pending Maps */}
          {pendingMaps.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-bold">
                  Pending Maps ({pendingMaps.length})
                </p>
                {pendingMaps.length > 1 && (
                  <Button
                    size="sm"
                    onClick={handleSubmitAllPending}
                    disabled={pendingMaps.some(m => m.adding)}
                    style={{ backgroundColor: '#ff66ab' }}
                    className="text-white hover:opacity-90"
                  >
                    Add All
                  </Button>
                )}
              </div>
              <div className="flex flex-col">
                {pendingMaps.map((pm) => {
                  const slotColor = pm.customSlotColor || allSlotColors[pm.slot] || '#666';
                  const isEditing = editingMapId === pm.id;
                  return (
                    <div key={pm.id}>
                      <div
                        className={`flex items-center gap-2 py-2 px-2.5 rounded transition-colors ${
                          isEditing ? 'bg-[rgba(255,102,171,0.05)]' : 'hover:bg-black/5'
                        }`}
                      >
                        {/* Thumbnail */}
                        <img
                          src={`https://assets.ppy.sh/beatmaps/${pm.beatmapsetId}/covers/list.jpg`}
                          alt=""
                          className="size-11 rounded object-cover shrink-0"
                        />
                        {/* Slot chip */}
                        <button
                          onClick={() => handleOpenPicker(pm.id, 'slot')}
                          className="px-2 py-0.5 rounded text-xs font-bold text-white cursor-pointer hover:opacity-85 min-w-[40px] text-center"
                          style={{ backgroundColor: slotColor }}
                        >
                          {pm.slot}
                        </button>
                        {/* Mod chips */}
                        {pm.mods.map(mod => (
                          <button
                            key={mod}
                            onClick={() => handleOpenPicker(pm.id, 'mod')}
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold text-white cursor-pointer hover:opacity-85 min-w-[32px] text-center"
                            style={{ backgroundColor: modColors[mod] || '#666' }}
                          >
                            {modIcons[mod] && <img src={modIcons[mod]} alt="" className="size-5" />}
                            {mod}
                          </button>
                        ))}
                        {/* Map info */}
                        <div className="flex-1 min-w-0 ml-1">
                          <p className="text-sm font-medium truncate">
                            {pm.artist} - {pm.title}
                          </p>
                          <span className="text-xs text-muted-foreground truncate block">
                            {pm.difficultyName && `[${pm.difficultyName}] `}
                            {pm.keys > 0 && `${pm.keys}K`}
                            {pm.starRating > 0 && ` · ${pm.starRating.toFixed(2)}*`}
                          </span>
                        </div>
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemovePending(pm.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        {/* Add button */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSubmitPending(pm.id)}
                          disabled={pm.adding}
                          className="text-[#ff66ab] bg-[rgba(255,102,171,0.1)] hover:bg-[rgba(255,102,171,0.2)]"
                        >
                          {pm.adding ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                        </Button>
                      </div>

                      {/* Inline picker panel */}
                      {isEditing && editingField === 'slot' && (
                        <div className="mx-2.5 mb-2 p-3 bg-black/5 rounded">
                          <span className="text-xs text-muted-foreground block mb-2">
                            Select slot
                          </span>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {slots.map(slot => (
                              <button
                                key={slot}
                                onClick={() => setPickerSlot(slot)}
                                className="px-2 py-0.5 rounded text-xs font-bold cursor-pointer hover:opacity-85 border transition-colors"
                                style={{
                                  backgroundColor: pickerSlot === slot ? (allSlotColors[slot] || '#666') : 'transparent',
                                  color: pickerSlot === slot ? 'white' : 'inherit',
                                  borderColor: pickerSlot === slot ? 'transparent' : 'var(--color-border)',
                                }}
                              >
                                {slot}
                              </button>
                            ))}
                            <button
                              onClick={() => setPickerSlot('__custom__')}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer border transition-colors ${
                                pickerSlot === '__custom__' ? 'bg-muted border-transparent' : 'border-border'
                              }`}
                            >
                              <Pencil className="size-3" />
                              Custom...
                            </button>
                          </div>
                          {pickerSlot === '__custom__' && (
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <div className="flex flex-col gap-1">
                                <Label className="text-xs">Slot Name</Label>
                                <Input
                                  className="w-[120px] h-7 text-xs"
                                  value={pickerCustomSlot}
                                  onChange={(e) => setPickerCustomSlot(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                  placeholder="e.g. ACC"
                                />
                              </div>
                              {pickerCustomSlot && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-bold text-white min-w-[40px] text-center"
                                  style={{ backgroundColor: pickerCustomSlotColor }}
                                >
                                  {pickerCustomSlot}
                                </span>
                              )}
                              <div className="flex items-center gap-1 flex-wrap">
                                {colorPalette.map(color => (
                                  <button
                                    key={color}
                                    onClick={() => setPickerCustomSlotColor(color)}
                                    className="size-5 rounded-full cursor-pointer transition-transform hover:scale-110"
                                    style={{
                                      backgroundColor: color,
                                      border: `2px solid ${pickerCustomSlotColor === color ? 'white' : 'transparent'}`,
                                      outline: pickerCustomSlotColor === color ? `2px solid ${color}` : 'none',
                                    }}
                                  />
                                ))}
                                <div className="relative ml-1">
                                  <div
                                    className="absolute left-2 top-1/2 -translate-y-1/2 size-3 rounded-full border border-black/20"
                                    style={{ backgroundColor: pickerCustomSlotColor }}
                                  />
                                  <Input
                                    className="w-[85px] h-6 text-[11px] pl-6 font-mono"
                                    value={pickerCustomSlotColor}
                                    onChange={(e) => {
                                      let v = e.target.value;
                                      if (!v.startsWith('#')) v = '#' + v;
                                      setPickerCustomSlotColor(v.slice(0, 7));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={handleCancelPicker}>Cancel</Button>
                            <Button
                              size="sm"
                              onClick={handleConfirmPicker}
                              disabled={pickerSlot === '__custom__' && !pickerCustomSlot.trim()}
                              style={{ backgroundColor: '#ff66ab' }}
                              className="text-white hover:opacity-90"
                            >
                              <Check data-icon="inline-start" />
                              OK
                            </Button>
                          </div>
                        </div>
                      )}

                      {isEditing && editingField === 'mod' && (
                        <div className="mx-2.5 mb-2 p-3 bg-black/5 rounded">
                          <span className="text-xs text-muted-foreground block mb-2">
                            Select mods
                          </span>
                          {(() => {
                            const isNM = pickerMods.includes('NM');
                            const isFM = pickerMods.includes('FM');
                            const pillsDisabled = isNM || isFM;
                            return (
                              <>
                                <div className="flex flex-wrap gap-1.5 mb-2 items-center">
                                  {['HD', 'HR', 'DT', 'FL'].map(mod => {
                                    const isActive = !pillsDisabled && pickerMods.includes(mod);
                                    return (
                                      <button
                                        key={mod}
                                        onClick={() => handleTogglePickerMod(mod)}
                                        className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold text-white border-2 transition-all"
                                        style={{
                                          backgroundColor: isActive ? (modColors[mod] || '#666') : '#555',
                                          borderColor: isActive ? 'white' : 'transparent',
                                          cursor: pillsDisabled ? 'not-allowed' : 'pointer',
                                          opacity: pillsDisabled ? 0.4 : 1,
                                        }}
                                      >
                                        {modIcons[mod] && <img src={modIcons[mod]} alt="" className="size-5" style={{ opacity: pillsDisabled ? 0.4 : 1 }} />}
                                        {mod}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="flex flex-col gap-2 mb-2">
                                  <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer">
                                    <Checkbox
                                      checked={isNM}
                                      onCheckedChange={() => handleTogglePickerMod('NM')}
                                    />
                                    No Mod
                                  </label>
                                  <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer">
                                    <Checkbox
                                      checked={isFM}
                                      onCheckedChange={() => handleTogglePickerMod('FM')}
                                    />
                                    Free Mod — players choose their own mods
                                  </label>
                                </div>
                              </>
                            );
                          })()}
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={handleCancelPicker}>Cancel</Button>
                            <Button
                              size="sm"
                              onClick={handleConfirmPicker}
                              style={{ backgroundColor: '#ff66ab' }}
                              className="text-white hover:opacity-90"
                            >
                              <Check data-icon="inline-start" />
                              OK
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative flex items-center gap-3 mb-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or select from stash</span>
            <Separator className="flex-1" />
          </div>

          {stash.length === 0 ? (
            <div className="text-center py-8">
              <PackageOpen className="size-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Your stash is empty</p>
              <p className="text-sm text-muted-foreground">
                Save maps from shared packs or the Explore page first
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-auto">
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
