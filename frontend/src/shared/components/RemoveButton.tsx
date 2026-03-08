import { Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface RemoveButtonProps {
  onClick: () => void;
  label?: string;
}

export default function RemoveButton({ onClick, label = 'Remove' }: RemoveButtonProps) {
  return (
    <Button
      size="small"
      startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
      onClick={onClick}
      sx={{
        textTransform: 'none',
        fontSize: 12,
        fontWeight: 600,
        color: '#ff6b6b',
        backgroundColor: 'rgba(255,107,107,0.06)',
        minWidth: 'auto',
        px: 1,
        py: 0.25,
        '&:hover': {
          backgroundColor: 'rgba(255,107,107,0.12)',
        },
      }}
    >
      {label}
    </Button>
  );
}
