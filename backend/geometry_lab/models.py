from typing import List, Tuple, Dict, Any, Optional
from pydantic import BaseModel

class CanonicalPartGeometry(BaseModel):
    id: str
    outer: List[Tuple[float, float]]
    holes: List[List[Tuple[float, float]]]
    bounds: Tuple[float, float, float, float]
    area: float
    geometry_tolerance: float
    source_metadata: Dict[str, Any]

class Placement(BaseModel):
    part_id: str
    x: float
    y: float
    rotation: float
    mirror_x: bool = False
    mirror_y: bool = False

class ValidationResult(BaseModel):
    geometry_valid: bool
    complete: bool
    requested_parts: int
    placed_parts: int
    missing_parts: int
    overlap_count: int
    out_of_bounds_count: int
    clearance_violations: int
    invalid_geometry_count: int
    finite_coordinates: bool
    warnings: List[str]

class NestingResult(BaseModel):
    status: str  # SUCCESS, INCOMPLETE_RESULT, INVALID_GEOMETRY, INVALID_RESULT, TIMEOUT, ENGINE_ERROR
    placements: List[Placement]
    utilization: float
    duration_ms: float
    warnings: List[str]
    diagnostics: Dict[str, Any]
