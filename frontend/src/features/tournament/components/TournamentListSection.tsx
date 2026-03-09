import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Card,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { User } from '../../auth/api/auth';
import { placeholderBanner, placeholderLogo } from '../utils/placeholders';
import {
  listTournaments,
  type Tournament,
} from '../api/tournaments';
import { statusColors } from './TournamentStatus';

const statusIcons: Record<string, React.ReactElement> = {
  upcoming: <ScheduleIcon />,
  live: <LiveTvIcon />,
  completed: <CheckCircleIcon />,
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
        // Show only user's tournaments
        setTournaments(all.filter((t) => t.user?.osu_id === user.osu_id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.osu_id]);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          Tournaments
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onCreate}>
          New Tournament
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : tournaments.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 6 }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'action.hover' }}>
            <EmojiEventsIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
          </Avatar>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            No tournaments yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
            Create a tournament to manage mappools, set up brackets, and share everything with your players
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} size="large"
            sx={{ fontWeight: 'bold' }}>
            Create your first tournament
          </Button>
        </Card>
      ) : (
        <Stack spacing={2}>
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} onClick={() => onSelect(t)} />
          ))}
        </Stack>
      )}
    </>
  );
}

function TournamentCard({ tournament, onClick }: { tournament: Tournament; onClick: () => void }) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': { borderColor: 'primary.main', boxShadow: 3, transform: 'translateY(-1px)' },
        position: 'relative',
        height: 140,
      }}
    >
      {/* Full banner background */}
      <Box
        component="img"
        src={tournament.banner_url || placeholderBanner}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)' }} />

      {/* Content overlay */}
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', p: 2, gap: 2 }}>
        {/* Logo bottom-left */}
        <Avatar
          src={tournament.logo_url || placeholderLogo}
          variant="rounded"
          sx={{ width: 56, height: 56, flexShrink: 0 }}
        />

        {/* Text */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', lineHeight: 1.2 }} noWrap>
            {tournament.name}
          </Typography>
          <Chip
            icon={statusIcons[tournament.status]}
            label={tournament.status}
            size="small"
            sx={{
              height: 22, fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize',
              backgroundColor: `${statusColors[tournament.status]}dd`,
              color: 'white',
              mt: 0.5,
              width: 'fit-content',
              '& .MuiChip-icon': { color: 'white', fontSize: 12, ml: 0.5 },
            }}
          />
        </Box>
      </Box>
    </Card>
  );
}
