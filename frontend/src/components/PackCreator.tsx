import { useEffect, useState } from 'react';
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
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { type User, getBeatmapset, type BeatmapsetInfo } from '../api/auth';
import { createPack } from '../api/packs';
import BeatmapRow from './BeatmapRow';
import DownloadButton from './DownloadButton';
import OsuButton from './OsuButton';
import RemoveButton from './RemoveButton';

interface PackCreatorProps {
  user?: User | null;
  permissions?: string[];
  isKeySession?: boolean;
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

const STEPS = ['Details', 'Beatmaps', 'Review'];

export default function PackCreator({ user, permissions, isKeySession }: PackCreatorProps) {
  const navigate = useNavigate();

  if (isKeySession && !permissions?.includes('create')) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Your access key doesn't have permission to create packs
        </Typography>
      </Box>
    );
  }
  const [step, setStep] = useState(0);
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

  // For inline difficulty selection
  const [pendingBeatmapset, setPendingBeatmapset] = useState<BeatmapsetInfo | null>(null);
  const [selectedDiffs, setSelectedDiffs] = useState<Set<number>>(new Set());

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
      setSelectedDiffs(new Set(beatmapset.beatmaps.map((d) => d.beatmap_id)));
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

  const handleToggleDiff = (id: number) => {
    setSelectedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDifficulty = () => {
    if (!pendingBeatmapset || selectedDiffs.size === 0) return;

    const newBeatmaps = pendingBeatmapset.beatmaps
      .filter((d) => selectedDiffs.has(d.beatmap_id))
      .map((diff) => ({
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

    setBeatmapInput('');
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

  const canAdvance = (s: number) => {
    if (s === 0) return packName.trim().length > 0;
    if (s === 1) return beatmaps.length > 0;
    return true;
  };

  useEffect(() => {
    const handleCtrlEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (step < 2 && canAdvance(step)) {
          setError('');
          setStep((s) => s + 1);
        } else if (step === 2 && !creating && user) {
          handleGenerateLink();
        }
      }
    };
    window.addEventListener('keydown', handleCtrlEnter);
    return () => window.removeEventListener('keydown', handleCtrlEnter);
  });

  const renderStepDetails = () => (
    <Paper elevation={2} sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          p: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          Pack Details
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
  );

  const renderStepBeatmaps = () => (
    <>
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
                backgroundColor: 'primary.main',
                '&:hover': { backgroundColor: 'primary.dark' },
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

      {/* Inline Difficulty Selection */}
      {pendingBeatmapset && (
        <Paper elevation={2} sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Select Difficulties
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pendingBeatmapset.artist} - {pendingBeatmapset.title}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => {
                const allIds = pendingBeatmapset.beatmaps.map((d) => d.beatmap_id);
                setSelectedDiffs((prev) =>
                  prev.size === allIds.length ? new Set() : new Set(allIds),
                );
              }}
              sx={{ color: 'primary.main' }}
            >
              {selectedDiffs.size === pendingBeatmapset.beatmaps.length ? 'Deselect all' : 'Select all'}
            </Button>
          </Box>
          <Box sx={{ p: 2 }}>
            {pendingBeatmapset.beatmaps.map((diff) => (
              <BeatmapRow
                key={diff.beatmap_id}
                beatmapsetId={pendingBeatmapset.beatmapset_id}
                title={pendingBeatmapset.title}
                artist={pendingBeatmapset.artist}
                keys={diff.keys}
                creator={pendingBeatmapset.creator}
                creatorPrefix="mapped by"
                difficultyName={diff.difficulty_name}
                starRating={diff.star_rating}
                density="compact"
                onClick={() => handleToggleDiff(diff.beatmap_id)}
                checkbox={{
                  checked: selectedDiffs.has(diff.beatmap_id),
                  onChange: () => handleToggleDiff(diff.beatmap_id),
                }}
              />
            ))}
          </Box>
          <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setPendingBeatmapset(null)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmDifficulty}
              disabled={selectedDiffs.size === 0}
              sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
            >
              Add {selectedDiffs.size > 0 ? `(${selectedDiffs.size})` : ''}
            </Button>
          </Box>
        </Paper>
      )}

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
          <Box sx={{ p: 2 }}>
            {beatmaps.map((beatmap, index) => (
              <BeatmapRow
                key={`${beatmap.beatmapset_id}-${beatmap.beatmap_id || index}`}
                beatmapsetId={beatmap.beatmapset_id}
                title={beatmap.title}
                artist={beatmap.artist}
                keys={beatmap.keys}
                creator={beatmap.creator}
                creatorPrefix="mapped by"
                difficultyName={beatmap.difficulty_name}
                starRating={beatmap.star_rating}
                actions={
                  <Stack direction="row" spacing={0.5}>
                    <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank')} />
                    <DownloadButton
                      downloadUrl={`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`}
                      downloadName={`${beatmap.artist} - ${beatmap.title}`}
                      stashData={{
                        id: beatmap.beatmapset_id,
                        beatmapsetId: beatmap.beatmapset_id,
                        title: beatmap.title,
                        artist: beatmap.artist,
                        creator: beatmap.creator,
                        keys: beatmap.keys,
                        source: 'download',
                      }}
                    />
                    <RemoveButton onClick={() => handleRemoveBeatmap(index)} />
                  </Stack>
                }
              />
            ))}
          </Box>
        )}
      </Paper>
    </>
  );

  const renderStepReview = () => (
    <>
      {/* Pack Info Summary */}
      <Paper elevation={2} sx={{ overflow: 'hidden', mb: 3 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            p: 3,
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            {packName}
          </Typography>
          {packDescription && (
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              {packDescription}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Read-only Beatmap List */}
      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            backgroundColor: '#1a1a2e',
            color: 'white',
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Beatmaps
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {beatmaps.length} {beatmaps.length === 1 ? 'map' : 'maps'}
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          {beatmaps.map((beatmap, index) => (
            <BeatmapRow
              key={`${beatmap.beatmapset_id}-${beatmap.beatmap_id || index}`}
              beatmapsetId={beatmap.beatmapset_id}
              title={beatmap.title}
              artist={beatmap.artist}
              keys={beatmap.keys}
              creator={beatmap.creator}
              creatorPrefix="mapped by"
              difficultyName={beatmap.difficulty_name}
              starRating={beatmap.star_rating}
            />
          ))}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
    </>
  );

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
          <Typography variant="h4" fontWeight="bold">
            Create New Pack
          </Typography>
        </Box>
      </Paper>

      {/* Stepper */}
      <Stepper
        activeStep={step}
        sx={{
          mb: 3,
          '& .MuiStepIcon-root.Mui-active': { color: 'primary.main' },
          '& .MuiStepIcon-root.Mui-completed': { color: 'primary.main' },
        }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      {step === 0 && renderStepDetails()}
      {step === 1 && renderStepBeatmaps()}
      {step === 2 && renderStepReview()}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          startIcon={<NavigateBeforeIcon />}
          onClick={() => { setError(''); setStep((s) => s - 1); }}
          disabled={step === 0}
          sx={{ color: 'text.secondary' }}
        >
          Back
        </Button>

        {step < 2 ? (
          <Button
            variant="contained"
            endIcon={<NavigateNextIcon />}
            onClick={() => { setError(''); setStep((s) => s + 1); }}
            disabled={!canAdvance(step)}
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': { backgroundColor: 'primary.dark' },
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<ShareIcon />}
            onClick={handleGenerateLink}
            disabled={creating || !user}
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': { backgroundColor: 'primary.dark' },
            }}
          >
            {creating ? 'Creating...' : 'Create & Share'}
          </Button>
        )}
      </Box>

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
            sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
          >
            View Pack
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
