import { useRef, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SiteSection, CanvasItemLayout } from '../../types/siteConfig';
import { SECTION_REGISTRY, DEFAULT_CANVAS_LAYOUT } from '../../types/siteConfig';
import { MIN_SIZE, snapToGrid } from './canvasUtils';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface CanvasItemProps {
  section: SiteSection;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onLayoutChange: (layout: Partial<CanvasItemLayout>) => void;
  content?: React.ReactNode;
}

export default function CanvasItem({ section, scale, selected, onSelect, onLayoutChange, content }: CanvasItemProps) {
  const layout = section.canvas || DEFAULT_CANVAS_LAYOUT;
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ handle: ResizeHandle; startX: number; startY: number; orig: CanvasItemLayout } | null>(null);

  // ── Drag ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (layout.locked) return;
    if ((e.target as HTMLElement).dataset.resize) return;
    e.stopPropagation();
    onSelect();

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: layout.x,
      origY: layout.y,
    };

    const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / scale;
      const dy = (ev.clientY - dragRef.current.startY) / scale;
      onLayoutChange({
        x: snapToGrid(Math.max(0, dragRef.current.origX + dx)),
        y: snapToGrid(Math.max(0, dragRef.current.origY + dy)),
      });
    };

    const handleUp = () => {
      dragRef.current = null;
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerup', handleUp);
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerup', handleUp);
  }, [layout, scale, onSelect, onLayoutChange]);

  // ── Resize ──
  const handleResizeDown = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    if (layout.locked) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    resizeRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...layout },
    };

    const handleMove = (ev: PointerEvent) => {
      if (!resizeRef.current) return;
      const { handle: h, startX, startY, orig } = resizeRef.current;
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;

      let { x, y, width, height } = orig;

      if (h.includes('e')) width = snapToGrid(Math.max(MIN_SIZE, orig.width + dx));
      if (h.includes('w')) { width = snapToGrid(Math.max(MIN_SIZE, orig.width - dx)); x = orig.x + orig.width - width; }
      if (h.includes('s')) height = snapToGrid(Math.max(MIN_SIZE, orig.height + dy));
      if (h.includes('n')) { height = snapToGrid(Math.max(MIN_SIZE, orig.height - dy)); y = orig.y + orig.height - height; }

      onLayoutChange({ x: snapToGrid(Math.max(0, x)), y: snapToGrid(Math.max(0, y)), width, height });
    };

    const handleUp = () => {
      resizeRef.current = null;
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerup', handleUp);
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerup', handleUp);
  }, [layout, scale, onSelect, onLayoutChange]);

  const reg = SECTION_REGISTRY[section.type];
  const handleSize = 8;

  const handlePositions: Record<ResizeHandle, { top?: number | string; left?: number | string; right?: number | string; bottom?: number | string; cursor: string }> = {
    nw: { top: -handleSize / 2, left: -handleSize / 2, cursor: 'nw-resize' },
    n:  { top: -handleSize / 2, left: '50%', cursor: 'n-resize' },
    ne: { top: -handleSize / 2, right: -handleSize / 2, cursor: 'ne-resize' },
    e:  { top: '50%', right: -handleSize / 2, cursor: 'e-resize' },
    se: { bottom: -handleSize / 2, right: -handleSize / 2, cursor: 'se-resize' },
    s:  { bottom: -handleSize / 2, left: '50%', cursor: 's-resize' },
    sw: { bottom: -handleSize / 2, left: -handleSize / 2, cursor: 'sw-resize' },
    w:  { top: '50%', left: -handleSize / 2, cursor: 'w-resize' },
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        zIndex: layout.zIndex,
        cursor: layout.locked ? 'default' : 'move',
        outline: selected ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
        outlineOffset: -1,
        borderRadius: 4,
        overflow: 'hidden',
        transition: selected ? 'none' : 'outline-color 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(255,255,255,0.25)';
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(255,255,255,0.1)';
      }}
    >
      {/* Content or placeholder */}
      {content || (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <Badge variant="secondary" className="text-[10px] h-5">{reg.label}</Badge>
          <span className="text-[9px] text-muted-foreground">
            {Math.round(layout.width)} × {Math.round(layout.height)}
          </span>
        </div>
      )}

      {/* Lock indicator */}
      {layout.locked && (
        <div className="absolute top-1 right-1 text-muted-foreground">
          <Lock className="size-3" />
        </div>
      )}

      {/* Resize handles */}
      {selected && !layout.locked && (
        Object.entries(handlePositions).map(([handle, pos]) => (
          <div
            key={handle}
            data-resize="true"
            onPointerDown={(e) => handleResizeDown(e, handle as ResizeHandle)}
            style={{
              position: 'absolute',
              width: handleSize,
              height: handleSize,
              backgroundColor: 'var(--color-primary)',
              border: '1px solid white',
              borderRadius: '50%',
              transform: pos.left === '50%' || pos.top === '50%' ? 'translate(-50%, -50%)' : undefined,
              ...pos,
              zIndex: 10,
            }}
          />
        ))
      )}
    </div>
  );
}
