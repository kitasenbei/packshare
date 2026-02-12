import { Box, Paper, Typography, Avatar } from '@mui/material';
import { Link } from 'react-router-dom';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface PackCardPack {
  id: number;
  share_code: string;
  name: string;
  description?: string;
  views: number;
  user: {
    username: string;
    avatar_url: string;
  };
  beatmap_count: number;
  beatmapset_ids: number[];
  created_at: string;
}

interface PackCardProps {
  pack: PackCardPack;
  compact?: boolean;
}

export default function PackCard({ pack, compact }: PackCardProps) {
  if (compact) return <CompactCard pack={pack} />;
  return <FullCard pack={pack} />;
}

function FullCard({ pack }: { pack: PackCardPack }) {
  const hasCoverArt = pack.beatmapset_ids && pack.beatmapset_ids.length > 0;

  return (
    <Paper
      component={Link}
      to={`/pack/${pack.share_code}`}
      elevation={2}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      {/* Cover art banner */}
      {hasCoverArt && (
        <Box sx={{ height: 56, position: 'relative', overflow: 'hidden', backgroundColor: '#1a1a2e', display: 'flex' }}>
          {pack.beatmapset_ids.slice(0, 5).map((id) => (
            <Box
              key={id}
              component="img"
              src={`https://assets.ppy.sh/beatmaps/${id}/covers/cover.jpg`}
              sx={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                objectFit: 'cover',
                opacity: 0.8,
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
        </Box>
      )}

      <Box sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Avatar src={pack.user.avatar_url} sx={{ width: 48, height: 48 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight="bold" noWrap>
            {pack.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              by {pack.user.username}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MusicNoteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {pack.beatmap_count} beatmaps
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VisibilityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {pack.views.toLocaleString()} views
              </Typography>
            </Box>
          </Box>
          {pack.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {pack.description}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, textAlign: 'right' }}>
          Created
          <br />
          {new Date(pack.created_at).toLocaleDateString()}
        </Typography>
      </Box>
    </Paper>
  );
}

function CompactCard({ pack }: { pack: PackCardPack }) {
  return (
    <Paper
      component={Link}
      to={`/pack/${pack.share_code}`}
      elevation={1}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 3,
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Avatar src={pack.user.avatar_url} sx={{ width: 40, height: 40 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" fontWeight="bold" noWrap>
            {pack.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {pack.user.username}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MusicNoteIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {pack.beatmap_count} beatmaps
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VisibilityIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {pack.views.toLocaleString()} views
              </Typography>
            </Box>
            {/* Stacked thumbnails */}
            {pack.beatmapset_ids && pack.beatmapset_ids.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                <Box sx={{ display: 'flex', position: 'relative', height: 20 }}>
                  {pack.beatmapset_ids.slice(0, 6).map((id, idx) => (
                    <Box
                      key={id}
                      component="img"
                      src={`https://assets.ppy.sh/beatmaps/${id}/covers/list.jpg`}
                      sx={{
                        width: 28,
                        height: 20,
                        borderRadius: 0.5,
                        objectFit: 'cover',
                        position: 'absolute',
                        left: idx * 12,
                        border: '1px solid #fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {new Date(pack.created_at).toLocaleDateString()}
        </Typography>
      </Box>
    </Paper>
  );
}
