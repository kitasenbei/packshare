import { Clock, PlayCircle, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const STATUS_OPTIONS = ['upcoming', 'live', 'completed'] as const;
export type TournamentStatusValue = (typeof STATUS_OPTIONS)[number];

export const statusColors: Record<string, string> = {
  upcoming: '#4488ff',
  live: '#ff4444',
  completed: '#44bb44',
};

const statusIcons: Record<string, React.ReactElement> = {
  upcoming: <Clock className="size-4" style={{ color: statusColors.upcoming }} />,
  live: <PlayCircle className="size-4" style={{ color: statusColors.live }} />,
  completed: <CheckCircle2 className="size-4" style={{ color: statusColors.completed }} />,
};

interface TournamentStatusProps {
  value: TournamentStatusValue;
  onChange: (status: TournamentStatusValue) => void;
}

export default function TournamentStatus({ value, onChange }: TournamentStatusProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-sm text-muted-foreground">
        Tournament Status
      </span>
      <Select value={value} onValueChange={(v) => onChange(v as TournamentStatusValue)}>
        <SelectTrigger className="w-full text-[13px] capitalize">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              {statusIcons[value]}
              <span>{value}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s} className="text-[13px] capitalize">
              <span className="flex items-center gap-2">
                {statusIcons[s]}
                {s}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
