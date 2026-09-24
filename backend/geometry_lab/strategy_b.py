from backend.geometry_lab.models import CanonicalPartGeometry, Placement
from backend.geometry_lab.kernel import GeometryKernel
from backend.geometry_lab.nfp_real import RealNfpProvider
from shapely.geometry import Point
from shapely.ops import unary_union
from typing import List
import time

class StrategyBNfp:
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

        # We can cache the NFP if we have repeated parts!
        # nfp_cache[(id_fixed, id_moving, angle)] = NFP_Polygon
        nfp_cache = {}

        for part in parts:
            best_placement = None
            best_score = float('inf')
            best_poly = None

            for angle in rotations:
                base_poly = GeometryKernel.create_polygon(part.outer, part.holes)
                base_poly = GeometryKernel.rotate(base_poly, angle, origin=(0,0))
                
                # 1. Calculate Inner-Fit Polygon (IFP) with the sheet
                # If we offset the sheet inwards by the moving poly, we get the valid region.
                # However, a simpler IFP for a rectangular sheet is just the sheet bounds 
                # reduced by the bounding box of the moving poly.
                # If part has clearance, we also shrink sheet by clearance.
                min_x, min_y, max_x, max_y = base_poly.bounds
                w = max_x - min_x
                h = max_y - min_y
                
                # Sheet valid region
                sv_min_x = -min_x + self.clearance
                sv_min_y = -min_y + self.clearance
                sv_max_x = self.sheet_width - max_x - self.clearance
                sv_max_y = self.sheet_height - max_y - self.clearance
                
                if sv_max_x < sv_min_x or sv_max_y < sv_min_y:
                    continue # Part doesn't fit in sheet at all
                    
                valid_region = GeometryKernel.create_polygon([
                    (sv_min_x, sv_min_y), (sv_max_x, sv_min_y), 
                    (sv_max_x, sv_max_y), (sv_min_x, sv_max_y)
                ])
                
                # 2. Calculate NFP against all placed parts
                nfps = []
                for pid, placed_p in placed_polys:
                    # Apply clearance: we can just buffer the placed polygon by clearance before NFP!
                    if self.clearance > 0:
                        placed_p = GeometryKernel.offset(placed_p, self.clearance)
                    
                    # Generate or fetch NFP
                    cache_key = (pid, part.id, angle, self.clearance)
                    if cache_key not in nfp_cache:
                        nfp_cache[cache_key] = RealNfpProvider.generate_nfp(placed_p, base_poly)
                        
                    nfps.append(nfp_cache[cache_key])
                    
                # 3. Subtract NFPs from valid region
                if nfps:
                    forbidden = unary_union(nfps)
                    valid_region = valid_region.difference(forbidden)
                
                if valid_region.is_empty:
                    continue
                    
                # 4. Find the best placement point (lowest Y, then lowest X)
                # The valid region could be a MultiPolygon. We just look at all its coordinates.
                candidates = []
                if valid_region.geom_type == 'Polygon':
                    candidates.extend(list(valid_region.exterior.coords))
                elif valid_region.geom_type == 'MultiPolygon':
                    for p in valid_region.geoms:
                        candidates.extend(list(p.exterior.coords))
                elif valid_region.geom_type == 'GeometryCollection':
                    for geom in valid_region.geoms:
                        if geom.geom_type in ('Polygon', 'LineString'):
                            candidates.extend(list(geom.coords))
                        
                for cx, cy in candidates:
                    score = cy * 1000 + cx
                    if score < best_score:
                        best_score = score
                        best_placement = Placement(part_id=part.id, x=cx, y=cy, rotation=angle)
                        best_poly = GeometryKernel.translate(base_poly, cx, cy)

            if best_placement:
                placements.append(best_placement)
                placed_polys.append((part.id, best_poly))

        return placements
