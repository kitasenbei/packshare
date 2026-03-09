import type { User } from '../../auth/api/auth';
import type { Tournament } from '../api/tournaments';
import TournamentListSection from './TournamentListSection';
import TournamentCreateSection from './TournamentCreateSection';
import TournamentDetailSection from './TournamentDetailSection';

export type TournamentView = 'list' | 'create' | 'detail';

interface TournamentsSectionProps {
  user: User;
  view: TournamentView;
  selectedTournament: Tournament | null;
  onViewChange: (view: TournamentView) => void;
  onSelectTournament: (t: Tournament | null) => void;
}

export function TournamentsSection({
  user,
  view,
  selectedTournament,
  onViewChange,
  onSelectTournament,
}: TournamentsSectionProps) {
  switch (view) {
    case 'create':
      return (
        <TournamentCreateSection
          onBack={() => onViewChange('list')}
          onCreated={(t) => { onSelectTournament(t); onViewChange('detail'); }}
        />
      );
    case 'detail':
      return selectedTournament ? (
        <TournamentDetailSection
          tournament={selectedTournament}
          user={user}
          onBack={() => { onSelectTournament(null); onViewChange('list'); }}
          onUpdated={onSelectTournament}
          onDeleted={() => { onSelectTournament(null); onViewChange('list'); }}
        />
      ) : null;
    default:
      return (
        <TournamentListSection
          user={user}
          onCreate={() => onViewChange('create')}
          onSelect={(t) => { onSelectTournament(t); onViewChange('detail'); }}
        />
      );
  }
}
