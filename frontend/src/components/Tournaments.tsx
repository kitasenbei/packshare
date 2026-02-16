import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/Link';
import ImageUpload from './ImageUpload';
import type { User } from '../api/auth';
import type { Tournament } from '../api/tournaments';
import { listTournaments, createTournament, deleteTournament } from '../api/tournaments';

const steps = ['Tournament Info', 'Stages'];

const presetStages = ['Qualifiers', 'Group Stage', 'RO64', 'RO32', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals'];

interface TournamentsProps {
  user: User | null;
}

export default function Tournaments({ user }: TournamentsProps) {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Info
  const [tournamentName, setTournamentName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [format, setFormat] = useState('1v1');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Step 2: Stages
  const [selectedStages, setSelectedStages] = useState<string[]>(['Qualifiers', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals']);
  const [customStage, setCustomStage] = useState('');

  // Success state
  const [createdAbbrev, setCreatedAbbrev] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await listTournaments();
      setTournaments(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setActiveStep(0);
    setTournamentName('');
    setAbbreviation('');
    setFormat('1v1');
    setBannerUrl(null);
    setLogoUrl(null);
    setSelectedStages(['Qualifiers', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals']);
    setCustomStage('');
    setCreatedAbbrev('');
    setError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await createTournament({
        name: tournamentName.trim(),
        abbreviation: abbreviation.trim(),
        format,
        banner_url: bannerUrl || undefined,
        logo_url: logoUrl || undefined,
        stages: selectedStages.map(name => ({ name })),
      });
      setCreatedAbbrev(result.abbreviation);
      setActiveStep(steps.length); // success step
      loadTournaments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (abbrev: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this tournament? This cannot be undone.')) return;
    try {
      await deleteTournament(abbrev);
      setTournaments(prev => prev.filter(t => t.abbreviation !== abbrev));
    } catch {
      // ignore
    }
  };

  const handleAddCustomStage = () => {
    const name = customStage.trim();
    if (name && !selectedStages.includes(name)) {
      setSelectedStages([...selectedStages, name]);
      setCustomStage('');
    }
  };

  const isOwner = (tournament: Tournament) => tournament.user?.osu_id === user?.osu_id;

  const canCreateStep0 = tournamentName.trim().length > 0 && abbreviation.trim().length > 0;
  const canCreateStep1 = selectedStages.length > 0;

  const statusColors: Record<string, string> = {
    live: '#ff4444',
    upcoming: '#4488ff',
    completed: '#44bb44',
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Tournament Mappools
          </Typography>
          <Typography color="text.secondary">
            Host and share professional tournament mappools
          </Typography>
        </Box>
        {user && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
          >
            Create Tournament
          </Button>
        )}
      </Box>

      {/* Tournament List */}
      {tournaments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" variant="h6">No tournaments yet</Typography>
          <Typography color="text.secondary" variant="body2">Create your first tournament to get started</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              onClick={() => navigate(`/t/${tournament.abbreviation}`)}
              sx={{
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                transition: 'all 0.2s',
              }}
            >
              {/* Banner */}
              <Box
                sx={{
                  height: 100,
                  backgroundImage: tournament.banner_url
                    ? `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.3)), url(${tournament.banner_url})`
                    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  px: 3,
                  gap: 2,
                }}
              >
                {tournament.logo_url && (
                  <Avatar
                    src={tournament.logo_url}
                    sx={{ width: 64, height: 64, border: '3px solid white' }}
                  />
                )}
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {tournament.name}
                    </Typography>
                    <Chip
                      label={tournament.status.toUpperCase()}
                      size="small"
                      sx={{ backgroundColor: statusColors[tournament.status] || '#666', color: 'white', fontWeight: 'bold', fontSize: 10 }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {tournament.format} · {tournament.stages?.length || 0} stages
                  </Typography>
                </Box>
                {isOwner(tournament) && (
                  <IconButton
                    onClick={(e) => handleDelete(tournament.abbreviation, e)}
                    sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ff4444' } }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>

              {/* Stages */}
              {tournament.stages && tournament.stages.length > 0 && (
                <CardContent sx={{ py: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                    {tournament.stages.map((stage) => (
                      <Chip
                        key={stage.id}
                        label={stage.name}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </CardContent>
              )}
            </Card>
          ))}
        </Stack>
      )}

      {/* Create Tournament Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {activeStep < steps.length ? 'Create Tournament' : 'Tournament Created!'}
        </DialogTitle>
        <DialogContent>
          {activeStep < steps.length && (
            <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          {activeStep === 0 && (
            <Stack spacing={3}>
              <TextField
                label="Tournament Name"
                fullWidth
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. Community Cup 2024"
              />
              <TextField
                label="Abbreviation (URL slug)"
                fullWidth
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. cc-2024"
                helperText={abbreviation ? `URL: /t/${abbreviation}` : 'Used in the tournament URL'}
              />
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select value={format} label="Format" onChange={(e) => setFormat(e.target.value)}>
                  <MenuItem value="1v1">1v1</MenuItem>
                  <MenuItem value="2v2">2v2</MenuItem>
                  <MenuItem value="3v3">3v3</MenuItem>
                  <MenuItem value="4v4">4v4</MenuItem>
                </Select>
              </FormControl>
              <ImageUpload
                label="Banner Image (optional)"
                value={bannerUrl || undefined}
                onChange={(url) => setBannerUrl(url)}
                aspectRatio="4/1"
              />
              <ImageUpload
                label="Logo (optional)"
                value={logoUrl || undefined}
                onChange={(url) => setLogoUrl(url)}
                aspectRatio="1/1"
              />
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Select stages or add custom ones:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {presetStages.map((stage) => (
                  <Chip
                    key={stage}
                    label={stage}
                    onClick={() => {
                      if (selectedStages.includes(stage)) {
                        setSelectedStages(selectedStages.filter(s => s !== stage));
                      } else {
                        setSelectedStages([...selectedStages, stage]);
                      }
                    }}
                    color={selectedStages.includes(stage) ? 'primary' : 'default'}
                    variant={selectedStages.includes(stage) ? 'filled' : 'outlined'}
                    sx={selectedStages.includes(stage) ? { backgroundColor: 'primary.main' } : {}}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Custom stage name"
                  value={customStage}
                  onChange={(e) => setCustomStage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStage()}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddCustomStage}
                  disabled={!customStage.trim()}
                >
                  Add
                </Button>
              </Stack>
              {/* Show custom stages that aren't presets */}
              {selectedStages.filter(s => !presetStages.includes(s)).length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {selectedStages.filter(s => !presetStages.includes(s)).map((stage) => (
                    <Chip
                      key={stage}
                      label={stage}
                      onDelete={() => setSelectedStages(selectedStages.filter(s => s !== stage))}
                      color="primary"
                      sx={{ backgroundColor: 'primary.main' }}
                    />
                  ))}
                </Stack>
              )}
              <Typography variant="caption" color="text.secondary">
                {selectedStages.length} stages selected
              </Typography>
            </Stack>
          )}

          {activeStep === steps.length && (
            <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#4caf50' }} />
              <Typography variant="h6" textAlign="center">
                Your tournament is ready!
              </Typography>
              <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 1, width: '100%' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Share this link with your players:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon color="action" />
                  <Typography sx={{ fontFamily: 'monospace', flex: 1 }}>
                    {window.location.origin}/t/{createdAbbrev}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${createdAbbrev}`)}
                  >
                    Copy
                  </Button>
                </Box>
              </Box>
            </Stack>
          )}

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {activeStep < steps.length ? (
            <>
              <Button onClick={handleClose}>Cancel</Button>
              <Box sx={{ flex: 1 }} />
              {activeStep > 0 && (
                <Button onClick={() => setActiveStep(activeStep - 1)}>Back</Button>
              )}
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!canCreateStep1 || submitting}
                  sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
                >
                  {submitting ? <CircularProgress size={20} /> : 'Create Tournament'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(activeStep + 1)}
                  disabled={!canCreateStep0}
                  sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
                >
                  Next
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={handleClose}>Close</Button>
              <Button
                variant="contained"
                component={Link}
                to={`/t/${createdAbbrev}`}
                sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
              >
                View Tournament
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
