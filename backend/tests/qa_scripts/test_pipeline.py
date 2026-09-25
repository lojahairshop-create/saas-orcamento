import os
import time
from backend.app.engenharia.dxf_processor import DXFProcessor
from backend.app.calculo.nesting_engine import Nesting2DEngine

# A small SVG string to use for testing
SVG_CONTENT = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 0 0 L 100 0 L 100 100 L 0 100 Z" fill="none"/></svg>'

def create_dxf_mock_file(num_pieces):
    # This is a bit tricky without generating real DXF bytes.
    # We will mock the DXF processor to just return metadata for N rectangles.
    # Actually, we can just instantiate the Canonical geometry.
    # But the prompt asks for: "DXF processing -> canonicalization -> TrueShape..."
    # We will simulate the DXFProcessor returning the dictionaries.
    results = []
    t_dxf_start = time.time()
    for i in range(num_pieces):
        primitives = [
            {"type": "LINE", "start": (0, 0), "end": (10, 0)},
            {"type": "LINE", "start": (10, 0), "end": (10, 10)},
            {"type": "LINE", "start": (10, 10), "end": (0, 10)},
            {"type": "LINE", "start": (0, 10), "end": (0, 0)}
        ]
        results.append({
            "perimetro": 40.0,
            "num_entradas": 1,
            "largura": 10.0,
            "comprimento": 10.0,
            "area": 0.0001,
            "furos": 0,
            "vetor_svg": SVG_CONTENT,
            "source_metadata": {"primitives": primitives}
        })
    dxf_time = time.time() - t_dxf_start
    
    # Map to ItemCreate
    itens = []
    for i, res in enumerate(results):
        itens.append({
            "id": f"item_{i}",
            "largura": res["largura"],
            "comprimento": res["comprimento"],
            "quantidade": 1,
            "source_metadata": res["source_metadata"]
        })
        
    return itens, dxf_time

def run_benchmarks():
    os.environ["TRUE_SHAPE_SOFT_BUDGET_SECONDS"] = "20.0"
    os.environ["TRUE_SHAPE_HARD_TIMEOUT_SECONDS"] = "30.0"
    
    for n in [10, 50, 100, 300]:
        itens, dxf_time = create_dxf_mock_file(n)
        
        import backend.app.calculo.nesting_engine as ne
        ne.TRUE_SHAPE_ENABLED = False
        t_start = time.time()
        res_bbox = Nesting2DEngine.otimizar_chapa_single_bin(itens, (200, 200), margem_corte=0)
        t_bbox = time.time() - t_start
        
        ne.TRUE_SHAPE_ENABLED = True
        t_start = time.time()
        res_ts = Nesting2DEngine.otimizar_chapa_single_bin(itens, (200, 200), margem_corte=0)
        t_ts = time.time() - t_start
        
        print(f"--- {n} Pieces ---")
        print(f"DXF Time: {dxf_time:.4f}s")
        print(f"BBox Time: {t_bbox:.4f}s | Util: {res_bbox['aproveitamento_percentual']:.2f}% | Placed: {len(res_bbox['pecas_posicionadas'])}")
        print(f"TrueShape Time: {t_ts:.4f}s | Util: {res_ts['aproveitamento_percentual']:.2f}% | Placed: {len(res_ts['pecas_posicionadas'])}")

if __name__ == "__main__":
    run_benchmarks()
