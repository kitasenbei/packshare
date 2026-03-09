import type { SlotConfig } from '../api/tournaments';

export const defaultSlotColors: Record<string, string> = {
  RC: '#4a90d9', LN: '#4ad98f', HB: '#b44ad9', TECH: '#f5c842',
  JACK: '#d94a4a', SPEED: '#4ad9d9', STAM: '#d9a44a', SV: '#ff66ab', TB: '#ff4444',
};

export const defaultSlotLabels: Record<string, string> = {
  RC: 'Rice', LN: 'Long Notes', HB: 'Hybrid', TECH: 'Technical',
  JACK: 'Jack', SPEED: 'Speed', STAM: 'Stamina', SV: 'Slider Velocity', TB: 'Tiebreaker',
};

export const SLOTS = ['RC', 'LN', 'HB', 'TECH', 'JACK', 'SPEED', 'STAM', 'SV', 'TB'];

export function parseSlotConfigs(raw?: string): Record<string, SlotConfig> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function getSlotLabel(slot: string, configs: Record<string, SlotConfig>): string {
  return configs[slot]?.label || defaultSlotLabels[slot] || slot;
}

export function getSlotColor(slot: string, configs: Record<string, SlotConfig>): string {
  return configs[slot]?.color || defaultSlotColors[slot] || '#888';
}
