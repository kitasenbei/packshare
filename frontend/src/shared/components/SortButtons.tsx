import { Button, Stack } from '@mui/material';

interface SortOption {
  key: string;
  label: string;
}

interface SortButtonsProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
}

export default function SortButtons({ value, onChange, options }: SortButtonsProps) {
  return (
    <Stack direction="row" spacing={0.5}>
      {options.map((s) => (
        <Button
          key={s.key}
          size="small"
          variant={value === s.key ? 'contained' : 'text'}
          onClick={() => onChange(s.key)}
          sx={{ minWidth: 0, px: 1.5, fontSize: 12 }}
        >
          {s.label}
        </Button>
      ))}
    </Stack>
  );
}
