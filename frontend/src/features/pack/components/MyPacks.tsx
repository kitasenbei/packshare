import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Avatar,
  Divider,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Alert,
  Chip,
  Collapse,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import InventoryIcon from '@mui/icons-material/Inventory';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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

export default function MyPacks({ user, permissions, isKeySession }: MyPacksProps) {
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user && (
            <Avatar
              src={user.avatar_url}
              sx={{ width: 48, height: 48, border: 3, borderColor: 'primary.main' }}
            />
          )}
          <Box>
            {user && (
              <Typography variant="body2" color="text.secondary">
                {user.username}'s
              </Typography>
            )}
            <Typography variant="h5" fontWeight="bold">
              My Maps
            </Typography>
          </Box>
        </Box>
        {hasPerm(permissions, isKeySession, 'create') && (
          <Button
            component={Link}
            to="/create"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
          >
            New Pack
          </Button>
        )}
      </Box>

      {/* My Stash Section */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          onClick={() => setStashExpanded(!stashExpanded)}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: stashExpanded ? 1 : 0,
            borderColor: 'divider',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <InventoryIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              My Stash
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stash.length} maps saved · Your collection from packs, downloads, and uploads
            </Typography>
          </Box>
          {stash.length > 0 && (
            <Button
              size="small"
              startIcon={<DeleteIcon />}
              onClick={(e) => { e.stopPropagation(); handleClearStash(); }}
              sx={{
                textTransform: 'none',
                fontSize: 12,
                color: 'text.disabled',
                mr: 1,
                '&:hover': { color: 'error.main' },
              }}
            >
              Clear
            </Button>
          )}
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            {stashExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={stashExpanded}>
          {stash.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary" gutterBottom>
                Your stash is empty
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Save maps from shared packs, downloads, or uploads to build your collection
              </Typography>
            </Box>
          ) : (
            <>
              {/* Filter chips */}
              <Box sx={{ p: 2, pb: 1, display: 'flex', gap: 1 }}>
                {(['all', '4K', '7K'] as const).map((filter) => (
                  <Chip
                    key={filter}
                    label={filter === 'all' ? 'All Maps' : filter}
                    size="small"
                    onClick={() => {
                      setStashFilter(filter);
                      setStashPage(1);
                    }}
                    sx={{
                      backgroundColor: stashFilter === filter ? 'primary.main' : undefined,
                      color: stashFilter === filter ? 'white' : undefined,
                      '&:hover': { backgroundColor: stashFilter === filter ? 'primary.dark' : undefined },
                    }}
                  />
                ))}
                <Box sx={{ flex: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  {filteredStash.length} maps
                </Typography>
              </Box>

              {/* Stash list */}
              <Box sx={{ px: 2 }}>
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
              </Box>

              {/* Stash pagination */}
              {stashPageCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Pagination
                    size="small"
                    count={stashPageCount}
                    page={stashPage}
                    onChange={(_, p) => setStashPage(p)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Collapse>
      </Paper>

      {/* Packs Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Packs
        </Typography>
        <Chip label={packs.length} size="small" />
      </Box>

      {/* Loading state */}
      {packsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {/* Error state */}
      {packsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {packsError}
        </Alert>
      )}

      {/* Not logged in state */}
      {!user && !packsLoading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" gutterBottom>
            Sign in to view and create your packs
          </Typography>
        </Paper>
      )}

      {/* Packs list */}
      {user && !packsLoading && (
        <Stack spacing={2}>
          {packs.map((pack) => {
            const currentPage = getMapPage(pack.share_code);
            const pageCount = Math.ceil(pack.beatmaps.length / MAPS_PER_PAGE);
            const displayMaps = pack.beatmaps.slice((currentPage - 1) * MAPS_PER_PAGE, currentPage * MAPS_PER_PAGE);

            return (
              <Paper key={pack.share_code} sx={{ overflow: 'hidden' }}>
                {/* Pack Header */}
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold">{pack.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pack.beatmaps.length} maps · {pack.views.toLocaleString()} views · Created at {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Copy link">
                      <IconButton
                        size="small"
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${pack.share_code}`)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open shared link">
                      <IconButton size="small" component={Link} to={`/s/${pack.share_code}`} sx={{ color: 'text.secondary' }}>
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open full page">
                      <IconButton size="small" component={Link} to={`/pack/${pack.share_code}`} sx={{ color: 'text.secondary' }}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {hasPerm(permissions, isKeySession, 'edit') && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditClick(pack)} sx={{ color: 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {hasPerm(permissions, isKeySession, 'delete') && (
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteClick(pack)} sx={{ color: 'error.main' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Box>

                {/* Beatmaps List */}
                <Box sx={{ p: 1 }}>
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
                </Box>

                {/* Pagination */}
                {pageCount > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Pagination
                      size="small"
                      count={pageCount}
                      page={currentPage}
                      onChange={(_, p) => setMapPage(pack.share_code, p)}
                      color="primary"
                    />
                  </Box>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      {user && !packsLoading && packs.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" gutterBottom>
            No packs yet
          </Typography>
          <Button
            component={Link}
            to="/create"
            variant="outlined"
            startIcon={<AddIcon />}
          >
            Create your first pack
          </Button>
        </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Pack
          <IconButton size="small" onClick={handleCloseEdit}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Pack Name"
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" fontWeight="bold">
              Beatmaps ({editBeatmaps.length})
            </Typography>

            {/* Add beatmap input */}
            <Stack direction="row" spacing={1}>
              <TextField
                label="Add beatmap (ID or URL)"
                fullWidth
                size="small"
                value={beatmapInput}
                onChange={(e) => setBeatmapInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && beatmapInput.trim() && handleAddBeatmap()}
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
                onClick={handleAddBeatmap}
                disabled={!beatmapInput.trim() || addingBeatmap}
                sx={{ minWidth: 50 }}
              >
                {addingBeatmap ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <AddIcon />}
              </Button>
            </Stack>

            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Beatmap list */}
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
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
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={saving}
            sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Pack</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{packToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Difficulty Selection Dialog */}
      <Dialog
        open={diffSelectOpen}
        onClose={() => {
          setDiffSelectOpen(false);
          setPendingBeatmapset(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select Difficulty</DialogTitle>
        <DialogContent dividers>
          {pendingBeatmapset && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {pendingBeatmapset.artist} - {pendingBeatmapset.title}
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => handleSelectDifficulty('all')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                Add all {pendingBeatmapset.beatmaps.length} difficulties
              </Button>
              <Divider sx={{ my: 1 }}>or select one</Divider>
              {pendingBeatmapset.beatmaps.map((diff, index) => (
                <Button
                  key={diff.beatmap_id}
                  variant="outlined"
                  fullWidth
                  onClick={() => handleSelectDifficulty(index)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 22,
                      backgroundColor: 'primary.main',
                      borderRadius: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 'bold',
                      mr: 1.5,
                    }}
                  >
                    {diff.keys}K
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'left' }}>
                    <Typography variant="body2">{diff.difficulty_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ★ {diff.star_rating.toFixed(2)}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDiffSelectOpen(false);
              setPendingBeatmapset(null);
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
