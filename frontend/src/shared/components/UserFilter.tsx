import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';

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
    <Combobox<UserOption>
      value={value}
      onValueChange={(val) => {
        onChange(val ?? null);
      }}
      itemToStringLabel={(u) => u.username}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={!!value}
        className="min-w-[200px]"
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>No users found</ComboboxEmpty>
          {users.map((user) => (
            <ComboboxItem key={user.id} value={user}>
              <Avatar size="sm">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.username[0]}</AvatarFallback>
              </Avatar>
              <span>{user.username}</span>
              <Badge variant="secondary" className="ml-auto">{user.pack_count}</Badge>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
