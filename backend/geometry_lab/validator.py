from backend.geometry_lab.models import CanonicalPartGeometry, Placement, ValidationResult
from backend.geometry_lab.kernel import GeometryKernel
from typing import List
import math

class PlacementValidator:
    def __init__(self, sheet_width: float, sheet_height: float, clearance: float = 0.0):
        self.sheet_width = sheet_width
        self.sheet_height = sheet_height
        self.clearance = clearance
        self.sheet_poly = GeometryKernel.create_polygon(
            [(0, 0), (sheet_width, 0), (sheet_width, sheet_height), (0, sheet_height)]
        )

    def validate(self, placements: List[Placement], parts: List[CanonicalPartGeometry]) -> ValidationResult:
        warnings = []
        overlap_count = 0
        out_of_bounds_count = 0
        clearance_violations = 0
        invalid_geometry_count = 0
        finite_coordinates = True
        
        part_dict = {p.id: p for p in parts}
        placed_polygons = []
        
        # Check coordinates and valid geometry
        for pl in placements:
            if not math.isfinite(pl.x) or not math.isfinite(pl.y) or not math.isfinite(pl.rotation):
                finite_coordinates = False
                warnings.append(f"Part {pl.part_id} has non-finite coordinates.")
                
            part = part_dict.get(pl.part_id)
            if not part:
                warnings.append(f"Part {pl.part_id} not found in requested parts.")
                continue
                
            poly = GeometryKernel.create_polygon(part.outer, part.holes)
            if not GeometryKernel.is_valid(poly):
                invalid_geometry_count += 1
                warnings.append(f"Part {pl.part_id} has invalid base geometry.")
                continue
                
            poly = GeometryKernel.rotate(poly, pl.rotation, origin=(0, 0))
            poly = GeometryKernel.translate(poly, pl.x, pl.y)
            placed_polygons.append((pl.part_id, poly))

        # Check containment
        for pid, poly in placed_polygons:
            # We use an epsilon buffer to handle floating point touches
            if not self.sheet_poly.buffer(1e-5).contains(poly):
                out_of_bounds_count += 1
                warnings.append(f"Part {pid} is out of bounds.")

        # Check overlaps and clearance
        n = len(placed_polygons)
        for i in range(n):
            pid1, p1 = placed_polygons[i]
            for j in range(i+1, n):
                pid2, p2 = placed_polygons[j]
                
                dist = p1.distance(p2)
                if self.clearance == 0.0:
                    # Tolerance for overlap checking
                    intersection = p1.intersection(p2)
                    if intersection.area > 1e-4:
                        overlap_count += 1
                        warnings.append(f"Overlap {pid1} and {pid2} (Area: {intersection.area})")
                else:
                    if dist < self.clearance - 1e-4:
                        clearance_violations += 1
                        warnings.append(f"Clearance violation: {pid1} and {pid2} (Dist: {dist})")
                        if dist < 1e-4:
                            overlap_count += 1

        requested_parts = len(parts)
        placed_parts = len(placements)
        missing_parts = requested_parts - placed_parts
        
        geometry_valid = (
            finite_coordinates and 
            invalid_geometry_count == 0 and 
            out_of_bounds_count == 0 and 
            overlap_count == 0 and 
            clearance_violations == 0
        )
        complete = geometry_valid and missing_parts == 0

        return ValidationResult(
            geometry_valid=geometry_valid,
            complete=complete,
            requested_parts=requested_parts,
            placed_parts=placed_parts,
            missing_parts=missing_parts,
            overlap_count=overlap_count,
            out_of_bounds_count=out_of_bounds_count,
            clearance_violations=clearance_violations,
            invalid_geometry_count=invalid_geometry_count,
            finite_coordinates=finite_coordinates,
            warnings=warnings
        )
