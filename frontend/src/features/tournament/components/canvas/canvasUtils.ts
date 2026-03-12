import type { CanvasItemLayout } from '../../types/siteConfig';

export const GRID_SIZE = 20;
export const SNAP_THRESHOLD = 8;
export const MIN_SIZE = 50;

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;
}

/** Find snap guides by comparing edges/centers of the dragged item against other items */
export function findSnapGuides(
  dragged: CanvasItemLayout,
  others: CanvasItemLayout[],
  threshold: number = SNAP_THRESHOLD,
): { snappedX: number | null; snappedY: number | null; guides: SnapGuide[] } {
  const guides: SnapGuide[] = [];
  let snappedX: number | null = null;
  let snappedY: number | null = null;

  const dragEdges = {
    left: dragged.x,
    right: dragged.x + dragged.width,
    centerX: dragged.x + dragged.width / 2,
    top: dragged.y,
    bottom: dragged.y + dragged.height,
    centerY: dragged.y + dragged.height / 2,
  };

  for (const other of others) {
    const otherEdges = {
      left: other.x,
      right: other.x + other.width,
      centerX: other.x + other.width / 2,
      top: other.y,
      bottom: other.y + other.height,
      centerY: other.y + other.height / 2,
    };

    // X-axis snapping (left-to-left, right-to-right, left-to-right, center-to-center)
    const xPairs: [number, number, number][] = [
      [dragEdges.left, otherEdges.left, otherEdges.left],
      [dragEdges.right, otherEdges.right, otherEdges.right - dragged.width],
      [dragEdges.left, otherEdges.right, otherEdges.right],
      [dragEdges.right, otherEdges.left, otherEdges.left - dragged.width],
      [dragEdges.centerX, otherEdges.centerX, otherEdges.centerX - dragged.width / 2],
    ];

    for (const [dragVal, otherVal, snapX] of xPairs) {
      if (Math.abs(dragVal - otherVal) < threshold && snappedX === null) {
        snappedX = snapX;
        guides.push({ axis: 'x', position: otherVal });
      }
    }

    // Y-axis snapping
    const yPairs: [number, number, number][] = [
      [dragEdges.top, otherEdges.top, otherEdges.top],
      [dragEdges.bottom, otherEdges.bottom, otherEdges.bottom - dragged.height],
      [dragEdges.top, otherEdges.bottom, otherEdges.bottom],
      [dragEdges.bottom, otherEdges.top, otherEdges.top - dragged.height],
      [dragEdges.centerY, otherEdges.centerY, otherEdges.centerY - dragged.height / 2],
    ];

    for (const [dragVal, otherVal, snapY] of yPairs) {
      if (Math.abs(dragVal - otherVal) < threshold && snappedY === null) {
        snappedY = snapY;
        guides.push({ axis: 'y', position: otherVal });
      }
    }
  }

  return { snappedX, snappedY, guides };
}
