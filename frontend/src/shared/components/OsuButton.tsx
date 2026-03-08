import { Button } from '@mui/material';
import osuLogo from '../../assets/osu-logo.svg';

interface OsuButtonProps {
  onClick: () => void;
  variant?: 'light' | 'dark';
}

export default function OsuButton({ onClick, variant = 'light' }: OsuButtonProps) {
  const isDark = variant === 'dark';
  return (
    <Button
      size="small"
      startIcon={<img src={osuLogo} alt="" style={{ width: 16, height: 16 }} />}
      onClick={onClick}
      sx={{
        fontSize: 12,
        fontWeight: 600,
        color: isDark ? 'primary.light' : 'primary.main',
        backgroundColor: isDark ? 'rgba(132,169,140,0.15)' : 'rgba(82,121,111,0.08)',
        minWidth: 'auto',
        px: 1,
        py: 0.25,
        '&:hover': {
          backgroundColor: isDark ? 'rgba(132,169,140,0.25)' : 'rgba(82,121,111,0.15)',
        },
      }}
    >
      Open on osu!
    </Button>
  );
}
