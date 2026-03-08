import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { User } from '../../auth/api/auth';
import type { Tournament } from '../api/tournaments';
import { listTournaments, createTournament, deleteTournament } from '../api/tournaments';

const DEFAULT_STAGES = ['Qualifiers', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals'];

interface TournamentsProps {
  user: User | null;
}

export default function Tournaments({ user }: TournamentsProps) {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [tournamentName, setTournamentName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [format, setFormat] = useState('1v1');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await listTournaments();
      setTournaments(data);
    } catch {
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setTournamentName('');
    setAbbreviation('');
    setFormat('1v1');
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
        stages: DEFAULT_STAGES.map(name => ({ name })),
      });
      handleClose();
      navigate(`/t/${result.abbreviation}`);
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

  const isOwner = (tournament: Tournament) => tournament.user?.osu_id === user?.osu_id;
  const canSubmit = tournamentName.trim().length > 0 && abbreviation.trim().length > 0;

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
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Create Tournament</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Tournament Name"
              fullWidth
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="e.g. Community Cup 2024"
              autoFocus
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
          </Stack>

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
