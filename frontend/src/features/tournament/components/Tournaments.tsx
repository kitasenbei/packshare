import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { User } from '../../auth/api/auth';
import { listTournaments, createTournament, deleteTournament, type Tournament } from '../api/tournaments';
import TournamentCard from './TournamentCard';

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

  const canSubmit = tournamentName.trim().length > 0 && abbreviation.trim().length > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-2xl font-bold mb-1">
            Tournament Mappools
          </h4>
          <p className="text-muted-foreground">
            Host and share professional tournament mappools
          </p>
        </div>
        {user && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus data-icon="inline-start" />
            Create Tournament
          </Button>
        )}
      </div>

      {/* Tournament List */}
      {tournaments.length === 0 ? (
        <div className="text-center py-8">
          <h6 className="text-lg text-muted-foreground">No tournaments yet</h6>
          <p className="text-sm text-muted-foreground">Create your first tournament to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              isOwner={tournament.user?.osu_id === user?.osu_id}
              onClick={() => navigate(`/t/${tournament.abbreviation}`)}
              onDelete={(e) => handleDelete(tournament.abbreviation, e)}
            />
          ))}
        </div>
      )}

      {/* Create Tournament Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Tournament</DialogTitle>
            <DialogDescription className="sr-only">Fill in the details to create a new tournament.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tournament-name">Tournament Name</Label>
              <Input
                id="tournament-name"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. Community Cup 2024"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="abbreviation">Abbreviation (URL slug)</Label>
              <Input
                id="abbreviation"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. cc-2024"
              />
              <p className="text-xs text-muted-foreground">
                {abbreviation ? `URL: /t/${abbreviation}` : 'Used in the tournament URL'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => v && setFormat(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1v1">1v1</SelectItem>
                  <SelectItem value="2v2">2v2</SelectItem>
                  <SelectItem value="3v3">3v3</SelectItem>
                  <SelectItem value="4v4">4v4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive mt-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? <Spinner /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
