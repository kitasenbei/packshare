import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  TextField,
  IconButton,
  Tooltip,
  Card,
  List,
  ListItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import {
  updateTournament,
  type Tournament,
  type SlotConfig,
} from '../api/tournaments';
import { defaultSlotColors, defaultSlotLabels, SLOTS } from './slotUtils';

interface SlotEntry {
  key: string;
  label: string;
  color: string;
}

interface SlotsEditorProps {
  tournament: Tournament;
  slotConfigs: Record<string, SlotConfig>;
  isOwner: boolean;
  onUpdated: (t: Tournament) => void;
  onError: (msg: string) => void;
}

export default function SlotsEditor({
  tournament,
  slotConfigs,
  isOwner,
  onUpdated,
  onError,
}: SlotsEditorProps) {
  // Build initial slot list from saved configs, falling back to defaults
  const [slots, setSlots] = useState<SlotEntry[]>(() => {
    const savedKeys = Object.keys(slotConfigs);
    if (savedKeys.length > 0) {
      // Use saved config order, then append any defaults not already present
      const entries: SlotEntry[] = savedKeys.map((key) => ({
        key,
        label: slotConfigs[key].label,
        color: slotConfigs[key].color,
      }));
      for (const key of SLOTS) {
        if (!savedKeys.includes(key)) {
          entries.push({ key, label: defaultSlotLabels[key] || key, color: defaultSlotColors[key] || '#888' });
        }
      }
      return entries;
    }
    // No saved config — use all defaults
    return SLOTS.map((key) => ({
      key,
      label: defaultSlotLabels[key] || key,
      color: defaultSlotColors[key] || '#888',
    }));
  });
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#888888');

  const handleSave = async () => {
    setSaving(true);
    try {
      const toSave: Record<string, SlotConfig> = {};
      for (const slot of slots) {
        toSave[slot.key] = { label: slot.label, color: slot.color };
      }
      const updated = await updateTournament(tournament.abbreviation, {
        slot_configs: JSON.stringify(toSave),
      });
      onUpdated(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save slot configs');
    }
    setSaving(false);
  };

  const handleAdd = () => {
    const key = newKey.trim().toUpperCase();
    const label = newLabel.trim();
    if (!key || !label) return;
    if (slots.some((s) => s.key === key)) {
      onError(`Slot "${key}" already exists`);
      return;
    }
    setSlots((prev) => [...prev, { key, label, color: newColor }]);
    setNewKey('');
    setNewLabel('');
    setNewColor('#888888');
  };

  const handleRemove = (key: string) => {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  };

  const updateSlot = (index: number, field: 'key' | 'label' | 'color', value: string) => {
    setSlots((prev) => prev.map((s, i) => i === index ? { ...s, [field]: field === 'key' ? value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) : value } : s));
  };

  if (!isOwner) {
    return (
      <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.disabled">Only the tournament owner can edit slots.</Typography>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      <List disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        {slots.map((slot, i) => (
          <ListItem key={i} divider={i < slots.length - 1} sx={{ py: 1, px: 2, gap: 1.5 }}>
            {/* Color picker */}
            <Box
              component="input"
              type="color"
              value={slot.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSlot(i, 'color', e.target.value)}
              sx={{
                width: 28, height: 28, border: 'none', borderRadius: 1,
                cursor: 'pointer', p: 0, background: 'none', flexShrink: 0,
                '&::-webkit-color-swatch-wrapper': { p: 0 },
                '&::-webkit-color-swatch': { borderRadius: 4, border: '1px solid rgba(0,0,0,0.2)' },
              }}
            />

            {/* Slot key */}
            <TextField
              size="small"
              value={slot.key}
              onChange={(e) => updateSlot(i, 'key', e.target.value)}
              sx={{
                width: 70, '& .MuiInputBase-input': {
                  py: 0.5, fontSize: 12, fontWeight: 'bold', textAlign: 'center',
                  color: slot.color,
                },
                '& .MuiOutlinedInput-root': { backgroundColor: `${slot.color}20` },
              }}
            />

            {/* Editable label */}
            <TextField
              size="small"
              value={slot.label}
              onChange={(e) => updateSlot(i, 'label', e.target.value)}
              placeholder="Display name"
              sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: 14 } }}
            />

            {/* Delete */}
            <Tooltip title="Remove slot">
              <IconButton size="small" onClick={() => handleRemove(slot.key)}
                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Add new slot */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="input"
          type="color"
          value={newColor}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewColor(e.target.value)}
          sx={{
            width: 28, height: 28, border: 'none', borderRadius: 1,
            cursor: 'pointer', p: 0, background: 'none', flexShrink: 0,
            '&::-webkit-color-swatch-wrapper': { p: 0 },
            '&::-webkit-color-swatch': { borderRadius: 4, border: '1px solid rgba(0,0,0,0.2)' },
          }}
        />
        <TextField
          size="small"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10))}
          placeholder="Key (e.g. RC)"
          sx={{ width: 100, '& .MuiInputBase-input': { py: 0.5, fontSize: 13 } }}
        />
        <TextField
          size="small"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Display name (e.g. Rice)"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: 13 } }}
        />
        <Button size="small" variant="outlined" onClick={handleAdd} disabled={!newKey.trim() || !newLabel.trim()}
          startIcon={<AddIcon />}>
          Add
        </Button>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <CheckIcon />}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>
    </Stack>
  );
}
