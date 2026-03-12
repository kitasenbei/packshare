import { useState, useEffect } from 'react';
import { Plus, Trophy, Clock, Tv, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import type { User } from '../../auth/api/auth';
import { placeholderBanner, placeholderLogo } from '../utils/placeholders';
import {
  listTournaments,
  type Tournament,
} from '../api/tournaments';
import { statusColors } from './TournamentStatus';

const statusIcons: Record<string, React.ReactElement> = {
  upcoming: <Clock className="size-3" />,
  live: <Tv className="size-3" />,
  completed: <CheckCircle2 className="size-3" />,
};

interface TournamentListSectionProps {
  user: User;
  onCreate: () => void;
  onSelect: (t: Tournament) => void;
}

export default function TournamentListSection({
  user,
  onCreate,
  onSelect,
}: TournamentListSectionProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listTournaments()
      .then((all) => {
        setTournaments(all.filter((t) => t.user?.osu_id === user.osu_id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.osu_id]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Tournaments</h2>
        <Button size="sm" onClick={onCreate}>
          <Plus className="size-4" />
          New Tournament
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : tournaments.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Trophy className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No tournaments yet</h3>
          <p className="mx-auto mb-6 max-w-[360px] text-sm text-muted-foreground">
            Create a tournament to manage mappools, set up brackets, and share everything with your players
          </p>
          <Button size="lg" onClick={onCreate} className="font-bold">
            <Plus className="size-4" />
            Create your first tournament
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} onClick={() => onSelect(t)} />
          ))}
        </div>
      )}
    </>
  );
}

function TournamentCard({ tournament, onClick }: { tournament: Tournament; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="relative h-[140px] cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-px hover:ring-2 hover:ring-primary hover:shadow-lg"
    >
      {/* Full banner background */}
      <img
        src={tournament.banner_url || placeholderBanner}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)' }}
      />

      {/* Content overlay */}
      <div className="relative flex h-full items-end gap-4 p-4">
        {/* Logo bottom-left */}
        <img
          src={tournament.logo_url || placeholderLogo}
          alt=""
          className="size-14 shrink-0 rounded-lg object-cover"
        />

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold leading-tight text-white">
            {tournament.name}
          </h3>
          <span
            className="mt-1 inline-flex h-[22px] w-fit items-center gap-1 rounded-full px-2 text-[10px] font-bold capitalize text-white"
            style={{ backgroundColor: `${statusColors[tournament.status]}dd` }}
          >
            {statusIcons[tournament.status]}
            {tournament.status}
          </span>
        </div>
      </div>
    </Card>
  );
}
