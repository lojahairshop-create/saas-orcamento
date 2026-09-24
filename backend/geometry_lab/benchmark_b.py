import time
from backend.geometry_lab.test_lab import create_rect, create_triangle, create_l_shape, create_half_moon
from backend.geometry_lab.strategy_b import StrategyBNfp
from backend.geometry_lab.validator import PlacementValidator
from backend.geometry_lab.strategy_optimized import StrategyAOptimized

def test_dataset(name, parts, sheet_w, sheet_h):
    print(f"\\n=== Dataset: {name} ({len(parts)} parts) ===")
    
    # Strategy B (Real NFP)
    sB = StrategyBNfp(sheet_w, sheet_h, clearance=2.0)
    start = time.time()
    pB = sB.execute(parts)
    tB = time.time() - start
    vB = PlacementValidator(sheet_w, sheet_h, clearance=2.0).validate(pB, parts)
    print(f"Strategy B | Placed: {vB.placed_parts}/{vB.requested_parts} | Time: {tB:.4f}s | Valid: {vB.geometry_valid} | Overlaps: {vB.overlap_count} | Clearance Violations: {vB.clearance_violations}")
    
    return tB

if __name__ == '__main__':
    print("--- BENCHMARK STRATEGY B ---")
    # 10 pieces
    p10 = [create_rect(f'P{i}', 20, 20) for i in range(10)]
    test_dataset("10 Identical Rects", p10, 200, 200)
    
    # 50 pieces
    p50 = [create_rect(f'P{i}', 20, 20) for i in range(50)]
    test_dataset("50 Identical Rects", p50, 200, 200)
    
    # 100 pieces
    p100 = [create_rect(f'P{i}', 10, 10) for i in range(100)]
    test_dataset("100 Identical Rects", p100, 200, 200)
    
    # 300 pieces
    p300 = [create_rect(f'P{i}', 5, 5) for i in range(300)]
    t300 = test_dataset("300 Identical Rects", p300, 200, 200)
    
    # Mixed concave
    p_mixed = []
    for i in range(10):
        p_mixed.append(create_l_shape(f'L{i}'))
        p_mixed.append(create_half_moon(f'HM{i}'))
    test_dataset("20 Concave Mixed", p_mixed, 300, 300)
