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
  const avatarSize = compact ? 40 : 48;
  const titleVariant = compact ? 'body1' : 'h6';
  const elevation = compact ? 1 : 2;
  const padding = compact ? 2 : 2.5;
  const thumbCount = compact ? 6 : 10;
  const thumbSize = compact ? { w: 28, h: 20 } : { w: 32, h: 24 };
  const thumbSpacing = compact ? 12 : 14;
  const metaSize = compact ? 'caption' : 'body2';
  const iconSize = compact ? 14 : 16;

  return (
    <Paper
      component={Link}
      to={`/pack/${pack.share_code}`}
      elevation={elevation}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: compact ? 3 : 4,
        },
      }}
    >
      <Box sx={{ p: padding, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Avatar src={pack.user.avatar_url} sx={{ width: avatarSize, height: avatarSize }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant={titleVariant} fontWeight="bold" noWrap>
            {pack.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 1.5 : 2, mt: compact ? 0.25 : 0.5, flexWrap: 'wrap' }}>
            <Typography variant={metaSize as 'caption' | 'body2'} color="text.secondary">
              {compact ? pack.user.username : `by ${pack.user.username}`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MusicNoteIcon sx={{ fontSize: iconSize, color: 'text.secondary' }} />
              <Typography variant={metaSize as 'caption' | 'body2'} color="text.secondary">
                {pack.beatmap_count} maps
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VisibilityIcon sx={{ fontSize: iconSize, color: 'text.secondary' }} />
              <Typography variant={metaSize as 'caption' | 'body2'} color="text.secondary">
                {pack.views.toLocaleString()}
              </Typography>
            </Box>
            {/* Stacked thumbnails */}
            {pack.beatmapset_ids && pack.beatmapset_ids.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: compact ? 0.5 : 1 }}>
                <Box sx={{ display: 'flex', position: 'relative', height: thumbSize.h }}>
                  {pack.beatmapset_ids.slice(0, thumbCount).map((id, idx) => (
                    <Box
                      key={id}
                      component="img"
                      src={`https://assets.ppy.sh/beatmaps/${id}/covers/list.jpg`}
                      sx={{
                        width: thumbSize.w,
                        height: thumbSize.h,
                        borderRadius: 0.5,
                        objectFit: 'cover',
                        position: 'absolute',
                        left: idx * thumbSpacing,
                        border: '1px solid #fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ))}
                </Box>
                {pack.beatmapset_ids.length > thumbCount && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: `${thumbCount * thumbSpacing + thumbSize.w + 4}px`, fontWeight: 500 }}
                  >
                    ...
                  </Typography>
                )}
              </Box>
            )}
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
          {new Date(pack.created_at).toLocaleDateString()}
        </Typography>
      </Box>
    </Paper>
  );
}
