import { useState } from 'react';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
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
  const [slots, setSlots] = useState<SlotEntry[]>(() => {
    const savedKeys = Object.keys(slotConfigs);
    if (savedKeys.length > 0) {
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
    return SLOTS.map((key) => ({
      key,
      label: defaultSlotLabels[key] || key,
      color: defaultSlotColors[key] || '#888',
    }));
  });
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
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
    setAddOpen(false);
  };

  const handleRemove = (key: string) => {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  };

  const updateSlot = (index: number, field: 'key' | 'label' | 'color', value: string) => {
    setSlots((prev) => prev.map((s, i) => i === index ? { ...s, [field]: field === 'key' ? value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) : value } : s));
  };

  if (!isOwner) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Only the tournament owner can edit slots.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Slot table */}
      <Card className="overflow-hidden">
        <ScrollArea className="max-h-[480px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-16">Color</TableHead>
                <TableHead className="w-24">Key</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead className="w-20 text-center">Preview</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <GripVertical className="size-4 text-muted-foreground/40" />
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <label className="block cursor-pointer">
                            <div
                              className="size-7 rounded-md border border-border shadow-sm transition-shadow hover:shadow-md"
                              style={{ backgroundColor: slot.color }}
                            />
                            <input
                              type="color"
                              value={slot.color}
                              onChange={(e) => updateSlot(i, 'color', e.target.value)}
                              className="sr-only"
                            />
                          </label>
                        }
                      >
                        <span />
                      </TooltipTrigger>
                      <TooltipContent>Pick color</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={slot.key}
                      onChange={(e) => updateSlot(i, 'key', e.target.value)}
                      className="h-7 w-[70px] text-center text-xs font-bold"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={slot.label}
                      onChange={(e) => updateSlot(i, 'label', e.target.value)}
                      placeholder="Display name"
                      className="h-7 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className="inline-flex min-w-[48px] items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: slot.color }}
                    >
                      {slot.key || '??'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRemove(slot.key)}
                            className="text-muted-foreground hover:text-destructive"
                          />
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent>Remove slot</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {slots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No slots configured. Add one below.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setAddOpen(true)}>
          <Plus data-icon="inline-start" className="size-4" />
          Add Slot
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="size-4 text-white" /> : <Check data-icon="inline-start" className="size-4" />}
          {saving ? 'Saving...' : 'Save Slot Configuration'}
        </Button>
      </div>

      {/* Add new slot dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) { setAddOpen(false); setNewKey(''); setNewLabel(''); setNewColor('#888888'); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Slot</DialogTitle>
            <DialogDescription>
              Create a custom slot type for your mappool.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {/* Color + Key row with live preview */}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <div
                  className="size-10 rounded-lg border border-border shadow-sm transition-shadow hover:shadow-md"
                  style={{ backgroundColor: newColor }}
                />
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="sr-only"
                />
              </label>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label className="text-xs">Key</Label>
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10))}
                  placeholder="e.g. RC"
                  autoFocus
                />
              </div>
              {/* Live preview */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Preview</span>
                <span
                  className="inline-flex min-w-[48px] items-center justify-center rounded px-2 py-1 text-sm font-bold text-white"
                  style={{ backgroundColor: newColor }}
                >
                  {newKey.trim().toUpperCase() || '??'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Display Name</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Rice"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setNewKey(''); setNewLabel(''); setNewColor('#888888'); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newKey.trim() || !newLabel.trim()}>
              <Plus data-icon="inline-start" className="size-4" />
              Add Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
