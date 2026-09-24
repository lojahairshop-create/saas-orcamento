import time
from backend.geometry_lab.test_lab import create_rect, create_triangle, create_l_shape, create_half_moon
from backend.geometry_lab.strategy import PlacementStrategy
from backend.geometry_lab.strategy_optimized import StrategyAOptimized
from backend.geometry_lab.strategy_b import StrategyBNfp
from backend.geometry_lab.validator import PlacementValidator

def print_result(name, placements, duration, validator_passed):
    print(f"{name:25} | Placed: {len(placements):3} | Time: {duration:6.4f}s | Valid: {validator_passed}")

def test_dataset(name, parts, sheet_w, sheet_h):
    print(f"\\n=== Dataset: {name} ({len(parts)} parts) ===")
    
    # Strategy A
    sA = PlacementStrategy(sheet_w, sheet_h)
    start = time.time()
    pA = sA.execute(parts)
    tA = time.time() - start
    vA, _ = PlacementValidator(sheet_w, sheet_h).validate(pA, parts)
    print_result("Strategy A (Discrete)", pA, tA, vA)
    
    # Strategy A Optimized
    sA_opt = StrategyAOptimized(sheet_w, sheet_h)
    start = time.time()
    pA_opt = sA_opt.execute(parts)
    tA_opt = time.time() - start
    vA_opt, _ = PlacementValidator(sheet_w, sheet_h).validate(pA_opt, parts)
    print_result("Strategy A Optimized", pA_opt, tA_opt, vA_opt)
    
    # Strategy B (Real NFP)
    sB = StrategyBNfp(sheet_w, sheet_h)
    start = time.time()
    pB = sB.execute(parts)
    tB = time.time() - start
    vB, _ = PlacementValidator(sheet_w, sheet_h).validate(pB, parts)
    print_result("Strategy B (Real NFP)", pB, tB, vB)

if __name__ == '__main__':
    # 1. 100 Identical
    parts_100_id = [create_rect(f'P{i}', 10, 10) for i in range(100)]
    test_dataset("100 Identical Rects", parts_100_id, 200, 200)
    
    # 2. 100 Varied
    parts_100_var = []
    for i in range(25):
        parts_100_var.append(create_rect(f'R{i}', 10, 10))
        parts_100_var.append(create_triangle(f'T{i}', 15, 15))
        parts_100_var.append(create_l_shape(f'L{i}'))
        parts_100_var.append(create_half_moon(f'HM{i}'))
    test_dataset("100 Varied Shapes", parts_100_var, 600, 600)
    
    # 3. 20 Concave
    parts_20_concave = [create_half_moon(f'HM{i}') for i in range(20)]
    test_dataset("20 Concave (Half Moons)", parts_20_concave, 200, 200)
