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
      color="error"
      variant="text"
      startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
      onClick={onClick}
      sx={{
        fontSize: 12,
        fontWeight: 600,
        minWidth: 'auto',
        px: 1,
        py: 0.25,
      }}
    >
      {label}
    </Button>
  );
}
