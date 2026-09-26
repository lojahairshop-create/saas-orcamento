import concurrent.futures
import time
import os
import psutil

# Test concurrency on orchestrator
def test_concurrency():
    os.environ["TRUE_SHAPE_ENABLED"] = "true"
    os.environ["TRUE_SHAPE_SOFT_BUDGET_SECONDS"] = "2.0"
    os.environ["TRUE_SHAPE_HARD_TIMEOUT_SECONDS"] = "3.0"
    
    from app.calculo.nesting_engine import Nesting2DEngine
    
    pecas = [{"id": "1", "largura": 100, "comprimento": 100, "quantidade": 1}]
    
    for reqs in [1, 2, 5]:
        start = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=reqs) as pool:
            futs = [pool.submit(Nesting2DEngine.otimizar_chapa_single_bin, pecas, (200, 200), 0) for _ in range(reqs)]
            concurrent.futures.wait(futs)
        duration = time.time() - start
        
        # Check remaining child processes
        current = psutil.Process()
        children = current.children(recursive=True)
        print(f"Requests: {reqs} | Time: {duration:.2f}s | Orphaned children: {len(children)}")
        
if __name__ == "__main__":
    test_concurrency()
