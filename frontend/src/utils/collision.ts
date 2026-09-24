import { PartConfig, SheetConfig } from '../types/nesting';

export function isOutOfBounds(part: PartConfig, sheet: SheetConfig): boolean {
  // We use the bounding box. This is simplified but works for unrotated parts.
  // With rotation, we'd need to calculate transformed coordinates.
  const bboxX = part.x + part.boundingBox.x;
  const bboxY = part.y + part.boundingBox.y;
  const bboxRight = bboxX + part.boundingBox.width;
  const bboxBottom = bboxY + part.boundingBox.height;

  // Considering sheet kerf or padding if needed, but simple check is enough
  return bboxX < 0 || bboxY < 0 || bboxRight > sheet.width || bboxBottom > sheet.height;
}

export function isColliding(part: PartConfig, allParts: PartConfig[]): boolean {
  const rect1 = {
    x: part.x + part.boundingBox.x,
    y: part.y + part.boundingBox.y,
    w: part.boundingBox.width,
    h: part.boundingBox.height
  };

  for (const other of allParts) {
    if (other.id === part.id) continue;

    const rect2 = {
      x: other.x + other.boundingBox.x,
      y: other.y + other.boundingBox.y,
      w: other.boundingBox.width,
      h: other.boundingBox.height
    };

    if (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    ) {
      return true; // Colliding
    }
  }
  return false;
}

export type CollisionStatus = 'ok' | 'out_of_sheet' | 'collision';

export function debugCollision(part: PartConfig, allParts: PartConfig[], sheet: SheetConfig): CollisionStatus {
  if (isColliding(part, allParts)) return 'collision';
  if (isOutOfBounds(part, sheet)) return 'out_of_sheet';
  return 'ok';
}

// Stubs for useSelectionBox
export function doPolygonsIntersect(p1: any, p2: any) {
  return false;
}

export function checkPolygonCollision(p1: any, p2: any) {
  return false;
}
