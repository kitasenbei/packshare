import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface BackButtonProps {
  onClick: () => void;
}

export default function BackButton({ onClick }: BackButtonProps) {
  return (
    <Button
      onClick={onClick}
      startIcon={<ArrowBackIcon />}
      sx={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        color: 'text.secondary',
        px: 2,
        py: 1,
        zIndex: 1000,
        '&:hover': {
          backgroundColor: '#f5f5f5',
          borderColor: 'primary.main',
          color: 'primary.main',
        },
      }}
    >
      Go Back
    </Button>
  );
}
