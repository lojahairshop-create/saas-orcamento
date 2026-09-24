from backend.geometry_lab.models import CanonicalPartGeometry, Placement
from backend.geometry_lab.kernel import GeometryKernel
from backend.geometry_lab.nfp import NfpProvider
from shapely.strtree import STRtree
from typing import List

class StrategyAOptimized:
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

        # Cache prepared rotated bases
        rotated_bases = {}
        for part in parts:
            if part.id not in rotated_bases:
                rotated_bases[part.id] = {}
                base_poly = GeometryKernel.create_polygon(part.outer, part.holes)
                for angle in rotations:
                    rotated_bases[part.id][angle] = GeometryKernel.rotate(base_poly, angle, origin=(0,0))

        for part in parts:
            best_placement = None
            best_score = float('inf')
            best_poly = None
            
            # Rebuild STRTree per piece. For 100 pieces, rebuilding tree 100 times is negligible.
            tree = STRtree(placed_polys) if placed_polys else None

            for angle in rotations:
                base_poly = rotated_bases[part.id][angle]
                
                # 2. Generate candidates
                candidates = set()
                inner_cands = NfpProvider.generate_inner_candidates(self.sheet_poly, base_poly)
                candidates.update(inner_cands)
                
                for placed_p in placed_polys:
                    cands = NfpProvider.generate_candidates(placed_p, base_poly)
                    candidates.update(cands)
                
                # Filter candidates by sheet bounds quickly using AABB
                min_x, min_y, max_x, max_y = base_poly.bounds
                
                valid_candidates = []
                for cx, cy in candidates:
                    if cx + min_x < 0 or cy + min_y < 0 or cx + max_x > self.sheet_width or cy + max_y > self.sheet_height:
                        continue
                    valid_candidates.append((cx, cy))

                # 3. Test candidates
                for cx, cy in valid_candidates:
                    test_poly = GeometryKernel.translate(base_poly, cx, cy)
                    
                    if not GeometryKernel.contains(self.sheet_poly, test_poly):
                        continue
                        
                    valid = True
                    if tree is not None:
                        # Spatial query! Expand bounds by clearance
                        query_geom = test_poly
                        if self.clearance > 0:
                            query_geom = GeometryKernel.offset(test_poly, self.clearance)
                            
                        # Query tree for intersecting AABBs
                        possible_matches_idx = tree.query(query_geom)
                        for idx in possible_matches_idx:
                            placed_p = placed_polys[idx]
                            
                            dist = placed_p.distance(test_poly)
                            if dist < self.clearance - 1e-4:
                                valid = False
                                break
                            if self.clearance == 0.0 and GeometryKernel.overlaps(placed_p, test_poly):
                                valid = False
                                break
                    
                    if valid:
                        score = cy * 1000 + cx
                        if score < best_score:
                            best_score = score
                            best_placement = Placement(
                                part_id=part.id, x=cx, y=cy, rotation=angle
                            )
                            best_poly = test_poly

            if best_placement:
                placements.append(best_placement)
                placed_polys.append(best_poly)
            else:
                pass

        return placements
