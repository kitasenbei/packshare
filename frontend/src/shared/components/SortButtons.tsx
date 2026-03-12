import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
    <ToggleGroup
      value={[value]}
      onValueChange={(newValue) => {
        if (newValue.length > 0) onChange(newValue[newValue.length - 1]);
      }}
      variant="outline"
      size="sm"
    >
      {options.map((s) => (
        <ToggleGroupItem key={s.key} value={s.key}>
          {s.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
