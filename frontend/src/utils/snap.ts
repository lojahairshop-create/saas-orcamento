import { Vector2D, PartConfig } from '../types/nesting';

export function calculateSnap(
  position: Vector2D,
  parts: PartConfig[],
  currentPartId: string,
  gridSize: number,
  snapEnabled: boolean
): Vector2D {
  if (!snapEnabled) return position;

  // Simple grid snapping for now
  const snappedX = Math.round(position.x / gridSize) * gridSize;
  const snappedY = Math.round(position.y / gridSize) * gridSize;

  return { x: snappedX, y: snappedY };
}
