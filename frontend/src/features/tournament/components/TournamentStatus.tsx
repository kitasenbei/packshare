import {
  Stack,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const STATUS_OPTIONS = ['upcoming', 'live', 'completed'] as const;
export type TournamentStatusValue = (typeof STATUS_OPTIONS)[number];

export const statusColors: Record<string, string> = {
  upcoming: '#4488ff',
  live: '#ff4444',
  completed: '#44bb44',
};

const statusIcons: Record<string, React.ReactElement> = {
  upcoming: <ScheduleIcon sx={{ fontSize: 16, color: statusColors.upcoming }} />,
  live: <PlayCircleIcon sx={{ fontSize: 16, color: statusColors.live }} />,
  completed: <CheckCircleIcon sx={{ fontSize: 16, color: statusColors.completed }} />,
};

interface TournamentStatusProps {
  value: TournamentStatusValue;
  onChange: (status: TournamentStatusValue) => void;
}

export default function TournamentStatus({ value, onChange }: TournamentStatusProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        Tournament Status
      </Typography>
      <FormControl size="small" fullWidth>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value as TournamentStatusValue)}
          sx={{ fontSize: 13, textTransform: 'capitalize' }}
          renderValue={(v) => (
            <Stack direction="row" alignItems="center" spacing={0.75}>
              {statusIcons[v]}
              <span>{v}</span>
            </Stack>
          )}
        >
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s} sx={{ fontSize: 13, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 1 }}>
              {statusIcons[s]}
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
