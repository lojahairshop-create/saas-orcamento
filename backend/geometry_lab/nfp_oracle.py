import random
from shapely.geometry import Point
from backend.geometry_lab.kernel import GeometryKernel
from backend.geometry_lab.nfp_real import RealNfpProvider
from backend.geometry_lab.test_lab import create_rect, create_triangle, create_l_shape, create_half_moon

def collision_oracle(name, partA, partB, num_tests=5000):
    print(f"--- Oracle Testing: {name} ---")
    fixed_p = GeometryKernel.create_polygon(partA.outer, partA.holes)
    moving_p = GeometryKernel.create_polygon(partB.outer, partB.holes)
    
    # 1. Generate NFP
    nfp = RealNfpProvider.generate_nfp(fixed_p, moving_p)
    
    # Generate bounding box for random points (slightly larger than NFP bounds)
    minx, miny, maxx, maxy = nfp.bounds
    w = maxx - minx
    h = maxy - miny
    
    false_positives = 0
    false_negatives = 0
    
    for _ in range(num_tests):
        rx = minx - (w*0.1) + random.random() * (w*1.2)
        ry = miny - (h*0.1) + random.random() * (h*1.2)
        pt = Point(rx, ry)
        
        # Is point in NFP? (Means forbidden)
        # Boundary is technically touching, which might be valid for clearance=0, 
        # but strictly speaking, NFP contains forbidden and boundary.
        # Let's say forbidden = strictly inside (contains), or touches.
        # Actually, NFP represents where they overlap. If it's inside, it overlaps.
        # If it's on boundary, it touches.
        in_nfp = nfp.contains(pt)
        touches_nfp = nfp.touches(pt)
        
        # Place moving part
        placed_moving = GeometryKernel.translate(moving_p, rx, ry)
        
        # Real shapely overlap
        overlaps = GeometryKernel.overlaps(fixed_p, placed_moving)
        
        # If real overlaps, point MUST be in NFP. If not, FALSE NEGATIVE!
        if overlaps and not (in_nfp or touches_nfp or nfp.distance(pt) < 1e-4):
            false_negatives += 1
            
        # If point in strictly in NFP, real MUST overlap. If not, FALSE POSITIVE!
        # Except, our NFP via edge-sweep might slightly overestimate due to convex hull?
        if in_nfp and not nfp.exterior.distance(pt) < 1e-4:
            if not overlaps and fixed_p.distance(placed_moving) > 1e-4:
                false_positives += 1

    print(f"Tests: {num_tests}")
    print(f"False Positives: {false_positives}")
    print(f"False Negatives: {false_negatives}")
    if false_negatives > 0:
        print("CRITICAL FAILURE: FALSE NEGATIVES DETECTED!")
    print("")

if __name__ == '__main__':
    rect = create_rect("R", 50, 50)
    tri = create_triangle("T", 50, 50)
    lshape = create_l_shape("L")
    hm = create_half_moon("HM")
    
    collision_oracle("Convex x Convex (Rect x Rect)", rect, rect)
    collision_oracle("Convex x Concave (Rect x L)", rect, lshape)
    collision_oracle("Concave x Convex (L x Rect)", lshape, rect)
    collision_oracle("Concave x Concave (L x L)", lshape, lshape)
    collision_oracle("Half-moon x Half-moon", hm, hm)
