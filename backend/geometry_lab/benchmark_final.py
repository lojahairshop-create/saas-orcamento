import time
import math
from backend.geometry_lab.test_lab import create_rect, create_triangle, create_l_shape, create_half_moon
from backend.geometry_lab.strategy_b import StrategyBNfp
from backend.geometry_lab.validator import PlacementValidator
from backend.geometry_lab.models import Placement

# Patch StrategyBNfp to record cache stats and timeout handling
class InstrumentedStrategyB(StrategyBNfp):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cache_hits = 0
        self.cache_misses = 0
        self.nfp_time = 0
        self.placement_time = 0
        self.nfp_cache = {}

    def execute(self, parts, rotations=[0.0], timeout_budget=None):
        placements = []
        placed_polys = []
        start_global = time.time()

        for part in parts:
            if timeout_budget and (time.time() - start_global) > timeout_budget:
                print("TIMEOUT REACHED")
                break
                
            best_placement = None
            best_score = float('inf')
            
            p_start = time.time()
            for angle in rotations:
                from backend.geometry_lab.kernel import GeometryKernel
                base_poly = GeometryKernel.create_polygon(part.outer, part.holes)
                base_poly = GeometryKernel.rotate(base_poly, angle, origin=(0,0))
                
                min_x, min_y, max_x, max_y = base_poly.bounds
                sv_min_x = -min_x + self.clearance
                sv_min_y = -min_y + self.clearance
                sv_max_x = self.sheet_width - max_x - self.clearance
                sv_max_y = self.sheet_height - max_y - self.clearance
                
                if sv_max_x < sv_min_x or sv_max_y < sv_min_y:
                    continue
                    
                valid_region = GeometryKernel.create_polygon([
                    (sv_min_x, sv_min_y), (sv_max_x, sv_min_y), 
                    (sv_max_x, sv_max_y), (sv_min_x, sv_max_y)
                ])
                
                nfps = []
                n_start = time.time()
                for pid, placed_p in placed_polys:
                    if self.clearance > 0:
                        placed_p = GeometryKernel.offset(placed_p, self.clearance)
                    
                    
                    # Create geometry hashes for cache
                    fixed_hash = hash(tuple(placed_p.exterior.coords))
                    moving_hash = hash(tuple(base_poly.exterior.coords))
                    cache_key = (fixed_hash, moving_hash, angle, self.clearance)

                    if cache_key not in self.nfp_cache:
                        from backend.geometry_lab.nfp_real import RealNfpProvider
                        self.nfp_cache[cache_key] = RealNfpProvider.generate_nfp(placed_p, base_poly)
                        self.cache_misses += 1
                    else:
                        self.cache_hits += 1
                        
                    nfps.append(self.nfp_cache[cache_key])
                self.nfp_time += (time.time() - n_start)
                
                if nfps:
                    from shapely.ops import unary_union
                    forbidden = unary_union(nfps)
                    valid_region = valid_region.difference(forbidden)
                
                if valid_region.is_empty:
                    continue
                    
                candidates = []
                if valid_region.geom_type == 'Polygon':
                    candidates.extend(list(valid_region.exterior.coords))
                elif valid_region.geom_type == 'MultiPolygon':
                    for p in valid_region.geoms:
                        candidates.extend(list(p.exterior.coords))
                        
                for cx, cy in candidates:
                    score = cy * 1000 + cx
                    if score < best_score:
                        best_score = score
                        best_placement = Placement(part_id=part.id, x=cx, y=cy, rotation=angle)
                        best_poly = GeometryKernel.translate(base_poly, cx, cy)

            if best_placement:
                placements.append(best_placement)
                placed_polys.append((part.id, best_poly))
            
            self.placement_time += (time.time() - p_start)

        return placements

def print_stats(name, parts, sB, placements, t_total, val_res, sheet_area):
    placed_area = sum([p.area for p in parts if any(pl.part_id == p.id for pl in placements)])
    utilization = (placed_area / sheet_area) * 100 if sheet_area else 0
    total_cache = sB.cache_hits + sB.cache_misses
    hit_ratio = (sB.cache_hits / total_cache * 100) if total_cache > 0 else 0.0
    
    print(f"=== {name} ===")
    print(f"Total Time: {t_total:.4f}s")
    print(f"NFP Time: {sB.nfp_time:.4f}s")
    print(f"Placement Time: {sB.placement_time:.4f}s")
    print(f"Placed: {val_res.placed_parts}/{val_res.requested_parts} (Complete: {val_res.complete})")
    print(f"Utilization: {utilization:.2f}%")
    print(f"Cache Hits: {sB.cache_hits} | Misses: {sB.cache_misses} | Ratio: {hit_ratio:.2f}%")
    print(f"Validator: Geometry Valid = {val_res.geometry_valid}")
    print()

def run_benchmarks():
    print("--- REAL BENCHMARKS ---")
    datasets = [
        ("10 Rects", [create_rect(f'P{i}', 20, 20) for i in range(10)], 200, 200),
        ("50 Rects", [create_rect(f'P{i}', 20, 20) for i in range(50)], 200, 200),
        ("100 Rects", [create_rect(f'P{i}', 10, 10) for i in range(100)], 200, 200),
        ("300 Rects", [create_rect(f'P{i}', 5, 5) for i in range(300)], 200, 200),
    ]
    
    for name, parts, w, h in datasets:
        sB = InstrumentedStrategyB(w, h, clearance=0.0)
        start = time.time()
        placements = sB.execute(parts, timeout_budget=30.0) # limit to 30s so it doesn't hang forever
        t_total = time.time() - start
        
        validator = PlacementValidator(w, h, clearance=0.0)
        v_res = validator.validate(placements, parts)
        print_stats(name, parts, sB, placements, t_total, v_res, w*h)

if __name__ == '__main__':
    run_benchmarks()
