import time
from backend.geometry_lab.test_lab import create_rect
from backend.geometry_lab.strategy_b import StrategyBNfp
from backend.geometry_lab.models import NestingResult

def transactional_orchestrator(parts, sheet_w, sheet_h):
    # Simulate TrueShapeOrchestrator
    try:
        sB = StrategyBNfp(sheet_w, sheet_h)
        
        # Simulate a crash at piece 99
        placements = []
        for i, part in enumerate(parts):
            if i == 99:
                raise ValueError("Simulated Exception at piece 99")
            
            p = sB.execute([part])[0]
            placements.append(p)
            
        return NestingResult(
            status="SUCCESS",
            placements=placements,
            utilization=0,
            duration_ms=0,
            warnings=[],
            diagnostics={}
        )
    except Exception as e:
        print(f"TrueShape Failed: {str(e)}. Triggering Fallback.")
        # Fallback to BoundingBox Engine for the FULL lot.
        # We simulate BB by just returning empty with INCOMPLETE_RESULT for now.
        return NestingResult(
            status="ENGINE_ERROR",
            placements=[], # 99 placements discarded!
            utilization=0,
            duration_ms=0,
            warnings=["Fallback triggered due to TrueShape exception"],
            diagnostics={"fallback_reason": str(e)}
        )

if __name__ == '__main__':
    parts = [create_rect(f"P{i}", 10, 10) for i in range(100)]
    result = transactional_orchestrator(parts, 200, 200)
    print(f"Status: {result.status}")
    print(f"Placements Count: {len(result.placements)}")
    assert len(result.placements) == 0, "Placements should be entirely discarded!"
    print("Transactional rollback successful.")
