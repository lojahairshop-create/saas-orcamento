import random
import math
from shapely.geometry import Point
from backend.geometry_lab.kernel import GeometryKernel
from backend.geometry_lab.nfp_real import RealNfpProvider
from backend.geometry_lab.test_lab import create_l_shape, create_half_moon

def adversarial_nfp_oracle(seed=42):
    random.seed(seed)
    
    print("--- ADVERSARIAL BOUNDARY NFP ORACLE ---")
    hm = create_half_moon("HM")
    fixed_p = GeometryKernel.create_polygon(hm.outer)
    moving_p = GeometryKernel.create_polygon(hm.outer)
    
    nfp = RealNfpProvider.generate_nfp(fixed_p, moving_p)
    
    boundary_points = list(nfp.exterior.coords)
    
    epsilons = [-1e-4, 0.0, 1e-4]
    
    false_positives = 0
    false_negatives = 0
    total_tests = 0
    
    for bx, by in boundary_points:
        for dx in epsilons:
            for dy in epsilons:
                rx = bx + dx
                ry = by + dy
                pt = Point(rx, ry)
                
                placed_moving = GeometryKernel.translate(moving_p, rx, ry)
                
                # Check real overlap area to avoid epsilon edge cases where overlap is microscopic
                intersection = fixed_p.intersection(placed_moving)
                overlaps = intersection.area > 1e-6
                
                # NFP strictly forbidden check (inside)
                in_nfp = nfp.contains(pt)
                touches_nfp = nfp.touches(pt)
                is_forbidden = in_nfp or touches_nfp
                
                if overlaps and not is_forbidden:
                    # If real overlap happens, NFP MUST say it is forbidden.
                    # Only allow false negative if the overlap area is virtually zero (numerical noise)
                    if intersection.area > 1e-5: 
                        false_negatives += 1
                        
                if is_forbidden and not overlaps:
                    # NFP says forbidden, but real says free.
                    # Allow if it's literally touching the boundary (distance ~ 0)
                    if placed_moving.distance(fixed_p) > 1e-5:
                        false_positives += 1
                        
                total_tests += 1
                
    print(f"Seed: {seed}")
    print(f"Boundary points evaluated: {len(boundary_points)}")
    print(f"Total adversarial samples: {total_tests}")
    print(f"False Positives: {false_positives}")
    print(f"False Negatives: {false_negatives}")

if __name__ == '__main__':
    adversarial_nfp_oracle(42)
