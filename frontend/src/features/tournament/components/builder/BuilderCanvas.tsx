import { useRef, useState, useCallback, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import AddIcon from '@mui/icons-material/Add';
import type { BuilderElement, ElementStyles, SiteConfig } from '../../types/siteConfig';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTHS: Record<DeviceMode, number> = { desktop: 1440, tablet: 768, mobile: 375 };

interface BuilderCanvasProps {
  elements: Record<string, BuilderElement>;
  rootIds: string[];
  config: SiteConfig;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateStyles: (id: string, styles: Partial<ElementStyles>) => void;
  onDropElement: (type: string, parentId: string | null, index: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveElement: (id: string, direction: -1 | 1) => void;
}

export default function BuilderCanvas({
  elements,
  rootIds,
  config,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onUpdateContent,
  onUpdateStyles,
  onDropElement,
  onDelete,
  onDuplicate,
  onMoveElement,
}: BuilderCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [zoom, setZoom] = useState(100);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const canvasWidth = DEVICE_WIDTHS[device];

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId) return;
      // Don't capture when editing text
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).contentEditable === 'true') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete(selectedId);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onSelect(null);
      }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onDuplicate(selectedId);
      }
      if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onMoveElement(selectedId, -1);
      }
      if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onMoveElement(selectedId, 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, onDelete, onSelect, onDuplicate, onMoveElement]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onSelect(null);
  }, [onSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropTarget('root');
  }, []);

  const handleDragLeave = useCallback(() => setDropTarget(null), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const type = e.dataTransfer.getData('builder/element-type');
    if (type) onDropElement(type, null, rootIds.length);
  }, [onDropElement, rootIds.length]);

  // Breadcrumb: walk up parent chain
  const breadcrumb = selectedId ? getBreadcrumb(selectedId, elements, rootIds) : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Canvas toolbar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', flexShrink: 0,
      }}>
        {/* Breadcrumb */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, overflow: 'hidden' }}>
          {breadcrumb.length > 0 ? (
            breadcrumb.map((crumb, i) => (
              <Box key={crumb.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {i > 0 && <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>/</Typography>}
                <Chip
                  label={crumb.name}
                  size="small"
                  onClick={() => onSelect(crumb.id)}
                  variant={crumb.id === selectedId ? 'filled' : 'outlined'}
                  color={crumb.id === selectedId ? 'primary' : 'default'}
                  sx={{ height: 20, fontSize: 10, cursor: 'pointer' }}
                />
              </Box>
            ))
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
              Click an element to select it
            </Typography>
          )}
        </Box>

        {/* Device toggle */}
        <ToggleButtonGroup
          value={device}
          exclusive
          onChange={(_, v) => { if (v) setDevice(v); }}
          size="small"
          sx={{ '& .MuiToggleButton-root': { px: 0.75, py: 0.25 } }}
        >
          <ToggleButton value="desktop"><Tooltip title="Desktop (1440px)"><DesktopWindowsIcon sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
          <ToggleButton value="tablet"><Tooltip title="Tablet (768px)"><TabletMacIcon sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
          <ToggleButton value="mobile"><Tooltip title="Mobile (375px)"><PhoneIphoneIcon sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
        </ToggleButtonGroup>

        {/* Zoom */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <IconButton size="small" onClick={() => setZoom(Math.max(25, zoom - 25))} disabled={zoom <= 25}>
            <ZoomOutIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Typography variant="caption" sx={{ fontSize: 10, fontFamily: 'monospace', minWidth: 32, textAlign: 'center' }}>
            {zoom}%
          </Typography>
          <IconButton size="small" onClick={() => setZoom(Math.min(200, zoom + 25))} disabled={zoom >= 200}>
            <ZoomInIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Canvas area */}
      <Box
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: '#0e0e10',
          display: 'flex',
          justifyContent: 'center',
          py: 4,
          // Subtle grid pattern
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <Box
          onClick={handleCanvasClick}
          sx={{
            width: canvasWidth,
            minHeight: 600,
            maxWidth: '100%',
            bgcolor: config.theme.backgroundColor,
            color: config.theme.textColor,
            fontFamily: config.theme.fontFamily,
            boxShadow: '0 8px 60px rgba(0,0,0,0.5)',
            borderRadius: 1.5,
            position: 'relative',
            overflow: 'hidden',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'width 0.3s ease, transform 0.2s ease',
            // Drop zone glow
            ...(dropTarget === 'root' ? {
              outline: '2px dashed #1976d2',
              outlineOffset: 4,
              boxShadow: '0 8px 60px rgba(0,0,0,0.5), 0 0 30px rgba(25,118,210,0.2)',
            } : {}),
          }}
        >
          {rootIds.length === 0 ? (
            <EmptyState />
          ) : (
            rootIds.map((id) => (
              <BuilderElementRenderer
                key={id}
                elementId={id}
                elements={elements}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={onSelect}
                onHover={onHover}
                onUpdateContent={onUpdateContent}
                onUpdateStyles={onUpdateStyles}
                onDropElement={onDropElement}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMoveElement={onMoveElement}
                depth={0}
              />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ── Empty state ──

function EmptyState() {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 500, gap: 2, py: 8,
    }}>
      <Box sx={{
        width: 80, height: 80, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '2px dashed rgba(255,255,255,0.1)',
      }}>
        <AddIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.15)' }} />
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500, mb: 0.5 }}>
          Start building your page
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', display: 'block', maxWidth: 280 }}>
          Drag elements from the left panel or click the + buttons to add containers, text, images, and more
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        {['Container', 'Text', 'Image'].map((label) => (
          <Chip
            key={label}
            label={label}
            size="small"
            variant="outlined"
            sx={{
              height: 24, fontSize: 10,
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)',
              borderStyle: 'dashed',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ── Breadcrumb helper ──

function getBreadcrumb(
  elementId: string,
  elements: Record<string, BuilderElement>,
  rootIds: string[],
): { id: string; name: string }[] {
  const path: { id: string; name: string }[] = [];

  // Find parent chain
  const findPath = (targetId: string, searchIds: string[], currentPath: string[]): string[] | null => {
    for (const id of searchIds) {
      if (id === targetId) return [...currentPath, id];
      const el = elements[id];
      if (el?.children.length) {
        const found = findPath(targetId, el.children, [...currentPath, id]);
        if (found) return found;
      }
    }
    return null;
  };

  const chain = findPath(elementId, rootIds, []);
  if (chain) {
    for (const id of chain) {
      const el = elements[id];
      if (el) path.push({ id, name: el.name || el.type });
    }
  }

  return path;
}

// ── Resize handle types ──

type ResizeEdge = 'right' | 'bottom' | 'bottom-right';

// ── Recursive element renderer ──

interface BuilderElementRendererProps {
  elementId: string;
  elements: Record<string, BuilderElement>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateStyles: (id: string, styles: Partial<ElementStyles>) => void;
  onDropElement: (type: string, parentId: string | null, index: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveElement: (id: string, direction: -1 | 1) => void;
  depth: number;
}

function BuilderElementRenderer({
  elementId,
  elements,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onUpdateContent,
  onUpdateStyles,
  onDropElement,
  onDelete,
  onDuplicate,
  onMoveElement,
  depth,
}: BuilderElementRendererProps) {
  const el = elements[elementId];
  const boxRef = useRef<HTMLDivElement>(null);
  const [isDropOver, setIsDropOver] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null);
  if (!el) return null;

  const isSelected = selectedId === elementId;
  const isHovered = hoveredId === elementId && !isSelected;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(elementId);
  }, [elementId, onSelect]);

  const handleMouseEnter = useCallback(() => { if (!resizing) onHover(elementId); }, [elementId, onHover, resizing]);
  const handleMouseLeave = useCallback(() => { if (!resizing) onHover(null); }, [onHover, resizing]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (el.type !== 'container') return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDropOver(true);
  }, [el.type]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (el.type !== 'container') return;
    e.stopPropagation();
    setIsDropOver(false);
  }, [el.type]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (el.type !== 'container') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDropOver(false);
    const type = e.dataTransfer.getData('builder/element-type');
    if (type) onDropElement(type, elementId, el.children.length);
  }, [el, elementId, onDropElement]);

  // ── Resize ──
  const handleResizePointerDown = useCallback((e: React.PointerEvent, edge: ResizeEdge) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = rect.width;
    const startH = rect.height;

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      const patch: Partial<ElementStyles> = {};
      let w = startW, h = startH;
      if (edge === 'right' || edge === 'bottom-right') {
        w = Math.max(40, Math.round(startW + dx));
        patch.width = `${w}px`;
      }
      if (edge === 'bottom' || edge === 'bottom-right') {
        h = Math.max(20, Math.round(startH + dy));
        patch.height = `${h}px`;
      }
      setResizeSize({ w, h });
      onUpdateStyles(elementId, patch);
    };

    const handleUp = () => {
      setResizing(false);
      setResizeSize(null);
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
  }, [elementId, onUpdateStyles]);

  const cssStyles = stylesToCSS(el.styles);

  // Outline colors
  const accentColor = '#3b82f6';
  const outlineStyle = isSelected
    ? `2px solid ${accentColor}`
    : isHovered
    ? `1.5px dashed ${accentColor}88`
    : isDropOver
    ? `2px dashed ${accentColor}`
    : 'none';

  return (
    <Box
      ref={boxRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        ...cssStyles,
        outline: outlineStyle,
        outlineOffset: isSelected ? -1 : 0,
        position: 'relative',
        cursor: 'default',
        transition: resizing ? 'none' : 'outline 0.15s',
        // Drop zone background pulse
        ...(isDropOver ? {
          bgcolor: el.styles.backgroundColor
            ? el.styles.backgroundColor
            : 'rgba(59,130,246,0.04)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(59,130,246,0.06)',
            borderRadius: 'inherit',
            pointerEvents: 'none',
            zIndex: 0,
          },
        } : {}),
      }}
    >
      {/* Element label tag */}
      {(isSelected || isHovered) && (
        <Box sx={{
          position: 'absolute',
          top: -20,
          left: -1,
          display: 'flex', alignItems: 'center', gap: 0,
          zIndex: 1000,
          pointerEvents: 'none',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <Box sx={{
            fontSize: 9,
            fontWeight: 600,
            color: '#fff',
            bgcolor: isSelected ? accentColor : `${accentColor}99`,
            px: 0.75,
            py: 0.15,
            borderRadius: '4px 4px 0 0',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}>
            {el.name || el.type}
          </Box>
          {/* Resize dimensions */}
          {resizing && resizeSize && (
            <Box sx={{
              fontSize: 9, fontWeight: 500, color: '#fff',
              bgcolor: 'rgba(0,0,0,0.7)', px: 0.75, py: 0.15,
              borderRadius: '0 4px 0 0', lineHeight: 1.4,
              fontFamily: 'monospace',
            }}>
              {resizeSize.w} × {resizeSize.h}
            </Box>
          )}
        </Box>
      )}

      {/* Quick action toolbar (floating) */}
      {isSelected && !resizing && (
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -1,
          display: 'flex', gap: 0,
          zIndex: 1001,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {[
            { icon: <VerticalAlignTopIcon sx={{ fontSize: 12 }} />, tip: 'Move up (Ctrl+↑)', action: () => onMoveElement(elementId, -1) },
            { icon: <VerticalAlignBottomIcon sx={{ fontSize: 12 }} />, tip: 'Move down (Ctrl+↓)', action: () => onMoveElement(elementId, 1) },
            { icon: <ContentCopyIcon sx={{ fontSize: 11 }} />, tip: 'Duplicate (Ctrl+D)', action: () => onDuplicate(elementId) },
            { icon: <DeleteOutlineIcon sx={{ fontSize: 12 }} />, tip: 'Delete', action: () => onDelete(elementId), color: '#ef4444' },
          ].map(({ icon, tip, action, color }, i) => (
            <Tooltip key={i} title={tip} placement="top" arrow>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); action(); }}
                sx={{
                  width: 20, height: 20,
                  bgcolor: accentColor, color: '#fff',
                  borderRadius: i === 0 ? '4px 0 0 0' : i === 3 ? '0 4px 0 0' : 0,
                  '&:hover': { bgcolor: color || '#2563eb' },
                }}
              >
                {icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Resize handles */}
      {isSelected && (
        <>
          {/* Right */}
          <Box
            onPointerDown={(e) => handleResizePointerDown(e, 'right')}
            sx={{
              position: 'absolute', top: '50%', right: -4, width: 8, height: 32,
              transform: 'translateY(-50%)', cursor: 'ew-resize', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '&::after': {
                content: '""', width: 3, height: 16,
                bgcolor: accentColor, borderRadius: 4, opacity: 0.8,
                transition: 'height 0.15s, opacity 0.15s',
              },
              '&:hover::after': { height: 24, opacity: 1 },
            }}
          />
          {/* Bottom */}
          <Box
            onPointerDown={(e) => handleResizePointerDown(e, 'bottom')}
            sx={{
              position: 'absolute', bottom: -4, left: '50%', width: 32, height: 8,
              transform: 'translateX(-50%)', cursor: 'ns-resize', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '&::after': {
                content: '""', width: 16, height: 3,
                bgcolor: accentColor, borderRadius: 4, opacity: 0.8,
                transition: 'width 0.15s, opacity 0.15s',
              },
              '&:hover::after': { width: 24, opacity: 1 },
            }}
          />
          {/* Corner */}
          <Box
            onPointerDown={(e) => handleResizePointerDown(e, 'bottom-right')}
            sx={{
              position: 'absolute', bottom: -5, right: -5, width: 10, height: 10,
              cursor: 'nwse-resize', zIndex: 201,
              bgcolor: '#fff', border: `2px solid ${accentColor}`,
              borderRadius: '50%',
              transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.3)' },
            }}
          />
        </>
      )}

      {/* Padding visualization (when selected) */}
      {isSelected && hasPadding(el.styles) && (
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          borderTop: el.styles.paddingTop ? `${el.styles.paddingTop}px solid rgba(59,130,246,0.06)` : 'none',
          borderRight: el.styles.paddingRight ? `${el.styles.paddingRight}px solid rgba(59,130,246,0.06)` : 'none',
          borderBottom: el.styles.paddingBottom ? `${el.styles.paddingBottom}px solid rgba(59,130,246,0.06)` : 'none',
          borderLeft: el.styles.paddingLeft ? `${el.styles.paddingLeft}px solid rgba(59,130,246,0.06)` : 'none',
        }} />
      )}

      {/* Element content */}
      {el.type === 'text' && (
        <Typography
          component="div"
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => onUpdateContent(elementId, e.currentTarget.textContent || '')}
          sx={{
            outline: 'none',
            cursor: isSelected ? 'text' : 'default',
            minHeight: '1em',
            whiteSpace: 'pre-wrap',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {el.content || 'Add text...'}
        </Typography>
      )}

      {el.type === 'image' && (
        el.content ? (
          <Box
            component="img"
            src={el.content}
            sx={{ display: 'block', width: '100%', height: el.styles.height || 'auto', objectFit: 'cover', position: 'relative', zIndex: 1 }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 140, bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 1, gap: 0.5,
          }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 16, opacity: 0.2 }}>🖼</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>Set image URL in panel →</Typography>
          </Box>
        )
      )}

      {el.type === 'button' && (
        <Box
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => onUpdateContent(elementId, e.currentTarget.textContent || '')}
          sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: isSelected ? 'text' : 'pointer',
            outline: 'none', position: 'relative', zIndex: 1,
          }}
        >
          {el.content || 'Button'}
        </Box>
      )}

      {el.type === 'divider' && null}
      {el.type === 'spacer' && (
        isSelected ? (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', minHeight: 20,
          }}>
            <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>
              spacer {el.styles.height || '40px'}
            </Typography>
          </Box>
        ) : null
      )}

      {/* Container children */}
      {el.type === 'container' && (
        <>
          {el.children.length === 0 ? (
            <Box sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 80, gap: 0.5,
              border: isDropOver ? '2px dashed rgba(59,130,246,0.4)' : '1px dashed rgba(255,255,255,0.08)',
              borderRadius: 1, transition: 'border-color 0.2s, background 0.2s',
              bgcolor: isDropOver ? 'rgba(59,130,246,0.04)' : 'transparent',
              fontFamily: 'Inter, system-ui, sans-serif',
              position: 'relative', zIndex: 1,
            }}>
              <AddIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.1)' }} />
              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>
                Drop elements here
              </Typography>
            </Box>
          ) : (
            el.children.map((childId) => (
              <BuilderElementRenderer
                key={childId}
                elementId={childId}
                elements={elements}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={onSelect}
                onHover={onHover}
                onUpdateContent={onUpdateContent}
                onUpdateStyles={onUpdateStyles}
                onDropElement={onDropElement}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMoveElement={onMoveElement}
                depth={depth + 1}
              />
            ))
          )}
        </>
      )}
    </Box>
  );
}

// ── Helpers ──

function hasPadding(s: ElementStyles): boolean {
  return !!(s.paddingTop || s.paddingRight || s.paddingBottom || s.paddingLeft);
}

function stylesToCSS(styles: ElementStyles): Record<string, unknown> {
  const css: Record<string, unknown> = {};

  if (styles.display) css.display = styles.display;
  if (styles.flexDirection) css.flexDirection = styles.flexDirection;
  if (styles.alignItems) css.alignItems = styles.alignItems;
  if (styles.justifyContent) css.justifyContent = styles.justifyContent;
  if (styles.flexWrap) css.flexWrap = styles.flexWrap;
  if (styles.gap != null) css.gap = `${styles.gap}px`;

  if (styles.width) css.width = styles.width;
  if (styles.height) css.height = styles.height;
  if (styles.minHeight) css.minHeight = styles.minHeight;
  if (styles.maxWidth) css.maxWidth = styles.maxWidth;

  if (styles.paddingTop != null) css.paddingTop = `${styles.paddingTop}px`;
  if (styles.paddingRight != null) css.paddingRight = `${styles.paddingRight}px`;
  if (styles.paddingBottom != null) css.paddingBottom = `${styles.paddingBottom}px`;
  if (styles.paddingLeft != null) css.paddingLeft = `${styles.paddingLeft}px`;
  if (styles.marginTop != null) css.marginTop = `${styles.marginTop}px`;
  if (styles.marginRight != null) css.marginRight = `${styles.marginRight}px`;
  if (styles.marginBottom != null) css.marginBottom = `${styles.marginBottom}px`;
  if (styles.marginLeft != null) css.marginLeft = `${styles.marginLeft}px`;

  if (styles.backgroundColor) css.backgroundColor = styles.backgroundColor;
  if (styles.backgroundImage) css.backgroundImage = styles.backgroundImage;
  if (styles.backgroundSize) css.backgroundSize = styles.backgroundSize;
  if (styles.backgroundPosition) css.backgroundPosition = styles.backgroundPosition;

  if (styles.borderRadius != null) css.borderRadius = `${styles.borderRadius}px`;
  if (styles.borderWidth != null) css.borderWidth = `${styles.borderWidth}px`;
  if (styles.borderColor) css.borderColor = styles.borderColor;
  if (styles.borderStyle) css.borderStyle = styles.borderStyle;

  if (styles.fontSize != null) css.fontSize = `${styles.fontSize}px`;
  if (styles.fontWeight != null) css.fontWeight = styles.fontWeight;
  if (styles.color) css.color = styles.color;
  if (styles.textAlign) css.textAlign = styles.textAlign;
  if (styles.lineHeight != null) css.lineHeight = styles.lineHeight;
  if (styles.letterSpacing != null) css.letterSpacing = `${styles.letterSpacing}px`;

  if (styles.opacity != null) css.opacity = styles.opacity;
  if (styles.boxShadow) css.boxShadow = styles.boxShadow;
  if (styles.overflow) css.overflow = styles.overflow;

  return css;
}
