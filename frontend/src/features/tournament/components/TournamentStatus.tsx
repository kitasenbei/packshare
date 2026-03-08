import {
  Card,
  CardHeader,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const STATUS_OPTIONS = ['upcoming', 'live', 'completed'] as const;
export type TournamentStatusValue = (typeof STATUS_OPTIONS)[number];

export const statusColors: Record<string, string> = {
  upcoming: '#4488ff',
  live: '#ff4444',
  completed: '#44bb44',
};

interface TournamentStatusProps {
  value: TournamentStatusValue;
  onChange: (status: TournamentStatusValue) => void;
}

export default function TournamentStatus({ value, onChange }: TournamentStatusProps) {
  return (
    <Card variant="outlined">
      <CardHeader
        avatar={<FiberManualRecordIcon sx={{ fontSize: 14, color: statusColors[value] }} />}
        title="Tournament Status"
        slotProps={{ title: { variant: 'subtitle2', fontWeight: 'bold' } }}
        sx={{ pb: 0 }}
      />
      <CardContent>
        <ToggleButtonGroup
          value={value}
          exclusive
          onChange={(_, val) => val && onChange(val)}
          fullWidth
          size="small"
          sx={{ '& .MuiToggleButton-root': { textTransform: 'capitalize', fontWeight: 600, fontSize: 13 } }}
        >
          {STATUS_OPTIONS.map((s) => (
            <ToggleButton
              key={s}
              value={s}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: `${statusColors[s]}22`,
                  color: statusColors[s],
                  borderColor: statusColors[s],
                  '&:hover': { backgroundColor: `${statusColors[s]}33` },
                },
              }}
            >
              <FiberManualRecordIcon sx={{ fontSize: 8, mr: 1, color: statusColors[s] }} />
              {s}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </CardContent>
    </Card>
  );
}
