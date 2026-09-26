import os
import sys

# Set feature flags for test
os.environ["TRUE_SHAPE_ENABLED"] = "true"
os.environ["TRUE_SHAPE_SOFT_BUDGET_SECONDS"] = "2.0"
os.environ["TRUE_SHAPE_HARD_TIMEOUT_SECONDS"] = "3.0"

from app.calculo.nesting_engine import Nesting2DEngine

def test_integration():
    pecas = [
        {
            "id": "1",
            "largura": 100,
            "comprimento": 100,
            "quantidade": 1,
            "source_metadata": {
                "primitives": [
                    {"type": "LINE", "start": (0, 0), "end": (100, 0)},
                    {"type": "LINE", "start": (100, 0), "end": (100, 100)},
                    {"type": "LINE", "start": (100, 100), "end": (0, 100)},
                    {"type": "LINE", "start": (0, 100), "end": (0, 0)},
                    # Inner hole
                    {"type": "CIRCLE", "center": (50, 50), "radius": 10}
                ]
            }
        }
    ]
    
    print("Testing TRUE_SHAPE_ENABLED = True")
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, (200, 200), margem_corte=0)
    print(f"Engine used: {res.get('engine_used')}")
    print(f"Placed: {len(res['pecas_posicionadas'])}")
    
    # Test Fallback Timeout
    print("\nTesting Timeout Fallback")
    pecas_timeout = [{"id": str(i), "largura": 100, "comprimento": 100, "quantidade": 1} for i in range(10)]
    os.environ["TRUE_SHAPE_HARD_TIMEOUT_SECONDS"] = "0.1"
    os.environ["TRUE_SHAPE_SOFT_BUDGET_SECONDS"] = "0.05"
    
    # Note: Because of how Python modules cache os.environ, we need to inject it into TrueShapeOrchestrator directly for the test
    import app.calculo.true_shape.orchestrator as orch
    orch.TRUE_SHAPE_HARD_TIMEOUT_SECONDS = 0.1
    orch.TRUE_SHAPE_SOFT_BUDGET_SECONDS = 0.05
    
    res2 = Nesting2DEngine.otimizar_chapa_single_bin(pecas_timeout, (50, 50), margem_corte=0)
    # 10 pieces of 100x100 into a 50x50 sheet will immediately fail geometry overlap or timeout
    print(f"Engine used after fallback?: {'TrueShape' if 'engine_used' in res2 else 'BoundingBox'}")
    print(f"Placed: {len(res2['pecas_posicionadas'])}")

if __name__ == '__main__':
    test_integration()
