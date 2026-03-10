import { Box } from '@mui/material';

interface SlotBadgeProps {
  label: string;
  color: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function SlotBadge({ label, color, onClick }: SlotBadgeProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        backgroundColor: color,
        color: 'white',
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        fontWeight: 'bold',
        fontSize: 14,
        minWidth: 48,
        textAlign: 'center',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { opacity: 0.8 } : {},
      }}
    >
      {label}
    </Box>
  );
}
