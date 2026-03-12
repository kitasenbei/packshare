import { cn } from '@/lib/utils';

interface SlotBadgeProps {
  label: string;
  color: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function SlotBadge({ label, color, onClick }: SlotBadgeProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'shrink-0 min-w-[48px] rounded px-1.5 py-0.5 text-center text-sm font-bold text-white',
        onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
      )}
      style={{ backgroundColor: color }}
    >
      {label}
    </div>
  );
}
