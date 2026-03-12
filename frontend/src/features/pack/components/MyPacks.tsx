import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Pencil,
  Copy,
  ExternalLink,
  Plus,
  Link as LinkIcon,
  Package,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import type { StashBeatmap } from '../../../shared/types/beatmap';
import type { User, BeatmapsetInfo } from '../../auth/api/auth';
import { getBeatmapset } from '../../auth/api/auth';
import { getMyPacks, updatePack, deletePack, type Pack, type PackBeatmap } from '../api/packs';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import RemoveButton from '../../../shared/components/RemoveButton';
import { STASH_STORAGE_KEY } from '../../../shared/utils/stash';
const MAPS_PER_PAGE = 5;
const STASH_PER_PAGE = 8;

interface MyPacksProps {
  user?: User | null;
  permissions?: string[];
  isKeySession?: boolean;
  onOpenCreatePack: () => void;
}

function hasPerm(permissions: string[] | undefined, isKey: boolean | undefined, perm: string): boolean {
  if (!isKey) return true;
  return permissions?.includes(perm) ?? false;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  browse: { label: 'Browsed', color: '#4a90d9' },
  download: { label: 'Downloaded', color: '#4ad98f' },
  upload: { label: 'Uploaded', color: '#f5c842' },
  pack: { label: 'From Pack', color: '#b44ad9' },
};

export default function MyPacks({ user, permissions, isKeySession, onOpenCreatePack }: MyPacksProps) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packsError, setPacksError] = useState<string | null>(null);
  const [mapPages, setMapPages] = useState<Record<string, number>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBeatmaps, setEditBeatmaps] = useState<PackBeatmap[]>([]);
  const [beatmapInput, setBeatmapInput] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<Pack | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingBeatmap, setAddingBeatmap] = useState(false);

  // Difficulty selection state
  const [diffSelectOpen, setDiffSelectOpen] = useState(false);
  const [pendingBeatmapset, setPendingBeatmapset] = useState<BeatmapsetInfo | null>(null);

  // Stash state
  const [stash, setStash] = useState<StashBeatmap[]>([]);
  const [stashExpanded, setStashExpanded] = useState(true);
  const [stashPage, setStashPage] = useState(1);
  const [stashFilter, setStashFilter] = useState<'all' | '4K' | '7K'>('all');

  // Load packs from API
  useEffect(() => {
    if (!user) {
      setPacksLoading(false);
      setPacks([]);
      return;
    }

    setPacksLoading(true);
    setPacksError(null);
    getMyPacks()
      .then((data) => {
        setPacks(data);
        setPacksLoading(false);
      })
      .catch((err) => {
        setPacksError(err.message);
        setPacksLoading(false);
      });
  }, [user]);

  // Load stash from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STASH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStash(parsed);
      } catch {
        setStash([]);
      }
    }
  }, []);

  const getMapPage = (packId: string) => mapPages[packId] || 1;
  const setMapPage = (packId: string, page: number) => setMapPages((prev) => ({ ...prev, [packId]: page }));

  const handleEditClick = (pack: Pack) => {
    setEditingPack(pack);
    setEditName(pack.name);
    setEditDescription(pack.description || '');
    setEditBeatmaps([...pack.beatmaps]);
    setError('');
    setBeatmapInput('');
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditingPack(null);
    setError('');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setError('Pack name is required');
      return;
    }
    if (editBeatmaps.length === 0) {
      setError('Pack must have at least one beatmap');
      return;
    }
    if (!editingPack) return;

    setSaving(true);
    setError('');
    try {
      const updated = await updatePack(editingPack.share_code, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        beatmaps: editBeatmaps.map((b) => ({
          beatmapset_id: b.beatmapset_id,
          title: b.title,
          artist: b.artist,
          creator: b.creator,
          keys: b.keys,
          difficulty_name: b.difficulty_name,
          star_rating: b.star_rating,
        })),
      });
      setPacks((prev) =>
        prev.map((p) => (p.share_code === editingPack.share_code ? updated : p))
      );
      handleCloseEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
    setSaving(false);
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

  const handleAddBeatmap = async () => {
    const id = extractBeatmapId(beatmapInput);
    if (!id) {
      setError('Invalid beatmap ID or URL');
      return;
    }

    if (editBeatmaps.some((b) => b.beatmapset_id === parseInt(id))) {
      setError('Beatmap already in pack');
      return;
    }

    setError('');
    setAddingBeatmap(true);

    try {
      const beatmapset = await getBeatmapset(parseInt(id));
      if (!beatmapset) {
        setError('Beatmapset not found or has no mania difficulties');
        setAddingBeatmap(false);
        return;
      }

      if (beatmapset.beatmaps.length === 0) {
        setError('This beatmapset has no mania difficulties');
        setAddingBeatmap(false);
        return;
      }

      // If only one difficulty, add it directly
      if (beatmapset.beatmaps.length === 1) {
        const diff = beatmapset.beatmaps[0];
        const newBeatmap: PackBeatmap = {
          id: diff.beatmap_id,
          beatmapset_id: beatmapset.beatmapset_id,
          title: beatmapset.title,
          artist: beatmapset.artist,
          creator: beatmapset.creator,
          keys: diff.keys,
          difficulty_name: diff.difficulty_name,
          star_rating: diff.star_rating,
          sort_order: editBeatmaps.length,
        };
        setEditBeatmaps((prev) => [...prev, newBeatmap]);
        setBeatmapInput('');
      } else {
        // Multiple difficulties - show selection dialog
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
      // Add all difficulties
      const newBeatmaps: PackBeatmap[] = pendingBeatmapset.beatmaps.map((diff, i) => ({
        id: diff.beatmap_id,
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        difficulty_name: diff.difficulty_name,
        star_rating: diff.star_rating,
        sort_order: editBeatmaps.length + i,
      }));
      setEditBeatmaps((prev) => [...prev, ...newBeatmaps]);
    } else {
      // Add specific difficulty
      const diff = pendingBeatmapset.beatmaps[diffIndex];
      const newBeatmap: PackBeatmap = {
        id: diff.beatmap_id,
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        difficulty_name: diff.difficulty_name,
        star_rating: diff.star_rating,
        sort_order: editBeatmaps.length,
      };
      setEditBeatmaps((prev) => [...prev, newBeatmap]);
    }

    setBeatmapInput('');
    setDiffSelectOpen(false);
    setPendingBeatmapset(null);
  };

  const handleRemoveEditBeatmap = (id: number) => {
    setEditBeatmaps((prev) => prev.filter((b) => b.id !== id));
  };

  const handleDeleteClick = (pack: Pack) => {
    setPackToDelete(pack);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!packToDelete) return;

    setDeleting(true);
    try {
      await deletePack(packToDelete.share_code);
      setPacks((prev) => prev.filter((p) => p.share_code !== packToDelete.share_code));
      setDeleteConfirmOpen(false);
      setPackToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pack');
    }
    setDeleting(false);
  };

  // Stash functions
  const handleRemoveFromStash = (id: number) => {
    const newStash = stash.filter((b) => b.id !== id);
    setStash(newStash);
    localStorage.setItem(STASH_STORAGE_KEY, JSON.stringify(newStash));
  };

  const handleClearStash = () => {
    setStash([]);
    localStorage.removeItem(STASH_STORAGE_KEY);
    setStashPage(1);
  };

  const filteredStash = stash.filter((b) => {
    if (stashFilter === 'all') return true;
    if (stashFilter === '4K') return b.keys === 4;
    if (stashFilter === '7K') return b.keys === 7;
    return true;
  });

  const stashPageCount = Math.ceil(filteredStash.length / STASH_PER_PAGE);
  const displayStash = filteredStash.slice((stashPage - 1) * STASH_PER_PAGE, stashPage * STASH_PER_PAGE);

  const renderPagination = (count: number, current: number, onChange: (page: number) => void) => {
    const pages: (number | 'ellipsis')[] = [];
    for (let i = 1; i <= count; i++) {
      if (i === 1 || i === count || (i >= current - 1 && i <= current + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onChange(Math.max(1, current - 1))}
              className={current <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              text=""
            />
          </PaginationItem>
          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`e-${i}`}>
                <span className="flex size-8 items-center justify-center text-muted-foreground">...</span>
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === current}
                  onClick={() => onChange(p)}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => onChange(Math.min(count, current + 1))}
              className={current >= count ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              text=""
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="size-12 rounded-full border-3 border-primary"
            />
          )}
          <div>
            {user && (
              <p className="text-sm text-muted-foreground">
                {user.username}'s
              </p>
            )}
            <h2 className="text-xl font-bold">
              My Maps
            </h2>
          </div>
        </div>
        {hasPerm(permissions, isKeySession, 'create') && (
          <Button onClick={onOpenCreatePack}>
            <Plus data-icon="inline-start" />
            New Pack
          </Button>
        )}
      </div>

      {/* My Stash Section */}
      <Card className="mb-6 py-0">
        <div
          onClick={() => setStashExpanded(!stashExpanded)}
          className={`flex cursor-pointer items-center p-4 hover:bg-muted/50 ${stashExpanded ? 'border-b' : ''}`}
        >
          <Package className="mr-3 size-5 text-primary" />
          <div className="flex-1">
            <h3 className="text-base font-bold">
              My Stash
            </h3>
            <p className="text-sm text-muted-foreground">
              {stash.length} maps saved · Your collection from packs, downloads, and uploads
            </p>
          </div>
          {stash.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleClearStash(); }}
              className="mr-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
            {stashExpanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>

        {stashExpanded && (
          <>
            {stash.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="mx-auto mb-4 size-12 text-muted-foreground/50" />
                <p className="mb-1 text-muted-foreground">
                  Your stash is empty
                </p>
                <p className="text-sm text-muted-foreground">
                  Save maps from shared packs, downloads, or uploads to build your collection
                </p>
              </div>
            ) : (
              <>
                {/* Filter chips */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  {(['all', '4K', '7K'] as const).map((filter) => (
                    <Badge
                      key={filter}
                      variant={stashFilter === filter ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => {
                        setStashFilter(filter);
                        setStashPage(1);
                      }}
                    >
                      {filter === 'all' ? 'All Maps' : filter}
                    </Badge>
                  ))}
                  <div className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {filteredStash.length} maps
                  </span>
                </div>

                {/* Stash list */}
                <div className="px-4">
                  {displayStash.map((beatmap) => (
                    <BeatmapRow
                      key={beatmap.id}
                      title={beatmap.title}
                      artist={beatmap.artist}
                      keys={beatmap.keys}
                      creator={beatmap.creator}
                      bpm={beatmap.bpm}
                      beatmapsetId={beatmap.beatmapsetId}
                      density="compact"
                      sourceChip={{
                        label: sourceLabels[beatmap.source]?.label || beatmap.source,
                        color: sourceLabels[beatmap.source]?.color || '#666',
                      }}
                      sourceTooltip={beatmap.sourcePackName ? `From: ${beatmap.sourcePackName}` : undefined}
                      actions={
                        <>
                          <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapsetId || beatmap.id}`, '_blank')} />
                          <DownloadButton
                            downloadUrl={`https://api.nerinyan.moe/d/${beatmap.beatmapsetId || beatmap.id}`}
                            downloadName={`${beatmap.artist} - ${beatmap.title}`}
                          />
                          <RemoveButton onClick={() => handleRemoveFromStash(beatmap.id)} />
                        </>
                      }
                    />
                  ))}
                </div>

                {/* Stash pagination */}
                {stashPageCount > 1 && (
                  <div className="flex justify-center border-t py-3">
                    {renderPagination(stashPageCount, stashPage, setStashPage)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>

      {/* Packs Section Header */}
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-base font-bold">
          Packs
        </h3>
        <Badge variant="secondary">{packs.length}</Badge>
      </div>

      {/* Loading state */}
      {packsLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="size-6 text-primary" />
        </div>
      )}

      {/* Error state */}
      {packsError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{packsError}</AlertDescription>
        </Alert>
      )}

      {/* Not logged in state */}
      {!user && !packsLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Sign in to view and create your packs
          </p>
        </Card>
      )}

      {/* Packs list */}
      {user && !packsLoading && (
        <div className="flex flex-col gap-4">
          {packs.map((pack) => {
            const currentPage = getMapPage(pack.share_code);
            const pageCount = Math.ceil(pack.beatmaps.length / MAPS_PER_PAGE);
            const displayMaps = pack.beatmaps.slice((currentPage - 1) * MAPS_PER_PAGE, currentPage * MAPS_PER_PAGE);

            return (
              <Card key={pack.share_code} className="py-0">
                {/* Pack Header */}
                <div className="flex items-center border-b p-4">
                  <div className="flex-1">
                    <h3 className="text-base font-bold">{pack.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {pack.beatmaps.length} maps · {pack.views.toLocaleString()} views · Created at {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground"
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${pack.share_code}`)}
                          />
                        }
                      >
                        <Copy className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>Copy link</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground"
                            render={<Link to={`/s/${pack.share_code}`} />}
                          />
                        }
                      >
                        <LinkIcon className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>Open shared link</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground"
                            render={<Link to={`/pack/${pack.share_code}`} />}
                          />
                        }
                      >
                        <ExternalLink className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>Open full page</TooltipContent>
                    </Tooltip>
                    {hasPerm(permissions, isKeySession, 'edit') && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground"
                              onClick={() => handleEditClick(pack)}
                            />
                          }
                        >
                          <Pencil className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    )}
                    {hasPerm(permissions, isKeySession, 'delete') && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive"
                              onClick={() => handleDeleteClick(pack)}
                            />
                          }
                        >
                          <Trash2 className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Beatmaps List */}
                <div className="p-2">
                  {displayMaps.map((beatmap) => (
                    <BeatmapRow
                      key={beatmap.id}
                      title={beatmap.title}
                      artist={beatmap.artist}
                      keys={beatmap.keys || undefined}
                      creator={beatmap.creator}
                      beatmapsetId={beatmap.beatmapset_id}
                      titleOnly
                      density="compact"
                      actions={
                        <DownloadButton
                          downloadUrl={`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`}
                          downloadName={`${beatmap.artist} - ${beatmap.title}`}
                          stashData={{
                            id: beatmap.id,
                            beatmapsetId: beatmap.beatmapset_id,
                            title: beatmap.title,
                            artist: beatmap.artist,
                            creator: beatmap.creator,
                            keys: beatmap.keys || undefined,
                            source: 'download',
                            sourcePackId: pack.share_code,
                            sourcePackName: pack.name,
                          }}
                        />
                      }
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                  <div className="flex justify-center border-t py-2">
                    {renderPagination(pageCount, currentPage, (p) => setMapPage(pack.share_code, p))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {user && !packsLoading && packs.length === 0 && (
        <Card className="p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            No packs yet
          </p>
          <Button variant="outline" onClick={onOpenCreatePack}>
            <Plus data-icon="inline-start" />
            Create your first pack
          </Button>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Edit Pack</DialogTitle>
              <Button variant="ghost" size="icon-xs" onClick={handleCloseEdit}>
                <X />
              </Button>
            </div>
            <DialogDescription className="sr-only">Edit your pack details and beatmaps</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Pack Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Pack Name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description (optional)</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
              />
            </div>

            <Separator />

            <p className="text-sm font-bold">
              Beatmaps ({editBeatmaps.length})
            </p>

            {/* Add beatmap input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Add beatmap (ID or URL)"
                  value={beatmapInput}
                  onChange={(e) => setBeatmapInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && beatmapInput.trim() && handleAddBeatmap()}
                />
              </div>
              <Button
                onClick={handleAddBeatmap}
                disabled={!beatmapInput.trim() || addingBeatmap}
                className="min-w-[50px]"
              >
                {addingBeatmap ? <Spinner className="size-4" /> : <Plus />}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                  {error}
                  <Button variant="ghost" size="icon-xs" onClick={() => setError('')}>
                    <X className="size-3" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Beatmap list */}
            <div className="max-h-[300px] overflow-auto">
              {editBeatmaps.map((beatmap) => (
                <BeatmapRow
                  key={beatmap.id}
                  title={beatmap.title}
                  artist={beatmap.artist}
                  keys={beatmap.keys || undefined}
                  creator={beatmap.creator}
                  beatmapsetId={beatmap.beatmapset_id}
                  titleOnly
                  density="compact"
                  actions={
                    <RemoveButton onClick={() => handleRemoveEditBeatmap(beatmap.id)} />
                  }
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => !open && setDeleteConfirmOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Pack</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{packToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Difficulty Selection Dialog */}
      <Dialog
        open={diffSelectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDiffSelectOpen(false);
            setPendingBeatmapset(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Select Difficulty</DialogTitle>
            <DialogDescription className="sr-only">Choose which difficulty to add</DialogDescription>
          </DialogHeader>
          {pendingBeatmapset && (
            <div className="flex flex-col gap-2">
              <p className="mb-2 text-sm text-muted-foreground">
                {pendingBeatmapset.artist} - {pendingBeatmapset.title}
              </p>
              <Button
                className="w-full justify-start"
                onClick={() => handleSelectDifficulty('all')}
              >
                Add all {pendingBeatmapset.beatmaps.length} difficulties
              </Button>
              <div className="flex items-center gap-2 py-1">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or select one</span>
                <Separator className="flex-1" />
              </div>
              {pendingBeatmapset.beatmaps.map((diff, index) => (
                <Button
                  key={diff.beatmap_id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSelectDifficulty(index)}
                >
                  <span
                    className="mr-3 flex h-[22px] w-8 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                  >
                    {diff.keys}K
                  </span>
                  <span className="flex flex-1 flex-col text-left">
                    <span className="text-sm">{diff.difficulty_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ★ {diff.star_rating.toFixed(2)}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDiffSelectOpen(false);
                setPendingBeatmapset(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
