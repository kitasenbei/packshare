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
  variant?: 'list' | 'grid';
}

export default function PackCard({ pack, compact, variant }: PackCardProps) {
  if (variant === 'grid') return <GridCard pack={pack} />;
  if (compact) return <CompactCard pack={pack} />;
  return <FullCard pack={pack} />;
}

function FullCard({ pack }: { pack: PackCardPack }) {
  const hasCoverArt = pack.beatmapset_ids && pack.beatmapset_ids.length > 0;

  return (
    <Paper
      component={Link}
      to={`/pack/${pack.share_code}`}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      {/* Cover art banner */}
      {hasCoverArt && (
        <Box sx={{ height: 56, position: 'relative', overflow: 'hidden', backgroundColor: '#f5f5f5', display: 'flex' }}>
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
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          Created at {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>
      </Box>
    </Paper>
  );
}

function GridCard({ pack }: { pack: PackCardPack }) {
  const hasCoverArt = pack.beatmapset_ids && pack.beatmapset_ids.length > 0;

  return (
    <Paper
      component={Link}
      to={`/pack/${pack.share_code}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        height: '100%',
        transition: 'border-color 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      {/* Cover image strip */}
      <Box sx={{ height: 80, position: 'relative', overflow: 'hidden', backgroundColor: '#f5f5f5', display: 'flex' }}>
        {hasCoverArt ? (
          pack.beatmapset_ids.slice(0, 4).map((id) => (
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
          ))
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MusicNoteIcon sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 32 }} />
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body1" fontWeight="bold" noWrap>
          {pack.name}
        </Typography>
        {pack.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ mt: 0.25 }}
          >
            {pack.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Avatar src={pack.user.avatar_url} sx={{ width: 20, height: 20 }} />
          <Typography variant="caption" color="text.secondary" noWrap>
            {pack.user.username}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 'auto', pt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MusicNoteIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {pack.beatmap_count} maps
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <VisibilityIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {pack.views.toLocaleString()} views
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

function CompactCard({ pack }: { pack: PackCardPack }) {
  return (
    <Paper
      component={Link}
      to={`/pack/${pack.share_code}`}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
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
          Created at {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>
      </Box>
    </Paper>
  );
}
