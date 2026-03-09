import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Tournament } from '../api/tournaments';
import { placeholderBanner, placeholderLogo } from '../utils/placeholders';

const statusColors: Record<string, string> = {
  live: '#ff4444',
  upcoming: '#4488ff',
  completed: '#44bb44',
};

interface TournamentCardProps {
  tournament: Tournament;
  isOwner?: boolean;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export default function TournamentCard({ tournament, isOwner, onClick, onDelete }: TournamentCardProps) {
  return (
    <Card
      onClick={onClick}
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
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.3)), url(${tournament.banner_url || placeholderBanner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          px: 3,
          gap: 2,
        }}
      >
        <Avatar
          src={tournament.logo_url || placeholderLogo}
          sx={{ width: 64, height: 64, border: '3px solid white' }}
        />
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
        {isOwner && onDelete && (
          <Tooltip title="Delete tournament">
            <IconButton
              onClick={onDelete}
              sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'error.main' } }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
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
  );
}
