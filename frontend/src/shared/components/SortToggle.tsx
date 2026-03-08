import { ToggleButtonGroup, ToggleButton } from '@mui/material';

interface SortOption {
  value: string;
  label: string;
}

interface SortToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
}

export default function SortToggle({ value, onChange, options }: SortToggleProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => { if (v) onChange(v); }}
      size="small"
      sx={{ '& .MuiToggleButton-root': { backgroundColor: 'background.paper' } }}
    >
      {options.map((opt) => (
        <ToggleButton key={opt.value} value={opt.value}>
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
