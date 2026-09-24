export type Polygon = {
  id: string;
  points: number[]; // flat array of coordinates [x1, y1, x2, y2, ...]
  holes?: number[][]; // array of flat arrays for holes
  closed: true; // Obrigatorio true para uso com linhas
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Placement = {
  partId: string;
  x: number;
  y: number;
  rotation: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
};

export interface NestingEngine {
  calculate(parts: Polygon[], sheet: SheetConfig): Placement[];
}

export type SheetConfig = {
  width: number;
  height: number;
  thickness: number;
  kerf: number;
  material: string;
  grainDirection?: number; // angulo em graus, se existir
  utilization: number; // percentual 0 a 100
};

export type PartConfig = {
  id: string;
  name: string;
  quantity: number;
  polygon: Polygon;
  boundingBox: BoundingBox;
  x: number;
  y: number;
  rotation: number;
  mirrorX: boolean;
  mirrorY: boolean;
  selected: boolean;
  locked: boolean;
  color: string;
  sourceDxfId: string;
  material: string;
  thickness: number;
  area: number;
  weight: number;
};

export type Vector2D = {
  x: number;
  y: number;
};
