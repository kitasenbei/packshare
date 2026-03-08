import { Autocomplete, Avatar, Box, Chip, TextField, InputAdornment } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

interface UserOption {
  id: number;
  username: string;
  avatar_url: string;
  pack_count: number;
}

interface UserFilterProps {
  users: UserOption[];
  value: UserOption | null;
  onChange: (user: UserOption | null) => void;
  placeholder?: string;
}

export default function UserFilter({ users, value, onChange, placeholder = 'Filter by user...' }: UserFilterProps) {
  return (
    <Autocomplete
      options={users}
      value={value}
      onChange={(_, user) => onChange(user)}
      getOptionLabel={(option) => option.username}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={option.avatar_url} alt={option.username} sx={{ width: 24, height: 24 }} />
          <span>{option.username}</span>
          <Chip label={option.pack_count} size="small" sx={{ ml: 'auto' }} />
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          size="small"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            },
          }}
        />
      )}
      sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { backgroundColor: 'background.paper' } }}
      size="small"
    />
  );
}
