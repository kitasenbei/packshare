import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FolderIcon from '@mui/icons-material/Folder';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import type { User } from '../api/auth';
import { getMyPacks, type Pack } from '../api/packs';
import PackCard from './PackCard';

interface DashboardProps {
  user: User | null;
  permissions?: string[];
  isKeySession?: boolean;
}

export default function Dashboard({ user, permissions = [], isKeySession = false }: DashboardProps) {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    getMyPacks()
      .then(setPacks)
      .catch((err) => setError(err.message || 'Failed to load packs'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  const canCreate = !isKeySession || permissions.includes('create');
  const totalMaps = packs.reduce((sum, p) => sum + p.beatmaps.length, 0);
  const totalViews = packs.reduce((sum, p) => sum + p.views, 0);
  const totalDownloads = packs.reduce(
    (sum, p) => sum + p.beatmaps.reduce((s, b) => s + (b.downloads ?? 0), 0),
    0,
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Avatar
          src={user.avatar_url}
          sx={{ width: 56, height: 56, border: 3, borderColor: 'primary.main' }}
        />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {user.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {packs.length} pack{packs.length !== 1 ? 's' : ''} · {totalMaps} maps
          </Typography>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
        Quick Actions
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        {canCreate && (
          <Paper
            component={Link}
            to="/create"
            sx={{
              flex: 1,
              p: 3,
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <AddIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="bold">New Pack</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Create a beatmap pack to share with players
            </Typography>
          </Paper>
        )}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            opacity: 0.6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <EmojiEventsIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight="bold">New Tournament</Typography>
            <Typography
              variant="caption"
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                px: 0.75,
                py: 0.15,
                borderRadius: 0.5,
                fontSize: 10,
                fontWeight: 'bold',
              }}
            >
              SOON
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Set up a tournament with mappools and scheduling
          </Typography>
        </Paper>
      </Stack>

      {/* Stats */}
      {!loading && packs.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
            Stats
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
            {[
              { icon: <FolderIcon />, label: 'Packs', value: packs.length },
              { icon: <MusicNoteIcon />, label: 'Maps', value: totalMaps },
              { icon: <VisibilityIcon />, label: 'Views', value: totalViews },
              { icon: <DownloadIcon />, label: 'Downloads', value: totalDownloads },
            ].map((stat) => (
              <Paper
                key={stat.label}
                sx={{
                  flex: 1,
                  p: 2,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ color: 'primary.main', mb: 0.5 }}>{stat.icon}</Box>
                <Typography variant="h6" fontWeight="bold">
                  {stat.value.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* My Packs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          My Packs
        </Typography>
        {packs.length > 3 && (
          <Button component={Link} to="/my-packs" size="small" sx={{ color: 'primary.main' }}>
            View All
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : packs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <FolderIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            You haven't created any packs yet
          </Typography>
          {canCreate && (
            <Button
              component={Link}
              to="/create"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Create your first pack
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={2}>
          {packs.slice(0, 3).map((pack) => (
            <PackCard
              key={pack.id}
              pack={{
                ...pack,
                user: pack.user ?? { username: user.username, avatar_url: user.avatar_url },
                beatmap_count: pack.beatmaps.length,
                beatmapset_ids: pack.beatmaps.map((b) => b.beatmapset_id),
              }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
