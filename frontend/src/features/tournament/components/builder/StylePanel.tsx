import { useState, type ReactNode } from 'react';
import {
  Box,
  Typography,
  TextField,
  Stack,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Chip,
  Collapse,
} from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      {/* Element header */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: `${color}08` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', flex: 1 }}>
            {element.type}
          </Typography>
          <Chip label={element.type} size="small" sx={{ height: 16, fontSize: 8, bgcolor: `${color}20`, color, fontWeight: 600 }} />
        </Box>
        <TextField
          size="small" fullWidth value={element.name || ''} placeholder="Element name"
          onChange={(e) => onUpdateName(element.id, e.target.value)}
          sx={{ '& .MuiInputBase-input': { fontSize: 11, py: 0.5 }, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.1)' } }}
        />
      </Box>

      <Stack spacing={0} sx={{ pb: 2 }}>
        {/* Content */}
        {(element.type === 'text' || element.type === 'button' || element.type === 'image') && (
          <Section title="Content" defaultOpen>
            {(element.type === 'text' || element.type === 'button') && (
              <TextField
                size="small" fullWidth multiline={element.type === 'text'} rows={element.type === 'text' ? 3 : 1}
                value={element.content || ''} placeholder={element.type === 'text' ? 'Enter text...' : 'Button label'}
                onChange={(e) => onUpdateContent(element.id, e.target.value)}
                sx={inputSx}
              />
            )}
            {element.type === 'image' && (
              <TextField
                size="small" fullWidth value={element.content || ''} placeholder="https://example.com/image.jpg"
                onChange={(e) => onUpdateContent(element.id, e.target.value)}
                sx={inputSx}
              />
            )}
            {element.type === 'button' && element.href !== undefined && (
              <TextField
                size="small" fullWidth value={element.href || ''} placeholder="https://link-url..."
                label="Link URL" sx={{ mt: 1, ...inputSx }}
              />
            )}
          </Section>
        )}

        {/* Layout (containers) */}
        {element.type === 'container' && (
          <Section title="Layout" defaultOpen>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
              {(['column', 'row'] as const).map((dir) => (
                <Box
                  key={dir}
                  onClick={() => update({ flexDirection: dir })}
                  sx={{
                    flex: 1, py: 0.75, borderRadius: 1, cursor: 'pointer', textAlign: 'center',
                    border: '1px solid',
                    borderColor: s.flexDirection === dir ? '#3b82f6' : 'divider',
                    bgcolor: s.flexDirection === dir ? 'rgba(59,130,246,0.08)' : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: '#3b82f6' },
                  }}
                >
                  <Box sx={{
                    display: 'flex', gap: 0.3,
                    flexDirection: dir, alignItems: 'center', justifyContent: 'center',
                    height: 20,
                  }}>
                    {[1, 2, 3].map((i) => (
                      <Box key={i} sx={{
                        width: dir === 'row' ? 8 : 16,
                        height: dir === 'row' ? 14 : 4,
                        bgcolor: s.flexDirection === dir ? '#3b82f6' : 'text.disabled',
                        borderRadius: 0.25, opacity: s.flexDirection === dir ? 0.7 : 0.3,
                      }} />
                    ))}
                  </Box>
                  <Typography sx={{ fontSize: 8, color: 'text.secondary', mt: 0.25, textTransform: 'capitalize' }}>
                    {dir}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Grid2>
              <NumField label="Gap" value={s.gap} onChange={(v) => update({ gap: v })} />
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: 11 }}>Wrap</InputLabel>
                <Select value={s.flexWrap || 'nowrap'} label="Wrap" sx={{ fontSize: 11 }}
                  onChange={(e) => update({ flexWrap: e.target.value as 'wrap' | 'nowrap' })}>
                  <MenuItem value="nowrap">No Wrap</MenuItem>
                  <MenuItem value="wrap">Wrap</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <Grid2>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: 11 }}>Align</InputLabel>
                <Select value={s.alignItems || 'stretch'} label="Align" sx={{ fontSize: 11 }}
                  onChange={(e) => update({ alignItems: e.target.value as ElementStyles['alignItems'] })}>
                  <MenuItem value="stretch">Stretch</MenuItem>
                  <MenuItem value="flex-start">Start</MenuItem>
                  <MenuItem value="center">Center</MenuItem>
                  <MenuItem value="flex-end">End</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: 11 }}>Justify</InputLabel>
                <Select value={s.justifyContent || 'flex-start'} label="Justify" sx={{ fontSize: 11 }}
                  onChange={(e) => update({ justifyContent: e.target.value as ElementStyles['justifyContent'] })}>
                  <MenuItem value="flex-start">Start</MenuItem>
                  <MenuItem value="center">Center</MenuItem>
                  <MenuItem value="flex-end">End</MenuItem>
                  <MenuItem value="space-between">Between</MenuItem>
                  <MenuItem value="space-around">Around</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
          </Section>
        )}

        {/* Size */}
        <Section title="Size">
          <Grid2>
            <TextField size="small" label="Width" value={s.width || ''} sx={inputSx}
              onChange={(e) => update({ width: e.target.value || undefined })} placeholder="auto" />
            <TextField size="small" label="Height" value={s.height || ''} sx={inputSx}
              onChange={(e) => update({ height: e.target.value || undefined })} placeholder="auto" />
          </Grid2>
          <Grid2>
            <TextField size="small" label="Min H" value={s.minHeight || ''} sx={inputSx}
              onChange={(e) => update({ minHeight: e.target.value || undefined })} />
            <TextField size="small" label="Max W" value={s.maxWidth || ''} sx={inputSx}
              onChange={(e) => update({ maxWidth: e.target.value || undefined })} />
          </Grid2>
        </Section>

        {/* Spacing — visual box model */}
        <Section title="Spacing" defaultOpen>
          <SpacingEditor styles={s} onUpdate={update} />
        </Section>

        {/* Background */}
        <Section title="Fill">
          <ColorField label="Background" value={s.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
          <TextField size="small" label="Image URL" value={s.backgroundImage || ''} sx={inputSx}
            onChange={(e) => update({ backgroundImage: e.target.value || undefined })} placeholder="url(...)" />
          {s.backgroundImage && (
            <Grid2>
              <TextField size="small" label="Size" value={s.backgroundSize || ''} sx={inputSx}
                onChange={(e) => update({ backgroundSize: e.target.value || undefined })} placeholder="cover" />
              <TextField size="small" label="Position" value={s.backgroundPosition || ''} sx={inputSx}
                onChange={(e) => update({ backgroundPosition: e.target.value || undefined })} placeholder="center" />
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
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                  <Chip
                    key={style}
                    label={style}
                    size="small"
                    variant={s.borderStyle === style ? 'filled' : 'outlined'}
                    onClick={() => update({ borderStyle: style })}
                    sx={{ height: 20, fontSize: 9, cursor: 'pointer', textTransform: 'capitalize' }}
                  />
                ))}
              </Box>
            </>
          )}
        </Section>

        {/* Typography */}
        {(element.type === 'text' || element.type === 'button') && (
          <Section title="Typography" defaultOpen>
            <Grid2>
              <NumField label="Size" value={s.fontSize} onChange={(v) => update({ fontSize: v })} />
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: 11 }}>Weight</InputLabel>
                <Select value={s.fontWeight ?? 400} label="Weight" sx={{ fontSize: 11 }}
                  onChange={(e) => update({ fontWeight: Number(e.target.value) })}>
                  <MenuItem value={300}>Light</MenuItem>
                  <MenuItem value={400}>Regular</MenuItem>
                  <MenuItem value={500}>Medium</MenuItem>
                  <MenuItem value={600}>Semi</MenuItem>
                  <MenuItem value={700}>Bold</MenuItem>
                  <MenuItem value={800}>Extra</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <ColorField label="Color" value={s.color} onChange={(v) => update({ color: v })} />
            <ToggleButtonGroup
              value={s.textAlign || 'left'}
              exclusive size="small" fullWidth
              onChange={(_, v) => { if (v) update({ textAlign: v }); }}
              sx={{ '& .MuiToggleButton-root': { py: 0.4, flex: 1 } }}
            >
              <ToggleButton value="left"><FormatAlignLeftIcon sx={{ fontSize: 14 }} /></ToggleButton>
              <ToggleButton value="center"><FormatAlignCenterIcon sx={{ fontSize: 14 }} /></ToggleButton>
              <ToggleButton value="right"><FormatAlignRightIcon sx={{ fontSize: 14 }} /></ToggleButton>
            </ToggleButtonGroup>
            <Grid2>
              <NumField label="Line H" value={s.lineHeight} onChange={(v) => update({ lineHeight: v })} step={0.1} />
              <NumField label="Spacing" value={s.letterSpacing} onChange={(v) => update({ letterSpacing: v })} />
            </Grid2>
          </Section>
        )}

        {/* Effects */}
        <Section title="Effects">
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Opacity</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: 'monospace' }}>
                {Math.round((s.opacity ?? 1) * 100)}%
              </Typography>
            </Box>
            <Slider
              size="small" min={0} max={1} step={0.01}
              value={s.opacity ?? 1}
              onChange={(_, v) => update({ opacity: v as number })}
              sx={{ mt: 0 }}
            />
          </Box>
          <TextField size="small" label="Shadow" value={s.boxShadow || ''} sx={inputSx}
            onChange={(e) => update({ boxShadow: e.target.value || undefined })}
            placeholder="0 4px 12px rgba(0,0,0,0.3)" />
          {/* Shadow presets */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {[
              { label: 'None', value: '' },
              { label: 'SM', value: '0 1px 3px rgba(0,0,0,0.2)' },
              { label: 'MD', value: '0 4px 12px rgba(0,0,0,0.15)' },
              { label: 'LG', value: '0 8px 30px rgba(0,0,0,0.2)' },
              { label: 'XL', value: '0 20px 60px rgba(0,0,0,0.3)' },
            ].map(({ label, value }) => (
              <Chip
                key={label}
                label={label}
                size="small"
                variant={(s.boxShadow || '') === value ? 'filled' : 'outlined'}
                onClick={() => update({ boxShadow: value || undefined })}
                sx={{ height: 20, fontSize: 9, cursor: 'pointer' }}
              />
            ))}
          </Box>
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: 11 }}>Overflow</InputLabel>
            <Select value={s.overflow || 'visible'} label="Overflow" sx={{ fontSize: 11 }}
              onChange={(e) => update({ overflow: e.target.value as ElementStyles['overflow'] })}>
              <MenuItem value="visible">Visible</MenuItem>
              <MenuItem value="hidden">Hidden</MenuItem>
              <MenuItem value="auto">Auto (scroll)</MenuItem>
            </Select>
          </FormControl>
        </Section>
      </Stack>
    </Box>
  );
}

// ── Collapsible Section ──

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex', alignItems: 'center', px: 1.5, py: 0.75,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
        }}
      >
        <IconButton size="small" sx={{ p: 0, mr: 0.5, width: 16, height: 16 }}>
          {open
            ? <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            : <ChevronRightIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          }
        </IconButton>
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <Collapse in={open}>
        <Stack spacing={1} sx={{ px: 1.5, pb: 1.5 }}>
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
}

// ── Visual Spacing (Box Model) Editor ──

function SpacingEditor({ styles, onUpdate }: { styles: ElementStyles; onUpdate: (patch: Partial<ElementStyles>) => void }) {
  const p = { t: styles.paddingTop ?? 0, r: styles.paddingRight ?? 0, b: styles.paddingBottom ?? 0, l: styles.paddingLeft ?? 0 };
  const m = { t: styles.marginTop ?? 0, r: styles.marginRight ?? 0, b: styles.marginBottom ?? 0, l: styles.marginLeft ?? 0 };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Margin layer */}
      <Box sx={{
        border: '1px dashed rgba(249,115,22,0.3)', borderRadius: 1,
        p: '18px', position: 'relative',
      }}>
        <Typography sx={{ position: 'absolute', top: 2, left: 6, fontSize: 7, color: 'rgba(249,115,22,0.5)', fontWeight: 600 }}>
          MARGIN
        </Typography>
        {/* Margin inputs */}
        <SpacingInput pos="top" value={m.t} onChange={(v) => onUpdate({ marginTop: v })} color="rgba(249,115,22,0.6)" />
        <SpacingInput pos="right" value={m.r} onChange={(v) => onUpdate({ marginRight: v })} color="rgba(249,115,22,0.6)" />
        <SpacingInput pos="bottom" value={m.b} onChange={(v) => onUpdate({ marginBottom: v })} color="rgba(249,115,22,0.6)" />
        <SpacingInput pos="left" value={m.l} onChange={(v) => onUpdate({ marginLeft: v })} color="rgba(249,115,22,0.6)" />

        {/* Padding layer */}
        <Box sx={{
          border: '1px dashed rgba(59,130,246,0.3)', borderRadius: 0.5,
          p: '18px', position: 'relative',
        }}>
          <Typography sx={{ position: 'absolute', top: 2, left: 6, fontSize: 7, color: 'rgba(59,130,246,0.5)', fontWeight: 600 }}>
            PADDING
          </Typography>
          <SpacingInput pos="top" value={p.t} onChange={(v) => onUpdate({ paddingTop: v })} color="rgba(59,130,246,0.6)" />
          <SpacingInput pos="right" value={p.r} onChange={(v) => onUpdate({ paddingRight: v })} color="rgba(59,130,246,0.6)" />
          <SpacingInput pos="bottom" value={p.b} onChange={(v) => onUpdate({ paddingBottom: v })} color="rgba(59,130,246,0.6)" />
          <SpacingInput pos="left" value={p.l} onChange={(v) => onUpdate({ paddingLeft: v })} color="rgba(59,130,246,0.6)" />

          {/* Content placeholder */}
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 0.5,
            height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{ fontSize: 7, color: 'text.disabled' }}>content</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
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
    <Box
      component="input"
      type="number"
      value={value || 0}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseInt(e.target.value) || 0)}
      sx={{
        position: 'absolute',
        ...posStyles[pos],
        width: 28,
        bgcolor: 'transparent',
        border: 'none',
        color,
        fontSize: 9,
        fontWeight: 600,
        fontFamily: 'monospace',
        textAlign: 'center',
        outline: 'none',
        p: 0,
        '&:focus': { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 0.5 },
        // Hide number spinners
        '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': { appearance: 'none' },
        MozAppearance: 'textfield',
      }}
    />
  );
}

// ── Helpers ──

const inputSx = { '& .MuiInputBase-input': { fontSize: 11 } };

function Grid2({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>{children}</Box>;
}

function NumField({ label, value, onChange, step }: {
  label: string; value?: number; onChange: (v: number | undefined) => void; step?: number;
}) {
  return (
    <TextField
      size="small" label={label} type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
      slotProps={{ htmlInput: { step: step || 1 } }}
      sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
    />
  );
}

function ColorField({ label, value, onChange }: {
  label: string; value?: string; onChange: (v: string | undefined) => void;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="input" type="color"
        value={value || '#000000'}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        style={{
          width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: 6, cursor: 'pointer', padding: 0, flexShrink: 0,
        }}
      />
      <TextField
        size="small" value={value || ''} sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 11 } }}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={label}
      />
    </Box>
  );
}

// ── Theme panel ──

function ThemePanel({ theme, onChange }: { theme: SiteConfig['theme']; onChange: (t: SiteConfig['theme']) => void }) {
  return (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
        Site Theme
      </Typography>
      <Stack spacing={1.5}>
        {([['Primary', 'primaryColor'], ['Background', 'backgroundColor'], ['Text', 'textColor']] as const).map(([label, key]) => (
          <ColorField
            key={key}
            label={label}
            value={theme[key]}
            onChange={(v) => onChange({ ...theme, [key]: v || theme[key] })}
          />
        ))}
        <Divider />
        <FormControl size="small" fullWidth>
          <InputLabel sx={{ fontSize: 11 }}>Font Family</InputLabel>
          <Select value={theme.fontFamily} label="Font Family" onChange={(e) => onChange({ ...theme, fontFamily: e.target.value })} sx={{ fontSize: 11 }}>
            <MenuItem value="Inter, sans-serif">Inter</MenuItem>
            <MenuItem value="'Roboto', sans-serif">Roboto</MenuItem>
            <MenuItem value="'Poppins', sans-serif">Poppins</MenuItem>
            <MenuItem value="'Montserrat', sans-serif">Montserrat</MenuItem>
            <MenuItem value="system-ui, sans-serif">System UI</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}
