import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
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
  Table,
  TableBody,
  TableRow,
  TableCell,
  Step,
  StepLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PreviewIcon from '@mui/icons-material/Preview';
import BackButton from '../../../shared/components/BackButton';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { type User, getBeatmapset, type BeatmapsetInfo } from '../../auth/api/auth';
import { createPack } from '../api/packs';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import RemoveButton from '../../../shared/components/RemoveButton';

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

  const handleAddBeatmap = async (input?: string) => {
    const value = input ?? beatmapInput;
    const id = extractBeatmapId(value);
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted && extractBeatmapId(pasted) && !loading) {
      e.preventDefault();
      setBeatmapInput(pasted);
      handleAddBeatmap(pasted);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.getData('text').trim();
    if (dropped && extractBeatmapId(dropped) && !loading) {
      setBeatmapInput(dropped);
      handleAddBeatmap(dropped);
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
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Pack Details
      </Typography>
      <Stack spacing={2}>
        <TextField
          placeholder="Pack name..."
          fullWidth
          value={packName}
          onChange={(e) => setPackName(e.target.value)}
          slotProps={{
            input: {
              sx: { fontSize: 24, fontWeight: 'bold' },
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
        />
      </Stack>
    </Card>
  );

  const renderStepBeatmaps = () => (
    <>
      {/* Add Beatmap Section */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader title="Add Beatmaps" slotProps={{ title: { variant: 'subtitle1', fontWeight: 'bold' } }} />
        <Box sx={{ p: 2, pt: 0 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              placeholder="Paste beatmap ID or osu! URL..."
              fullWidth
              value={beatmapInput}
              onChange={(e) => setBeatmapInput(e.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
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
              onClick={() => handleAddBeatmap()}
              disabled={!beatmapInput.trim() || loading}
              sx={{ minWidth: 100 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Add'}
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
      </Card>

      {/* Inline Difficulty Selection */}
      {pendingBeatmapset && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            title="Select Difficulties"
            subheader={`${pendingBeatmapset.artist} - ${pendingBeatmapset.title}`}
            action={
              <Button
                size="small"
                onClick={() => {
                  const allIds = pendingBeatmapset.beatmaps.map((d) => d.beatmap_id);
                  setSelectedDiffs((prev) =>
                    prev.size === allIds.length ? new Set() : new Set(allIds),
                  );
                }}
              >
                {selectedDiffs.size === pendingBeatmapset.beatmaps.length ? 'Deselect all' : 'Select all'}
              </Button>
            }
          />
          <Box sx={{ px: 2, pb: 1 }}>
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
            <Button variant="outlined" onClick={() => setPendingBeatmapset(null)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmDifficulty}
              disabled={selectedDiffs.size === 0}
            >
              Add {selectedDiffs.size > 0 ? `(${selectedDiffs.size})` : ''}
            </Button>
          </Box>
        </Card>
      )}

      {/* Beatmap List */}
      <Card variant="outlined">
        <CardHeader
          title="Beatmaps"
          subheader={`${beatmaps.length} ${beatmaps.length === 1 ? 'map' : 'maps'} added`}
        />

        {beatmaps.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <MusicNoteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No beatmaps yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Paste a beatmap ID or osu! URL above to get started
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2, pt: 0 }}>
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
      </Card>
    </>
  );

  const renderStepReview = () => {
    const uniqueArtists = new Set(beatmaps.map((b) => b.artist)).size;
    const keysCounts = beatmaps.reduce<Record<number, number>>((acc, b) => {
      if (b.keys) acc[b.keys] = (acc[b.keys] || 0) + 1;
      return acc;
    }, {});

    return (
      <>
        <Alert severity="info" icon={<PreviewIcon />} sx={{ mb: 3 }}>
          Review your pack before creating. You can go back to make changes.
        </Alert>

        {/* Summary table */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            title="Summary"
            action={
              <Button size="small" onClick={() => setStep(0)}>
                Edit
              </Button>
            }
          />
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: 120 }}>Name</TableCell>
                <TableCell>{packName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Description</TableCell>
                <TableCell sx={{ color: packDescription ? 'text.primary' : 'text.disabled', fontStyle: packDescription ? undefined : 'italic' }}>
                  {packDescription || 'None'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Beatmaps</TableCell>
                <TableCell>{beatmaps.length}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Artists</TableCell>
                <TableCell>{uniqueArtists}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Keys</TableCell>
                <TableCell>
                  {Object.entries(keysCounts)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([k, count]) => `${k}K (${count})`)
                    .join(', ')}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        {/* Beatmap list */}
        <Card variant="outlined">
          <CardHeader
            title={`Beatmaps (${beatmaps.length})`}
            action={
              <Button size="small" onClick={() => setStep(1)}>
                Edit
              </Button>
            }
          />
          <Box sx={{ px: 2, pb: 1 }}>
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
                density="compact"
              />
            ))}
          </Box>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
      </>
    );
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Not logged in warning */}
      {!user && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You need to sign in to create and save packs.
        </Alert>
      )}

      {/* Header */}
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Create New Pack
      </Typography>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 3 }}>
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
        >
          Back
        </Button>

        {step < 2 ? (
          <Button
            variant="contained"
            endIcon={<NavigateNextIcon />}
            onClick={() => { setError(''); setStep((s) => s + 1); }}
            disabled={!canAdvance(step)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<ShareIcon />}
            onClick={handleGenerateLink}
            disabled={creating || !user}
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
              backgroundColor: 'action.hover',
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
          <Button variant="outlined" onClick={() => setShareDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => navigate(`/s/${generatedLink.split('/').pop()}`)}
          >
            View Pack
          </Button>
        </DialogActions>
      </Dialog>

      <BackButton onClick={() => navigate(-1)} />
    </Box>
  );
}
