import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Copy,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
    <div className="flex flex-col overflow-hidden">
      {/* Canvas toolbar */}
      <div className="flex items-center gap-1 px-2 py-[3px] border-b border-border bg-card shrink-0">
        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-0.5 min-w-0 overflow-hidden">
          {breadcrumb.length > 0 ? (
            breadcrumb.map((crumb, i) => (
              <div key={crumb.id} className="flex items-center gap-0.5">
                {i > 0 && <span className="text-[10px] text-muted-foreground">/</span>}
                <button
                  onClick={() => onSelect(crumb.id)}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                    crumb.id === selectedId
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Click an element to select it
            </span>
          )}
        </div>

        {/* Device toggle */}
        <ToggleGroup
          value={[device]}
          className="h-6"
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <ToggleGroupItem
                  value="desktop"
                  onClick={() => setDevice('desktop')}
                  className="h-6 px-1"
                />
              }
            >
              <Monitor className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Desktop (1440px)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <ToggleGroupItem
                  value="tablet"
                  onClick={() => setDevice('tablet')}
                  className="h-6 px-1"
                />
              }
            >
              <Tablet className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Tablet (768px)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <ToggleGroupItem
                  value="mobile"
                  onClick={() => setDevice('mobile')}
                  className="h-6 px-1"
                />
              }
            >
              <Smartphone className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Mobile (375px)</TooltipContent>
          </Tooltip>
        </ToggleGroup>

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-xs" onClick={() => setZoom(Math.max(25, zoom - 25))} disabled={zoom <= 25}>
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-[10px] font-mono min-w-[32px] text-center text-muted-foreground">
            {zoom}%
          </span>
          <Button variant="ghost" size="icon-xs" onClick={() => setZoom(Math.min(200, zoom + 25))} disabled={zoom >= 200}>
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 overflow-auto flex justify-center py-4"
        style={{
          backgroundColor: '#0e0e10',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          onClick={handleCanvasClick}
          style={{
            width: canvasWidth,
            minHeight: 600,
            maxWidth: '100%',
            backgroundColor: config.theme.backgroundColor,
            color: config.theme.textColor,
            fontFamily: config.theme.fontFamily,
            boxShadow: '0 8px 60px rgba(0,0,0,0.5)',
            borderRadius: 6,
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
        </div>
      </div>
    </div>
  );
}

// ── Empty state ──

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8" style={{ minHeight: 500 }}>
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 80,
          height: 80,
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '2px dashed rgba(255,255,255,0.1)',
        }}
      >
        <Plus className="size-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Start building your page
        </p>
        <p className="text-xs max-w-[280px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Drag elements from the left panel or click the + buttons to add containers, text, images, and more
        </p>
      </div>
      <div className="flex gap-1 mt-1">
        {['Container', 'Text', 'Image'].map((label) => (
          <span
            key={label}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
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
    <div
      ref={boxRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...cssStyles,
        outline: outlineStyle,
        outlineOffset: isSelected ? -1 : 0,
        position: 'relative',
        cursor: 'default',
        transition: resizing ? 'none' : 'outline 0.15s',
        // Drop zone background pulse
        ...(isDropOver ? {
          backgroundColor: el.styles.backgroundColor
            ? el.styles.backgroundColor
            : 'rgba(59,130,246,0.04)',
        } : {}),
      }}
    >
      {/* Drop overlay */}
      {isDropOver && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundColor: 'rgba(59,130,246,0.06)',
            borderRadius: 'inherit',
          }}
        />
      )}

      {/* Element label tag */}
      {(isSelected || isHovered) && (
        <div
          className="absolute flex items-center z-[1000] pointer-events-none"
          style={{ top: -20, left: -1, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <span
            className="text-[9px] font-semibold text-white px-[3px] py-[1px] whitespace-nowrap"
            style={{
              backgroundColor: isSelected ? accentColor : `${accentColor}99`,
              borderRadius: '4px 4px 0 0',
              lineHeight: 1.4,
            }}
          >
            {el.name || el.type}
          </span>
          {/* Resize dimensions */}
          {resizing && resizeSize && (
            <span
              className="text-[9px] font-medium font-mono text-white px-[3px] py-[1px] whitespace-nowrap"
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '0 4px 0 0',
                lineHeight: 1.4,
              }}
            >
              {resizeSize.w} × {resizeSize.h}
            </span>
          )}
        </div>
      )}

      {/* Quick action toolbar (floating) */}
      {isSelected && !resizing && (
        <div
          className="absolute flex z-[1001]"
          style={{ top: -20, right: -1, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {[
            { icon: <ArrowUpToLine className="size-3" />, tip: 'Move up (Ctrl+Up)', action: () => onMoveElement(elementId, -1) },
            { icon: <ArrowDownToLine className="size-3" />, tip: 'Move down (Ctrl+Down)', action: () => onMoveElement(elementId, 1) },
            { icon: <Copy className="size-[11px]" />, tip: 'Duplicate (Ctrl+D)', action: () => onDuplicate(elementId) },
            { icon: <Trash2 className="size-3" />, tip: 'Delete', action: () => onDelete(elementId), color: '#ef4444' },
          ].map(({ icon, tip, action, color }, i) => (
            <Tooltip key={i}>
              <TooltipTrigger
                render={
                  <button
                    onClick={(e) => { e.stopPropagation(); action(); }}
                    className="flex items-center justify-center text-white"
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: accentColor,
                      borderRadius: i === 0 ? '4px 0 0 0' : i === 3 ? '0 4px 0 0' : 0,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = color || '#2563eb'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = accentColor; }}
                  />
                }
              >
                {icon}
              </TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Resize handles */}
      {isSelected && (
        <>
          {/* Right */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, 'right')}
            className="absolute z-[200] flex items-center justify-center"
            style={{
              top: '50%',
              right: -4,
              width: 8,
              height: 32,
              transform: 'translateY(-50%)',
              cursor: 'ew-resize',
            }}
          >
            <div
              className="rounded-full transition-all"
              style={{ width: 3, height: 16, backgroundColor: accentColor, opacity: 0.8 }}
            />
          </div>
          {/* Bottom */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, 'bottom')}
            className="absolute z-[200] flex items-center justify-center"
            style={{
              bottom: -4,
              left: '50%',
              width: 32,
              height: 8,
              transform: 'translateX(-50%)',
              cursor: 'ns-resize',
            }}
          >
            <div
              className="rounded-full transition-all"
              style={{ width: 16, height: 3, backgroundColor: accentColor, opacity: 0.8 }}
            />
          </div>
          {/* Corner */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, 'bottom-right')}
            className="absolute z-[201] rounded-full transition-transform hover:scale-130"
            style={{
              bottom: -5,
              right: -5,
              width: 10,
              height: 10,
              cursor: 'nwse-resize',
              backgroundColor: '#fff',
              border: `2px solid ${accentColor}`,
            }}
          />
        </>
      )}

      {/* Padding visualization (when selected) */}
      {isSelected && hasPadding(el.styles) && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            borderTop: el.styles.paddingTop ? `${el.styles.paddingTop}px solid rgba(59,130,246,0.06)` : 'none',
            borderRight: el.styles.paddingRight ? `${el.styles.paddingRight}px solid rgba(59,130,246,0.06)` : 'none',
            borderBottom: el.styles.paddingBottom ? `${el.styles.paddingBottom}px solid rgba(59,130,246,0.06)` : 'none',
            borderLeft: el.styles.paddingLeft ? `${el.styles.paddingLeft}px solid rgba(59,130,246,0.06)` : 'none',
          }}
        />
      )}

      {/* Element content */}
      {el.type === 'text' && (
        <div
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => onUpdateContent(elementId, e.currentTarget.textContent || '')}
          className="outline-none min-h-[1em] whitespace-pre-wrap relative z-[1]"
          style={{ cursor: isSelected ? 'text' : 'default' }}
        >
          {el.content || 'Add text...'}
        </div>
      )}

      {el.type === 'image' && (
        el.content ? (
          <img
            src={el.content}
            className="block w-full relative z-[1]"
            style={{ height: el.styles.height || 'auto', objectFit: 'cover' }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 min-h-[140px] rounded" style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.08)',
          }}>
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <span className="text-base opacity-20">&#x1f5bc;</span>
            </div>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Set image URL in panel →</span>
          </div>
        )
      )}

      {el.type === 'button' && (
        <div
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => onUpdateContent(elementId, e.currentTarget.textContent || '')}
          className="inline-flex items-center justify-center outline-none relative z-[1]"
          style={{ cursor: isSelected ? 'text' : 'pointer' }}
        >
          {el.content || 'Button'}
        </div>
      )}

      {el.type === 'divider' && null}
      {el.type === 'spacer' && (
        isSelected ? (
          <div className="flex items-center justify-center h-full min-h-[20px]">
            <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
              spacer {el.styles.height || '40px'}
            </span>
          </div>
        ) : null
      )}

      {/* Container children */}
      {el.type === 'container' && (
        <>
          {el.children.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center min-h-[80px] gap-0.5 rounded transition-all relative z-[1]"
              style={{
                border: isDropOver ? '2px dashed rgba(59,130,246,0.4)' : '1px dashed rgba(255,255,255,0.08)',
                backgroundColor: isDropOver ? 'rgba(59,130,246,0.04)' : 'transparent',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <Plus className="size-[18px]" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                Drop elements here
              </span>
            </div>
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
    </div>
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
