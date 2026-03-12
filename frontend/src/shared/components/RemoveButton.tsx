import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface RemoveButtonProps {
  onClick: () => void;
  label?: string;
}

export default function RemoveButton({ onClick, label = 'Remove' }: RemoveButtonProps) {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      className="gap-1 font-semibold"
    >
      <Trash2 className="size-3.5" />
      {label}
    </Button>
  );
}
