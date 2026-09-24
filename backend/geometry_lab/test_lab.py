import time
import math
from backend.geometry_lab.models import CanonicalPartGeometry
from backend.geometry_lab.strategy import PlacementStrategy
from backend.geometry_lab.validator import PlacementValidator
from backend.geometry_lab.kernel import GeometryKernel

def create_rect(pid: str, w: float, h: float) -> CanonicalPartGeometry:
    return CanonicalPartGeometry(
        id=pid,
        outer=[(0,0), (w,0), (w,h), (0,h)],
        holes=[],
        bounds=(0,0,w,h),
        area=w*h,
        geometry_tolerance=0.1,
        source_metadata={"shape": "rect"}
    )

def create_triangle(pid: str, b: float, h: float) -> CanonicalPartGeometry:
    return CanonicalPartGeometry(
        id=pid,
        outer=[(0,h), (b,h), (b/2, 0)],
        holes=[],
        bounds=(0,0,b,h),
        area=(b*h)/2,
        geometry_tolerance=0.1,
        source_metadata={"shape": "triangle"}
    )

def create_l_shape(pid: str) -> CanonicalPartGeometry:
    # L shape: 100x100 overall. 20 thick.
    outer = [(0,0), (100,0), (100,20), (20,20), (20,100), (0,100)]
    return CanonicalPartGeometry(
        id=pid,
        outer=outer,
        holes=[],
        bounds=(0,0,100,100),
        area=(100*20) + (80*20),
        geometry_tolerance=0.1,
        source_metadata={"shape": "l_shape"}
    )

def create_half_moon(pid: str) -> CanonicalPartGeometry:
    # A C-shape / half-moon. We discretize a thick arc.
    # Outer radius 50, inner radius 30.
    outer = []
    # Outer arc (0 to 180 deg)
    for angle in range(0, 181, 10):
        rad = math.radians(angle)
        outer.append((50 + 50*math.cos(rad), 50 - 50*math.sin(rad)))
    # Inner arc (180 to 0 deg)
    for angle in range(180, -1, -10):
        rad = math.radians(angle)
        outer.append((50 + 30*math.cos(rad), 50 - 30*math.sin(rad)))
        
    return CanonicalPartGeometry(
        id=pid,
        outer=outer,
        holes=[],
        bounds=(0,0,100,50),
        area=math.pi * (50**2 - 30**2) / 2,
        geometry_tolerance=0.1,
        source_metadata={"shape": "half_moon"}
    )

def save_svg(filename, sheet_w, sheet_h, placed_polys):
    svg = f'<svg viewBox="0 0 {sheet_w} {sheet_h}" xmlns="http://www.w3.org/2000/svg">\n'
    svg += f'<rect width="{sheet_w}" height="{sheet_h}" fill="none" stroke="black" stroke-width="2"/>\n'
    colors = ['#ff9999', '#99ff99', '#9999ff', '#ffff99', '#ff99ff', '#99ffff']
    
    for i, (pid, poly) in enumerate(placed_polys):
        pts = poly.exterior.coords
        pts_str = " ".join([f"{x},{y}" for x, y in pts])
        color = colors[i % len(colors)]
        svg += f'<polygon points="{pts_str}" fill="{color}" stroke="black" stroke-width="1" opacity="0.8"/>\n'
        # approximate centroid for label
        minx, miny, maxx, maxy = poly.bounds
        cx = minx + (maxx-minx)/2
        cy = miny + (maxy-miny)/2
        svg += f'<text x="{cx}" y="{cy}" font-size="12" fill="black" text-anchor="middle">{pid}</text>\n'
    
    svg += '</svg>'
    with open(filename, 'w') as f:
        f.write(svg)

def run_test(test_name: str, parts: list, sheet_w=200, sheet_h=200, clearance=0.0, rotations=[0.0]):
    print(f"--- Running {test_name} ---")
    start = time.time()
    strategy = PlacementStrategy(sheet_w, sheet_h, clearance)
    placements = strategy.execute(parts, rotations)
    duration = time.time() - start
    
    validator = PlacementValidator(sheet_w, sheet_h, clearance)
    valid, errors = validator.validate(placements, parts)
    
    print(f"Placed: {len(placements)}/{len(parts)}")
    print(f"Valid: {valid}")
    if not valid:
        for e in errors:
            print(f" ERROR: {e}")
    print(f"Time: {duration:.4f}s\n")
    
    # Save SVG
    placed_polys = []
    part_dict = {p.id: p for p in parts}
    for pl in placements:
        part = part_dict[pl.part_id]
        poly = GeometryKernel.create_polygon(part.outer, part.holes)
        poly = GeometryKernel.rotate(poly, pl.rotation, origin=(0,0))
        poly = GeometryKernel.translate(poly, pl.x, pl.y)
        placed_polys.append((pl.part_id, poly))
        
    save_svg(f"backend/geometry_lab/{test_name.replace(' ', '_')}.svg", sheet_w, sheet_h, placed_polys)
    return valid

if __name__ == "__main__":
    # Test 1
    p1 = create_rect("R1", 50, 50)
    p2 = create_rect("R2", 50, 50)
    run_test("Test 1 - Rects", [p1, p2], 200, 200)

    # Test 2
    t1 = create_triangle("T1", 50, 50)
    t2 = create_triangle("T2", 50, 50)
    run_test("Test 2 - Triangles", [t1, t2], 200, 200, rotations=[0.0, 180.0])

    # Test 3
    l1 = create_l_shape("L1")
    l2 = create_l_shape("L2")
    run_test("Test 3 - L Shapes", [l1, l2], 200, 200, rotations=[0.0, 180.0])

    # Test 4
    l3 = create_l_shape("L3")
    small = create_rect("Small", 20, 20)
    run_test("Test 4 - Concavity Fit", [l3, small], 200, 200)

    # Test 5
    hm1 = create_half_moon("HM1")
    hm2 = create_half_moon("HM2")
    v = run_test("Test 5 - Half Moon", [hm1, hm2], 200, 200, rotations=[0.0, 180.0])
    
    if v:
        print("TRUE SHAPE GEOMETRY GATE: PASSED")
    else:
        print("TRUE SHAPE GEOMETRY GATE: FAILED")

    # Test 6: 10 pieces
    parts_10 = [create_rect(f'P{i}', 20, 20) for i in range(10)]
    run_test('Test 6 - 10 pieces', parts_10, 200, 200)

    # Test 7: 100 pieces
    # We use a very fast strategy test, maybe it will take a while
    parts_100 = [create_rect(f'P{i}', 10, 10) for i in range(100)]
    run_test('Test 7 - 100 pieces', parts_100, 200, 200)

    # Test 8: 300 pieces
    # parts_300 = [create_rect(f'P{i}', 5, 5) for i in range(300)]
    # run_test('Test 8 - 300 pieces', parts_300, 200, 200)

    # Additional tests
    def create_invalid(pid: str):
        return CanonicalPartGeometry(
            id=pid,
            outer=[(0,0), (50,50), (0,50), (50,0)], # Bowtie (self-intersecting)
            holes=[],
            bounds=(0,0,50,50),
            area=1250,
            geometry_tolerance=0.1,
            source_metadata={'shape': 'invalid'}
        )

    run_test('Test 8 - Clearance 0', [create_rect('R1', 50,50), create_rect('R2', 50,50)], 200, 200, clearance=0.0)
    run_test('Test 9 - Clearance 5', [create_rect('R1', 50,50), create_rect('R2', 50,50)], 200, 200, clearance=5.0)
    run_test('Test 10 - Larger than sheet', [create_rect('R1', 300, 300)], 200, 200)
    
    invalid_part = create_invalid('INV1')
    invalid_part_poly = GeometryKernel.create_polygon(invalid_part.outer)
    is_val = GeometryKernel.is_valid(invalid_part_poly)
    print(f'Invalid geometry test: poly.is_valid = {is_val}')
    
    run_test('Test 11 - Exact fit', [create_rect('R1', 200, 200)], 200, 200)
