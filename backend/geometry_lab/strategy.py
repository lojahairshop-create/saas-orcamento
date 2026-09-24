from backend.geometry_lab.models import CanonicalPartGeometry, Placement
from backend.geometry_lab.kernel import GeometryKernel
from backend.geometry_lab.nfp import NfpProvider
from typing import List
import math

class PlacementStrategy:
    def __init__(self, sheet_width: float, sheet_height: float, clearance: float = 0.0):
        self.sheet_width = sheet_width
        self.sheet_height = sheet_height
        self.clearance = clearance
        self.sheet_poly = GeometryKernel.create_polygon(
            [(0, 0), (sheet_width, 0), (sheet_width, sheet_height), (0, sheet_height)]
        )

    def execute(self, parts: List[CanonicalPartGeometry], rotations: List[float] = [0.0]) -> List[Placement]:
        placements = []
        placed_polys = []

        # Simple greedy approach
        for part in parts:
            best_placement = None
            best_score = float('inf')
            best_poly = None

            # Try requested rotations
            for angle in rotations:
                # 1. Base polygon for this rotation
                base_poly = GeometryKernel.create_polygon(part.outer, part.holes)
                base_poly = GeometryKernel.rotate(base_poly, angle, origin=(0,0))
                
                # 2. Generate candidates
                candidates = set()
                # Inner fit with sheet
                inner_cands = NfpProvider.generate_inner_candidates(self.sheet_poly, base_poly)
                candidates.update(inner_cands)
                
                # Outer fit with already placed parts
                for _, placed_p in placed_polys:
                    cands = NfpProvider.generate_candidates(placed_p, base_poly)
                    candidates.update(cands)
                
                # Also add a regular grid as fallback to ensure we find a spot if vertices don't match perfectly
                for gx in range(0, int(self.sheet_width), 100):
                    for gy in range(0, int(self.sheet_height), 100):
                        candidates.add((gx, gy))

                # 3. Test candidates
                for cx, cy in candidates:
                    # Quick bounds check
                    min_x, min_y, max_x, max_y = base_poly.bounds
                    if cx + min_x < 0 or cy + min_y < 0 or cx + max_x > self.sheet_width or cy + max_y > self.sheet_height:
                        continue
                        
                    test_poly = GeometryKernel.translate(base_poly, cx, cy)
                    
                    # Validate containment in sheet (strict)
                    if not GeometryKernel.contains(self.sheet_poly, test_poly):
                        continue
                        
                    # Validate collisions with placed parts
                    valid = True
                    for _, placed_p in placed_polys:
                        dist = placed_p.distance(test_poly)
                        if dist < self.clearance - 1e-4:
                            valid = False
                            break
                        if self.clearance == 0.0 and GeometryKernel.overlaps(placed_p, test_poly):
                            valid = False
                            break
                            
                    if valid:
                        # 4. Score candidate (Bottom-Left heuristic: minimize Y, then X)
                        # We use the bounds max_y or min_y. Let's use max_y to pack tightly to the bottom (assuming Y grows down, 0 is top. If 0 is bottom, minimize max_y)
                        # Assuming Y grows down, top-left is 0,0. 
                        score = cy * 1000 + cx
                        if score < best_score:
                            best_score = score
                            best_placement = Placement(
                                part_id=part.id,
                                x=cx,
                                y=cy,
                                rotation=angle
                            )
                            best_poly = test_poly

            if best_placement:
                placements.append(best_placement)
                placed_polys.append((part.id, best_poly))
            else:
                print(f"Could not place part {part.id}")

        return placements
