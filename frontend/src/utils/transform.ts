import { Vector2D } from '../types/nesting';

export function rotatePoint(point: Vector2D, angleDeg: number, origin: Vector2D = { x: 0, y: 0 }): Vector2D {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  const nx = (cos * (point.x - origin.x)) - (sin * (point.y - origin.y)) + origin.x;
  const ny = (sin * (point.x - origin.x)) + (cos * (point.y - origin.y)) + origin.y;
  
  return { x: nx, y: ny };
}
