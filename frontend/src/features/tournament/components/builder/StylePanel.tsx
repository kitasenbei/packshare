import { useState, type ReactNode } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { BuilderElement, ElementStyles, SiteConfig, BuilderElementType } from '../../types/siteConfig';

interface StylePanelProps {
  element: BuilderElement | null;
  config: SiteConfig;
  onUpdateStyles: (id: string, styles: Partial<ElementStyles>) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateTheme: (theme: SiteConfig['theme']) => void;
}

const TYPE_COLORS: Record<BuilderElementType, string> = {
  container: '#3b82f6',
  text: '#a78bfa',
  image: '#f59e0b',
  button: '#10b981',
  divider: '#6b7280',
  spacer: '#6b7280',
};

export default function StylePanel({
  element,
  config,
  onUpdateStyles,
  onUpdateContent,
  onUpdateName,
  onUpdateTheme,
}: StylePanelProps) {
  if (!element) {
    return <ThemePanel theme={config.theme} onChange={onUpdateTheme} />;
  }

  const s = element.styles;
  const update = (patch: Partial<ElementStyles>) => onUpdateStyles(element.id, patch);
  const color = TYPE_COLORS[element.type];

  return (
    <div className="overflow-auto h-full">
      {/* Element header */}
      <div className="p-1.5 border-b border-border" style={{ backgroundColor: `${color}08` }}>
        <div className="flex items-center gap-1 mb-1">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[11px] font-semibold capitalize flex-1">
            {element.type}
          </span>
          <Badge variant="secondary" className="h-4 text-[8px] font-semibold" style={{ backgroundColor: `${color}20`, color }}>
            {element.type}
          </Badge>
        </div>
        <Input
          value={element.name || ''}
          placeholder="Element name"
          onChange={(e) => onUpdateName(element.id, e.target.value)}
          className="h-6 text-[11px] bg-black/10"
        />
      </div>

      <div className="pb-2">
        {/* Content */}
        {(element.type === 'text' || element.type === 'button' || element.type === 'image') && (
          <Section title="Content" defaultOpen>
            {(element.type === 'text' || element.type === 'button') && (
              element.type === 'text' ? (
                <textarea
                  className="w-full min-h-[72px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-[11px]"
                  value={element.content || ''}
                  placeholder="Enter text..."
                  onChange={(e) => onUpdateContent(element.id, e.target.value)}
                />
              ) : (
                <Input
                  value={element.content || ''}
                  placeholder="Button label"
                  onChange={(e) => onUpdateContent(element.id, e.target.value)}
                  className="text-[11px] h-7"
                />
              )
            )}
            {element.type === 'image' && (
              <Input
                value={element.content || ''}
                placeholder="https://example.com/image.jpg"
                onChange={(e) => onUpdateContent(element.id, e.target.value)}
                className="text-[11px] h-7"
              />
            )}
            {element.type === 'button' && element.href !== undefined && (
              <div className="mt-1">
                <Label className="text-[10px]">Link URL</Label>
                <Input
                  value={element.href || ''}
                  placeholder="https://link-url..."
                  className="text-[11px] h-7"
                  readOnly
                />
              </div>
            )}
          </Section>
        )}

        {/* Layout (containers) */}
        {element.type === 'container' && (
          <Section title="Layout" defaultOpen>
            <div className="flex gap-0.5 mb-1.5">
              {(['column', 'row'] as const).map((dir) => (
                <div
                  key={dir}
                  onClick={() => update({ flexDirection: dir })}
                  className="flex-1 py-[3px] rounded cursor-pointer text-center transition-all"
                  style={{
                    border: `1px solid ${s.flexDirection === dir ? '#3b82f6' : 'var(--color-border)'}`,
                    backgroundColor: s.flexDirection === dir ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}
                >
                  <div
                    className="flex items-center justify-center h-5"
                    style={{ flexDirection: dir, gap: 2 }}
                  >
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{
                        width: dir === 'row' ? 8 : 16,
                        height: dir === 'row' ? 14 : 4,
                        backgroundColor: s.flexDirection === dir ? '#3b82f6' : 'var(--color-muted-foreground)',
                        borderRadius: 2,
                        opacity: s.flexDirection === dir ? 0.7 : 0.3,
                      }} />
                    ))}
                  </div>
                  <span className="text-[8px] text-muted-foreground mt-0.5 capitalize block">
                    {dir}
                  </span>
                </div>
              ))}
            </div>
            <Grid2>
              <NumField label="Gap" value={s.gap} onChange={(v) => update({ gap: v })} />
              <div>
                <Label className="text-[10px]">Wrap</Label>
                <Select value={s.flexWrap || 'nowrap'} onValueChange={(v) => update({ flexWrap: v as 'wrap' | 'nowrap' })}>
                  <SelectTrigger size="sm" className="text-[11px] h-7 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nowrap">No Wrap</SelectItem>
                    <SelectItem value="wrap">Wrap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Grid2>
            <Grid2>
              <div>
                <Label className="text-[10px]">Align</Label>
                <Select value={s.alignItems || 'stretch'} onValueChange={(v) => update({ alignItems: v as ElementStyles['alignItems'] })}>
                  <SelectTrigger size="sm" className="text-[11px] h-7 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stretch">Stretch</SelectItem>
                    <SelectItem value="flex-start">Start</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="flex-end">End</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Justify</Label>
                <Select value={s.justifyContent || 'flex-start'} onValueChange={(v) => update({ justifyContent: v as ElementStyles['justifyContent'] })}>
                  <SelectTrigger size="sm" className="text-[11px] h-7 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flex-start">Start</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="flex-end">End</SelectItem>
                    <SelectItem value="space-between">Between</SelectItem>
                    <SelectItem value="space-around">Around</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Grid2>
          </Section>
        )}

        {/* Size */}
        <Section title="Size">
          <Grid2>
            <div>
              <Label className="text-[10px]">Width</Label>
              <Input className="text-[11px] h-7" value={s.width || ''} placeholder="auto"
                onChange={(e) => update({ width: e.target.value || undefined })} />
            </div>
            <div>
              <Label className="text-[10px]">Height</Label>
              <Input className="text-[11px] h-7" value={s.height || ''} placeholder="auto"
                onChange={(e) => update({ height: e.target.value || undefined })} />
            </div>
          </Grid2>
          <Grid2>
            <div>
              <Label className="text-[10px]">Min H</Label>
              <Input className="text-[11px] h-7" value={s.minHeight || ''}
                onChange={(e) => update({ minHeight: e.target.value || undefined })} />
            </div>
            <div>
              <Label className="text-[10px]">Max W</Label>
              <Input className="text-[11px] h-7" value={s.maxWidth || ''}
                onChange={(e) => update({ maxWidth: e.target.value || undefined })} />
            </div>
          </Grid2>
        </Section>

        {/* Spacing — visual box model */}
        <Section title="Spacing" defaultOpen>
          <SpacingEditor styles={s} onUpdate={update} />
        </Section>

        {/* Background */}
        <Section title="Fill">
          <ColorField label="Background" value={s.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
          <div>
            <Label className="text-[10px]">Image URL</Label>
            <Input className="text-[11px] h-7" value={s.backgroundImage || ''} placeholder="url(...)"
              onChange={(e) => update({ backgroundImage: e.target.value || undefined })} />
          </div>
          {s.backgroundImage && (
            <Grid2>
              <div>
                <Label className="text-[10px]">Size</Label>
                <Input className="text-[11px] h-7" value={s.backgroundSize || ''} placeholder="cover"
                  onChange={(e) => update({ backgroundSize: e.target.value || undefined })} />
              </div>
              <div>
                <Label className="text-[10px]">Position</Label>
                <Input className="text-[11px] h-7" value={s.backgroundPosition || ''} placeholder="center"
                  onChange={(e) => update({ backgroundPosition: e.target.value || undefined })} />
              </div>
            </Grid2>
          )}
        </Section>

        {/* Border */}
        <Section title="Border">
          <Grid2>
            <NumField label="Width" value={s.borderWidth} onChange={(v) => update({ borderWidth: v })} />
            <NumField label="Radius" value={s.borderRadius} onChange={(v) => update({ borderRadius: v })} />
          </Grid2>
          {(s.borderWidth ?? 0) > 0 && (
            <>
              <ColorField label="Color" value={s.borderColor} onChange={(v) => update({ borderColor: v })} />
              <div className="flex gap-0.5">
                {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => update({ borderStyle: style })}
                    className={`text-[9px] px-2 py-0.5 rounded-full cursor-pointer capitalize transition-colors ${
                      s.borderStyle === style
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* Typography */}
        {(element.type === 'text' || element.type === 'button') && (
          <Section title="Typography" defaultOpen>
            <Grid2>
              <NumField label="Size" value={s.fontSize} onChange={(v) => update({ fontSize: v })} />
              <div>
                <Label className="text-[10px]">Weight</Label>
                <Select value={String(s.fontWeight ?? 400)} onValueChange={(v) => update({ fontWeight: Number(v) })}>
                  <SelectTrigger size="sm" className="text-[11px] h-7 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">Light</SelectItem>
                    <SelectItem value="400">Regular</SelectItem>
                    <SelectItem value="500">Medium</SelectItem>
                    <SelectItem value="600">Semi</SelectItem>
                    <SelectItem value="700">Bold</SelectItem>
                    <SelectItem value="800">Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Grid2>
            <ColorField label="Color" value={s.color} onChange={(v) => update({ color: v })} />
            <ToggleGroup
              value={[s.textAlign || 'left']}
              className="w-full"
            >
              <ToggleGroupItem value="left" onClick={() => update({ textAlign: 'left' })} className="flex-1 py-1">
                <AlignLeft className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" onClick={() => update({ textAlign: 'center' })} className="flex-1 py-1">
                <AlignCenter className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" onClick={() => update({ textAlign: 'right' })} className="flex-1 py-1">
                <AlignRight className="size-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Grid2>
              <NumField label="Line H" value={s.lineHeight} onChange={(v) => update({ lineHeight: v })} step={0.1} />
              <NumField label="Spacing" value={s.letterSpacing} onChange={(v) => update({ letterSpacing: v })} />
            </Grid2>
          </Section>
        )}

        {/* Effects */}
        <Section title="Effects">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Opacity</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {Math.round((s.opacity ?? 1) * 100)}%
              </span>
            </div>
            <Slider
              min={0} max={1} step={0.01}
              value={[s.opacity ?? 1]}
              onValueChange={(v) => update({ opacity: Array.isArray(v) ? v[0] : v })}
              className="mt-0"
            />
          </div>
          <div>
            <Label className="text-[10px]">Shadow</Label>
            <Input className="text-[11px] h-7" value={s.boxShadow || ''}
              onChange={(e) => update({ boxShadow: e.target.value || undefined })}
              placeholder="0 4px 12px rgba(0,0,0,0.3)" />
          </div>
          {/* Shadow presets */}
          <div className="flex gap-0.5 flex-wrap">
            {[
              { label: 'None', value: '' },
              { label: 'SM', value: '0 1px 3px rgba(0,0,0,0.2)' },
              { label: 'MD', value: '0 4px 12px rgba(0,0,0,0.15)' },
              { label: 'LG', value: '0 8px 30px rgba(0,0,0,0.2)' },
              { label: 'XL', value: '0 20px 60px rgba(0,0,0,0.3)' },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => update({ boxShadow: value || undefined })}
                className={`text-[9px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                  (s.boxShadow || '') === value
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <Label className="text-[10px]">Overflow</Label>
            <Select value={s.overflow || 'visible'} onValueChange={(v) => update({ overflow: v as ElementStyles['overflow'] })}>
              <SelectTrigger size="sm" className="text-[11px] h-7 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="auto">Auto (scroll)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ── Collapsible Section ──

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-border">
        <CollapsibleTrigger className="flex items-center px-1.5 py-[3px] cursor-pointer w-full hover:bg-white/[0.02]">
          <span className="p-0 mr-0.5 w-4 h-4 flex items-center justify-center">
            {open
              ? <ChevronDown className="size-3.5 text-muted-foreground" />
              : <ChevronRight className="size-3.5 text-muted-foreground" />
            }
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1 px-1.5 pb-1.5">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ── Visual Spacing (Box Model) Editor ──

function SpacingEditor({ styles, onUpdate }: { styles: ElementStyles; onUpdate: (patch: Partial<ElementStyles>) => void }) {
  const p = { t: styles.paddingTop ?? 0, r: styles.paddingRight ?? 0, b: styles.paddingBottom ?? 0, l: styles.paddingLeft ?? 0 };
  const m = { t: styles.marginTop ?? 0, r: styles.marginRight ?? 0, b: styles.marginBottom ?? 0, l: styles.marginLeft ?? 0 };

  return (
    <div className="relative">
      {/* Margin layer */}
      <div className="relative rounded" style={{ border: '1px dashed rgba(249,115,22,0.3)', padding: 18 }}>
        <span className="absolute text-[7px] font-semibold" style={{ top: 2, left: 6, color: 'rgba(249,115,22,0.5)' }}>
          MARGIN
        </span>
        {/* Margin inputs */}
        <SpacingInput pos="top" value={m.t} onChange={(v) => onUpdate({ marginTop: v })} color="rgba(249,115,22,0.6)" />
        <SpacingInput pos="right" value={m.r} onChange={(v) => onUpdate({ marginRight: v })} color="rgba(249,115,22,0.6)" />
        <SpacingInput pos="bottom" value={m.b} onChange={(v) => onUpdate({ marginBottom: v })} color="rgba(249,115,22,0.6)" />
        <SpacingInput pos="left" value={m.l} onChange={(v) => onUpdate({ marginLeft: v })} color="rgba(249,115,22,0.6)" />

        {/* Padding layer */}
        <div className="relative rounded-sm" style={{ border: '1px dashed rgba(59,130,246,0.3)', padding: 18 }}>
          <span className="absolute text-[7px] font-semibold" style={{ top: 2, left: 6, color: 'rgba(59,130,246,0.5)' }}>
            PADDING
          </span>
          <SpacingInput pos="top" value={p.t} onChange={(v) => onUpdate({ paddingTop: v })} color="rgba(59,130,246,0.6)" />
          <SpacingInput pos="right" value={p.r} onChange={(v) => onUpdate({ paddingRight: v })} color="rgba(59,130,246,0.6)" />
          <SpacingInput pos="bottom" value={p.b} onChange={(v) => onUpdate({ paddingBottom: v })} color="rgba(59,130,246,0.6)" />
          <SpacingInput pos="left" value={p.l} onChange={(v) => onUpdate({ paddingLeft: v })} color="rgba(59,130,246,0.6)" />

          {/* Content placeholder */}
          <div className="rounded-sm h-5 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <span className="text-[7px] text-muted-foreground">content</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpacingInput({ pos, value, onChange, color }: {
  pos: 'top' | 'right' | 'bottom' | 'left'; value: number; onChange: (v: number) => void; color: string;
}) {
  const posStyles: Record<string, Record<string, unknown>> = {
    top: { top: 1, left: '50%', transform: 'translateX(-50%)' },
    right: { right: 1, top: '50%', transform: 'translateY(-50%)' },
    bottom: { bottom: 1, left: '50%', transform: 'translateX(-50%)' },
    left: { left: 1, top: '50%', transform: 'translateY(-50%)' },
  };

  return (
    <input
      type="number"
      value={value || 0}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="absolute w-7 bg-transparent border-none text-[9px] font-semibold font-mono text-center outline-none p-0 focus:bg-white/5 focus:rounded-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      style={{
        ...posStyles[pos],
        color,
        MozAppearance: 'textfield' as unknown as undefined,
      }}
    />
  );
}

// ── Helpers ──

function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-1">{children}</div>;
}

function NumField({ label, value, onChange, step }: {
  label: string; value?: number; onChange: (v: number | undefined) => void; step?: number;
}) {
  return (
    <div>
      <Label className="text-[10px]">{label}</Label>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
        step={step || 1}
        className="text-[11px] h-7"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: {
  label: string; value?: string; onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded-md cursor-pointer p-0 shrink-0"
        style={{ border: '2px solid rgba(255,255,255,0.1)' }}
      />
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={label}
        className="flex-1 text-[11px] h-7"
      />
    </div>
  );
}

// ── Theme panel ──

function ThemePanel({ theme, onChange }: { theme: SiteConfig['theme']; onChange: (t: SiteConfig['theme']) => void }) {
  return (
    <div className="p-1.5">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
        Site Theme
      </span>
      <div className="flex flex-col gap-1.5">
        {([['Primary', 'primaryColor'], ['Background', 'backgroundColor'], ['Text', 'textColor']] as const).map(([label, key]) => (
          <ColorField
            key={key}
            label={label}
            value={theme[key]}
            onChange={(v) => onChange({ ...theme, [key]: v || theme[key] })}
          />
        ))}
        <Separator />
        <div>
          <Label className="text-[10px]">Font Family</Label>
          <Select value={theme.fontFamily ?? 'Inter, sans-serif'} onValueChange={(v) => v && onChange({ ...theme, fontFamily: v })}>
            <SelectTrigger size="sm" className="text-[11px] h-7 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter, sans-serif">Inter</SelectItem>
              <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
              <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
              <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
              <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
