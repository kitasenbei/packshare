import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import { type User, getBeatmapset, type BeatmapsetInfo } from '../api/auth';
import { createPack } from '../api/packs';
import BeatmapRow from './BeatmapRow';

interface PackCreatorProps {
  user?: User | null;
}

interface PackBeatmap {
  beatmapset_id: number;
  beatmap_id?: number;
  title: string;
  artist: string;
  creator: string;
  keys?: number;
  star_rating?: number;
  difficulty_name?: string;
}

export default function PackCreator({ user }: PackCreatorProps) {
  const navigate = useNavigate();
  const [packName, setPackName] = useState('');
  const [packDescription, setPackDescription] = useState('');
  const [beatmapInput, setBeatmapInput] = useState('');
  const [beatmaps, setBeatmaps] = useState<PackBeatmap[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // For difficulty selection dialog
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [pendingBeatmapset, setPendingBeatmapset] = useState<BeatmapsetInfo | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | 'all'>('all');

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

    if (beatmaps.some((b) => b.beatmapset_id === parseInt(id))) {
      setError('Beatmapset already in pack');
      return;
    }

    setLoading(true);
    setError('');

    const beatmapset = await getBeatmapset(parseInt(id));
    if (!beatmapset) {
      setError('Beatmapset not found or has no mania difficulties');
      setLoading(false);
      return;
    }

    if (beatmapset.beatmaps.length === 0) {
      setError('No mania difficulties found in this beatmapset');
      setLoading(false);
      return;
    }

    // If multiple difficulties, show selection dialog
    if (beatmapset.beatmaps.length > 1) {
      setPendingBeatmapset(beatmapset);
      setSelectedDifficulty('all');
      setSelectDialogOpen(true);
    } else {
      // Single difficulty, add directly
      const diff = beatmapset.beatmaps[0];
      setBeatmaps((prev) => [...prev, {
        beatmapset_id: beatmapset.beatmapset_id,
        beatmap_id: diff.beatmap_id,
        title: beatmapset.title,
        artist: beatmapset.artist,
        creator: beatmapset.creator,
        keys: diff.keys,
        star_rating: diff.star_rating,
        difficulty_name: diff.difficulty_name,
      }]);
      setBeatmapInput('');
    }
    setLoading(false);
  };

  const handleConfirmDifficulty = () => {
    if (!pendingBeatmapset) return;

    if (selectedDifficulty === 'all') {
      // Add all difficulties
      const newBeatmaps = pendingBeatmapset.beatmaps.map((diff) => ({
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        beatmap_id: diff.beatmap_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        star_rating: diff.star_rating,
        difficulty_name: diff.difficulty_name,
      }));
      setBeatmaps((prev) => [...prev, ...newBeatmaps]);
    } else {
      // Add selected difficulty
      const diff = pendingBeatmapset.beatmaps.find((b) => b.beatmap_id === selectedDifficulty);
      if (diff) {
        setBeatmaps((prev) => [...prev, {
          beatmapset_id: pendingBeatmapset.beatmapset_id,
          beatmap_id: diff.beatmap_id,
          title: pendingBeatmapset.title,
          artist: pendingBeatmapset.artist,
          creator: pendingBeatmapset.creator,
          keys: diff.keys,
          star_rating: diff.star_rating,
          difficulty_name: diff.difficulty_name,
        }]);
      }
    }

    setBeatmapInput('');
    setSelectDialogOpen(false);
    setPendingBeatmapset(null);
  };

  const handleRemoveBeatmap = (index: number) => {
    setBeatmaps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateLink = async () => {
    if (!packName.trim()) {
      setError('Please enter a pack name');
      return;
    }
    if (beatmaps.length === 0) {
      setError('Add at least one beatmap');
      return;
    }
    if (!user) {
      setError('Please sign in to create packs');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const pack = await createPack({
        name: packName.trim(),
        description: packDescription.trim() || undefined,
        beatmaps: beatmaps.map((b) => ({
          beatmapset_id: b.beatmapset_id,
          title: b.title,
          artist: b.artist,
          creator: b.creator,
          keys: b.keys,
          star_rating: b.star_rating,
          difficulty_name: b.difficulty_name,
        })),
      });

      const link = `${window.location.origin}/s/${pack.share_code}`;
      setGeneratedLink(link);
      setShareDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pack');
    }
    setCreating(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && beatmapInput.trim() && !loading) {
      handleAddBeatmap();
    }
  };

  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        Back
      </Button>

      {/* Not logged in warning */}
      {!user && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You need to sign in to create and save packs.
        </Alert>
      )}

      {/* Header */}
      <Paper elevation={2} sx={{ overflow: 'hidden', mb: 3 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            p: 3,
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
            Create New Pack
          </Typography>

          <Stack spacing={2}>
            <TextField
              placeholder="Pack name..."
              fullWidth
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: 'white',
                    '&::placeholder': { color: 'rgba(255,255,255,0.5)' },
                  },
                },
              }}
              sx={{
                '& .MuiInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 1,
                  px: 2,
                  py: 1,
                },
              }}
            />
            <TextField
              placeholder="Description (optional)..."
              fullWidth
              multiline
              rows={2}
              value={packDescription}
              onChange={(e) => setPackDescription(e.target.value)}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    color: 'white',
                    '&::placeholder': { color: 'rgba(255,255,255,0.5)' },
                  },
                },
              }}
              sx={{
                '& .MuiInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 1,
                  px: 2,
                  py: 1,
                },
              }}
            />
          </Stack>
        </Box>
      </Paper>

      {/* Add Beatmap Section */}
      <Paper elevation={2} sx={{ overflow: 'hidden', mb: 3 }}>
        <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Add Beatmaps
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              placeholder="Paste beatmap ID or osu! URL..."
              fullWidth
              value={beatmapInput}
              onChange={(e) => setBeatmapInput(e.target.value)}
              onKeyDown={handleKeyPress}
              size="small"
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MusicNoteIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleAddBeatmap}
              disabled={!beatmapInput.trim() || loading}
              sx={{
                minWidth: 100,
                backgroundColor: '#ff66ab',
                '&:hover': { backgroundColor: '#ff4499' },
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Add'}
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Supports osu.ppy.sh and nerinyan.moe links, or direct beatmapset IDs
          </Typography>
        </Box>
      </Paper>

      {/* Beatmap List */}
      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            backgroundColor: '#1a1a2e',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Beatmaps
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {beatmaps.length} {beatmaps.length === 1 ? 'map' : 'maps'} added
            </Typography>
          </Box>
          {beatmaps.length > 0 && (
            <Button
              variant="contained"
              startIcon={<ShareIcon />}
              onClick={handleGenerateLink}
              disabled={creating || !user}
              sx={{
                backgroundColor: '#ff66ab',
                '&:hover': { backgroundColor: '#ff4499' },
              }}
            >
              {creating ? 'Creating...' : 'Create & Share'}
            </Button>
          )}
        </Box>

        {beatmaps.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <MusicNoteIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" sx={{ opacity: 0.7 }}>
              No beatmaps yet
            </Typography>
            <Typography variant="body2">
              Paste a beatmap ID or osu! URL above to get started
            </Typography>
          </Box>
        ) : (
          <Box>
            {beatmaps.map((beatmap, index) => (
              <BeatmapRow
                key={`${beatmap.beatmapset_id}-${beatmap.beatmap_id || index}`}
                title={beatmap.title}
                artist={beatmap.artist}
                keys={beatmap.keys}
                creator={beatmap.creator}
                creatorPrefix="mapped by"
                difficultyName={beatmap.difficulty_name}
                starRating={beatmap.star_rating}
                showDivider={index > 0}
                actions={
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Open on osu!">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank')}
                        sx={{ color: 'text.secondary' }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`, '_blank')}
                        sx={{ color: '#4caf50' }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveBeatmap(index)}
                        sx={{ color: '#ff6b6b' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Floating Create Button (when maps exist) */}
      {beatmaps.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 100, right: 32 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<ShareIcon />}
            onClick={handleGenerateLink}
            disabled={creating || !user}
            sx={{
              backgroundColor: '#ff66ab',
              '&:hover': { backgroundColor: '#ff4499' },
              boxShadow: 4,
              px: 3,
              py: 1.5,
            }}
          >
            {creating ? 'Creating...' : 'Create & Share'}
          </Button>
        </Box>
      )}

      {/* Difficulty Selection Dialog */}
      <Dialog open={selectDialogOpen} onClose={() => setSelectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Difficulty</DialogTitle>
        <DialogContent>
          {pendingBeatmapset && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {pendingBeatmapset.artist} - {pendingBeatmapset.title}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={selectedDifficulty}
                  label="Difficulty"
                  onChange={(e) => setSelectedDifficulty(e.target.value as number | 'all')}
                >
                  <MenuItem value="all">All difficulties ({pendingBeatmapset.beatmaps.length})</MenuItem>
                  {pendingBeatmapset.beatmaps.map((diff) => (
                    <MenuItem key={diff.beatmap_id} value={diff.beatmap_id}>
                      [{diff.keys}K] {diff.difficulty_name} - {diff.star_rating.toFixed(2)}*
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmDifficulty}
            sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">Pack Created!</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            Your pack "{packName}" with {beatmaps.length} maps is ready to share!
          </Alert>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Share this link:
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
            }}
          >
            <Typography
              sx={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {generatedLink}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
              <IconButton onClick={handleCopyLink} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {copied && (
            <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
              Copied to clipboard!
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => navigate(`/s/${generatedLink.split('/').pop()}`)}
            sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
          >
            View Pack
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
