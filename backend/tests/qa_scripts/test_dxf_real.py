import os
from backend.app.calculo.true_shape.orchestrator import TrueShapeOrchestrator

def test_polygonize():
    # 1. Test Multiple Independent Pieces in same Item 
    # (this happens if user uploads DXF with multiple objects without splitting)
    # The Prompt asks: "Não permitir que uma segunda peça independente seja classificada erroneamente como hole ou descartada."
    p1 = {
        "id": "multi_part",
        "largura": 50, "comprimento": 50,
        "source_metadata": {
            "primitives": [
                # Piece 1: 10x10 at origin
                {"type": "LINE", "start": (0, 0), "end": (10, 0)},
                {"type": "LINE", "start": (10, 0), "end": (10, 10)},
                {"type": "LINE", "start": (10, 10), "end": (0, 10)},
                {"type": "LINE", "start": (0, 10), "end": (0, 0)},
                # Piece 2: 10x10 offset by 30
                {"type": "LINE", "start": (30, 30), "end": (40, 30)},
                {"type": "LINE", "start": (40, 30), "end": (40, 40)},
                {"type": "LINE", "start": (40, 40), "end": (30, 40)},
                {"type": "LINE", "start": (30, 40), "end": (30, 30)}
            ]
        }
    }
    
    canonical_1 = TrueShapeOrchestrator._create_canonical_part(p1)
    
    print("--- MULTIPLE INDEPENDENT CONTOURS ---")
    print(f"Outer points: {len(canonical_1.outer)}")
    print(f"Holes: {len(canonical_1.holes)}")
    # If the logic in _create_canonical_part picks ONLY the largest polygon, it will discard the second one!
    
if __name__ == '__main__':
    test_polygonize()
