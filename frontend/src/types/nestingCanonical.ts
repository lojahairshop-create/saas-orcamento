export interface CanonicalNestingDocument {
  sheets: CanonicalNestingSheet[];
}

export interface CanonicalNestingSheet {
  id: string;
  width: number;
  height: number;
  utilization?: number;
  sourceType?: string;
  material?: string;
  thickness?: number;
  placements: CanonicalNestingPlacement[];
}

export interface CanonicalNestingPlacement {
  id: string;
  sourceItemIndex?: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  engineRotated?: boolean;
  polygon?: {
    id?: string;
    points: number[];
    closed: boolean;
  };
  material?: string;
  thickness?: number;
}
