import { useRef, useState, useCallback, useLayoutEffect } from 'react';
import { Grid2X2, Grid2X2X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteConfig, SitePage, CanvasItemLayout } from '../../types/siteConfig';
import { DEFAULT_CANVAS_SIZE } from '../../types/siteConfig';
import CanvasItem from './CanvasItem';
import { GRID_SIZE, findSnapGuides, type SnapGuide } from './canvasUtils';

interface CanvasEditorProps {
  page: SitePage;
  config: SiteConfig;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateCanvas: (sectionId: string, layout: Partial<CanvasItemLayout>) => void;
}

export default function CanvasEditor({
  page,
  config,
  selectedSectionId,
  onSelectSection,
  onUpdateCanvas,
}: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const canvasSize = page.canvasSize || DEFAULT_CANVAS_SIZE;

  // Compute scale to fit canvas in container
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const padding = 40;
      const scaleX = (width - padding * 2) / canvasSize.width;
      const scaleY = (height - padding * 2) / canvasSize.height;
      setScale(Math.min(scaleX, scaleY, 1));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [canvasSize.width, canvasSize.height]);

  const handleCanvasClick = useCallback(() => {
    onSelectSection(null);
    setSnapGuides([]);
  }, [onSelectSection]);

  const handleUpdateCanvas = useCallback((sectionId: string, layout: Partial<CanvasItemLayout>) => {
    // Compute snap guides against other items
    const section = page.sections.find((s) => s.id === sectionId);
    if (section) {
      const currentLayout = { ...(section.canvas || { x: 0, y: 0, width: 200, height: 100, zIndex: 1 }), ...layout };
      const others = page.sections
        .filter((s) => s.id !== sectionId && s.canvas)
        .map((s) => s.canvas!);
      const { guides } = findSnapGuides(currentLayout, others);
      setSnapGuides(guides);
    }
    onUpdateCanvas(sectionId, layout);
  }, [page.sections, onUpdateCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto flex items-center justify-center bg-[#1a1a1a]"
    >
      {/* Canvas viewport */}
      <div
        onClick={handleCanvasClick}
        onPointerUp={() => setSnapGuides([])}
        style={{
          position: 'relative',
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          backgroundColor: config.theme.backgroundColor,
          boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          />
        )}

        {/* Snap guides */}
        {snapGuides.map((guide, i) => (
          <div
            key={i}
            className="absolute pointer-events-none z-[999]"
            style={{
              backgroundColor: '#ef4444',
              opacity: 0.6,
              ...(guide.axis === 'x'
                ? { left: guide.position, top: 0, width: 1, height: '100%' }
                : { top: guide.position, left: 0, height: 1, width: '100%' }),
            }}
          />
        ))}

        {/* Canvas items */}
        {page.sections.map((section) => (
          <CanvasItem
            key={section.id}
            section={section}
            scale={scale}
            selected={selectedSectionId === section.id}
            onSelect={() => onSelectSection(section.id)}
            onLayoutChange={(layout) => handleUpdateCanvas(section.id, layout)}
          />
        ))}

        {/* Empty state */}
        {page.sections.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground mb-0.5">
              Empty canvas
            </p>
            <p className="text-xs text-muted-foreground">
              Add sections using + button
            </p>
          </div>
        )}
      </div>

      {/* Canvas controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setShowGrid(!showGrid)}
        >
          {showGrid ? <Grid2X2 className="size-[18px]" /> : <Grid2X2X className="size-[18px]" />}
        </Button>
      </div>

      {/* Canvas info */}
      <div className="absolute bottom-4 left-4">
        <span className="text-[10px] font-mono text-muted-foreground">
          {canvasSize.width}×{canvasSize.height} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
