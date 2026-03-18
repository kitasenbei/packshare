import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, ChevronDown } from 'lucide-react';

const STORAGE_KEY = 'packshare_theme';

const DEFAULT_HUE = 151.3;
const DEFAULT_CHROMA = 0.058;
const DEFAULT_LIGHTNESS = 0.699;

type HarmonyMode = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'monochromatic';

interface ThemeConfig {
  hue: number;
  chroma: number;
  lightness: number;
  harmony: HarmonyMode;
}

/** Get harmony hue offsets for each mode */
function getHarmonyOffsets(mode: HarmonyMode): number[] {
  switch (mode) {
    case 'complementary': return [0, 180];
    case 'analogous': return [0, 30, 330];
    case 'triadic': return [0, 120, 240];
    case 'split-complementary': return [0, 150, 210];
    case 'tetradic': return [0, 90, 180, 270];
    case 'monochromatic': return [0];
  }
}

/** Get the harmony hues from base hue */
function getHarmonyHues(baseHue: number, mode: HarmonyMode): number[] {
  return getHarmonyOffsets(mode).map(offset => (baseHue + offset) % 360);
}

function generatePalette(config: ThemeConfig) {
  const { hue, chroma, lightness, harmony } = config;
  const hues = getHarmonyHues(hue, harmony);

  // Primary = base hue
  const primary = `oklch(${lightness} ${chroma} ${hues[0]})`;
  const primaryFg = lightness > 0.6 ? 'oklch(0.15 0.02 0)' : 'oklch(1.000 0.000 0)';

  // Accent = second harmony hue (or same for monochromatic)
  const accentHue = hues[1] ?? hues[0];
  // Destructive = third harmony hue, or complement, shifted toward warm
  const destructiveHue = hues[2] ?? (hue + 180) % 360;

  // Background — very light, slightly tinted
  const bg = `oklch(0.974 ${(chroma * 0.1).toFixed(3)} ${hue})`;
  const fg = `oklch(0.354 0.024 ${accentHue})`;

  const card = 'oklch(1.000 0.000 0)';
  const cardFg = fg;

  // Secondary/Muted — desaturated accent
  const secondary = `oklch(0.920 ${(chroma * 0.17).toFixed(3)} ${accentHue})`;
  const secondaryFg = fg;
  const muted = secondary;
  const mutedFg = `oklch(0.408 0.032 ${accentHue})`;

  const accent = `oklch(0.920 ${(chroma * 0.25).toFixed(3)} ${accentHue})`;
  const accentFgColor = fg;

  // Destructive from harmony
  const destructive = `oklch(0.577 ${Math.max(chroma * 2, 0.12).toFixed(3)} ${destructiveHue})`;
  const destructiveFg = 'oklch(1.000 0.000 0)';

  const border = `oklch(0.880 ${(chroma * 0.2).toFixed(3)} ${hue})`;
  const input = border;
  const ring = primary;

  // Charts use all harmony hues
  const chart1 = primary;
  const chart2 = `oklch(0.544 ${(chroma * 0.8).toFixed(3)} ${accentHue})`;
  const chart3 = `oklch(0.408 ${(chroma * 0.6).toFixed(3)} ${destructiveHue})`;
  const chart4 = `oklch(0.854 ${(chroma * 0.35).toFixed(3)} ${hues[3] ?? hue})`;
  const chart5 = fg;

  const sidebar = card;
  const sidebarFg = fg;
  const sidebarPrimary = primary;
  const sidebarPrimaryFg = primaryFg;
  const sidebarAccent = secondary;
  const sidebarAccentFg = fg;
  const sidebarBorder = border;
  const sidebarRing = primary;

  return {
    '--background': bg, '--foreground': fg,
    '--card': card, '--card-foreground': cardFg,
    '--popover': card, '--popover-foreground': cardFg,
    '--primary': primary, '--primary-foreground': primaryFg,
    '--secondary': secondary, '--secondary-foreground': secondaryFg,
    '--muted': muted, '--muted-foreground': mutedFg,
    '--accent': accent, '--accent-foreground': accentFgColor,
    '--destructive': destructive, '--destructive-foreground': destructiveFg,
    '--border': border, '--input': input, '--ring': ring,
    '--chart-1': chart1, '--chart-2': chart2, '--chart-3': chart3, '--chart-4': chart4, '--chart-5': chart5,
    '--sidebar': sidebar, '--sidebar-foreground': sidebarFg,
    '--sidebar-primary': sidebarPrimary, '--sidebar-primary-foreground': sidebarPrimaryFg,
    '--sidebar-accent': sidebarAccent, '--sidebar-accent-foreground': sidebarAccentFg,
    '--sidebar-border': sidebarBorder, '--sidebar-ring': sidebarRing,
  };
}

function applyPalette(palette: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key, value);
  }
}

function clearPalette() {
  const root = document.documentElement;
  const vars = [
    '--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground',
    '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
    '--muted', '--muted-foreground', '--accent', '--accent-foreground',
    '--destructive', '--destructive-foreground', '--border', '--input', '--ring',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    '--sidebar', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring',
  ];
  for (const v of vars) root.style.removeProperty(v);
}

export function loadSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const config: ThemeConfig = JSON.parse(saved);
      applyPalette(generatePalette(config));
    }
  } catch { /* Ignore */ }
}

// ── Color Wheel SVG ──

const WHEEL_SIZE = 200;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const WHEEL_RADIUS = 85;
const HANDLE_RADIUS = 8;
const INNER_RADIUS = 55;

function ColorWheel({
  hue,
  chroma: chromaVal,
  lightness: lightnessVal,
  harmony,
  onHueChange,
  onHarmonyChange,
}: {
  hue: number;
  chroma: number;
  lightness: number;
  harmony: HarmonyMode;
  onHueChange: (hue: number) => void;
  onHarmonyChange: (mode: HarmonyMode) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [harmonyOpen, setHarmonyOpen] = useState(false);

  const hues = getHarmonyHues(hue, harmony);

  const toXY = (angleDeg: number, r: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: WHEEL_CENTER + r * Math.cos(rad), y: WHEEL_CENTER + r * Math.sin(rad) };
  };

  const handlePointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - WHEEL_CENTER;
    const y = e.clientY - rect.top - WHEEL_CENTER;
    let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    onHueChange(angle);
  }, [onHueChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    handlePointer(e);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) handlePointer(e);
  };
  const onPointerUp = () => { dragging.current = false; };

  // Generate conic gradient stops for the wheel
  const wheelSegments = [
    ...Array.from({ length: 36 }, (_, i) => {
      const deg = i * 10;
      return `oklch(0.7 0.08 ${deg}) ${deg}deg`;
    }),
    'oklch(0.7 0.08 0) 360deg',
  ].join(', ');

  return (
    <svg
      ref={svgRef}
      width={WHEEL_SIZE}
      height={WHEEL_SIZE}
      className="mx-auto cursor-crosshair select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Wheel ring using circle segments */}
      <defs>
        <clipPath id="wheel-ring">
          <path d={`
            M ${WHEEL_CENTER} ${WHEEL_CENTER - WHEEL_RADIUS}
            A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 1 1 ${WHEEL_CENTER} ${WHEEL_CENTER + WHEEL_RADIUS}
            A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 1 1 ${WHEEL_CENTER} ${WHEEL_CENTER - WHEEL_RADIUS}
            Z
            M ${WHEEL_CENTER} ${WHEEL_CENTER - INNER_RADIUS}
            A ${INNER_RADIUS} ${INNER_RADIUS} 0 1 0 ${WHEEL_CENTER} ${WHEEL_CENTER + INNER_RADIUS}
            A ${INNER_RADIUS} ${INNER_RADIUS} 0 1 0 ${WHEEL_CENTER} ${WHEEL_CENTER - INNER_RADIUS}
            Z
          `} fillRule="evenodd" />
        </clipPath>
      </defs>
      <foreignObject x="0" y="0" width={WHEEL_SIZE} height={WHEEL_SIZE} clipPath="url(#wheel-ring)">
        <div
          style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg at 50% 50%, ${wheelSegments})`,
          }}
        />
      </foreignObject>

      {/* Harmony shape (lines between points) */}
      {hues.length > 1 && (
        <polygon
          points={hues.map(h => {
            const p = toXY(h, (WHEEL_RADIUS + INNER_RADIUS) / 2);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={0.8}
        />
      )}

      {/* Harmony dot handles */}
      {hues.map((h, i) => {
        const p = toXY(h, (WHEEL_RADIUS + INNER_RADIUS) / 2);
        const isBase = i === 0;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={isBase ? HANDLE_RADIUS : HANDLE_RADIUS - 2}
            fill={`oklch(${lightnessVal} ${chromaVal} ${h})`}
            stroke="white"
            strokeWidth={isBase ? 3 : 2}
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
          />
        );
      })}

      {/* Center preview + harmony dropdown */}
      <circle
        cx={WHEEL_CENTER}
        cy={WHEEL_CENTER}
        r={INNER_RADIUS - 8}
        fill={`oklch(${lightnessVal} ${chromaVal} ${hue})`}
      />
      <text
        x={WHEEL_CENTER}
        y={WHEEL_CENTER - 8}
        textAnchor="middle"
        className="fill-white text-[11px] font-bold"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
      >
        {Math.round(hue)}°
      </text>
      <foreignObject
        x={WHEEL_CENTER - 50}
        y={WHEEL_CENTER - 2}
        width={100}
        height={28}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Popover open={harmonyOpen} onOpenChange={setHarmonyOpen}>
          <PopoverTrigger
            className="flex w-full cursor-pointer items-center justify-center gap-0.5 bg-transparent text-[10px] text-white/80 outline-none"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {HARMONY_MODES.find((m) => m.value === harmony)?.label}
            <ChevronDown className="size-2.5" />
          </PopoverTrigger>
          <PopoverContent className="w-auto min-w-0 gap-0 p-1" sideOffset={8}>
            {HARMONY_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => { onHarmonyChange(m.value); setHarmonyOpen(false); }}
                className={`w-full rounded px-3 py-1 text-left text-xs transition-colors ${
                  harmony === m.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </foreignObject>
    </svg>
  );
}

// ── Harmony Mode Labels ──

const HARMONY_MODES: { value: HarmonyMode; label: string; shape: string }[] = [
  { value: 'complementary', label: 'Complementary', shape: '—' },
  { value: 'analogous', label: 'Analogous', shape: '⌒' },
  { value: 'triadic', label: 'Triadic', shape: '△' },
  { value: 'split-complementary', label: 'Split', shape: 'Y' },
  { value: 'tetradic', label: 'Tetradic', shape: '◻' },
  { value: 'monochromatic', label: 'Mono', shape: '●' },
];

// ── Main Component ──

interface PaletteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaletteEditor({ open, onOpenChange }: PaletteEditorProps) {
  const [hue, setHue] = useState(DEFAULT_HUE);
  const [chroma, setChroma] = useState(DEFAULT_CHROMA);
  const [lightness, setLightness] = useState(DEFAULT_LIGHTNESS);
  const [harmony, setHarmony] = useState<HarmonyMode>('monochromatic');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config: ThemeConfig = JSON.parse(saved);
        setHue(config.hue);
        setChroma(config.chroma);
        setLightness(config.lightness);
        setHarmony(config.harmony || 'monochromatic');
      }
    } catch { /* Ignore */ }
  }, []);

  const apply = useCallback(() => {
    applyPalette(generatePalette({ hue, chroma, lightness, harmony }));
  }, [hue, chroma, lightness, harmony]);

  useEffect(() => {
    if (open) apply();
  }, [open, apply]);

  const handleSave = () => {
    const config: ThemeConfig = { hue, chroma, lightness, harmony };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    apply();
    onOpenChange(false);
  };

  const handleReset = () => {
    setHue(DEFAULT_HUE);
    setChroma(DEFAULT_CHROMA);
    setLightness(DEFAULT_LIGHTNESS);
    setHarmony('monochromatic');
    localStorage.removeItem(STORAGE_KEY);
    clearPalette();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Theme</DialogTitle>
          <DialogDescription className="sr-only">Customize the color theme</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Color wheel with embedded harmony selector */}
          <ColorWheel
            hue={hue}
            chroma={chroma}
            lightness={lightness}
            harmony={harmony}
            onHueChange={setHue}
            onHarmonyChange={setHarmony}
          />

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="mb-1.5 block text-xs text-muted-foreground">Saturation</span>
              <Slider
                value={[chroma]}
                onValueChange={(v) => setChroma(Array.isArray(v) ? v[0] : v)}
                min={0.01}
                max={0.15}
                step={0.001}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs text-muted-foreground">Lightness</span>
              <Slider
                value={[lightness]}
                onValueChange={(v) => setLightness(Array.isArray(v) ? v[0] : v)}
                min={0.3}
                max={0.85}
                step={0.01}
              />
            </div>
          </div>

        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
