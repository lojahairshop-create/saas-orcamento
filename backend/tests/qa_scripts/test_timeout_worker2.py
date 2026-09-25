import time
import os
import psutil
from backend.app.calculo.true_shape.orchestrator import TrueShapeOrchestrator

def cpu_bound_long_task(parts_data, sheet_w, sheet_h, clearance, soft_budget, q):
    # Overwrite the worker temporarily to test
    print(f"DEBUG: Worker PID: {os.getpid()} starting infinite loop")
    end = time.time() + 30
    while time.time() < end:
        _ = 1 + 1

def test_hard_timeout():
    import backend.app.calculo.true_shape.orchestrator as orch
    orch._run_strategy_b_worker_pipe = cpu_bound_long_task
    orch.TRUE_SHAPE_HARD_TIMEOUT_SECONDS = 2.0
    orch.TRUE_SHAPE_ENABLED = True
    
    parent_pid = os.getpid()
    print(f"Parent PID: {parent_pid}")
    
    parts = [{"id": "1", "largura": 100, "comprimento": 100, "quantidade": 1}]
    chapa_dim = (200, 200)
    
    res = orch.TrueShapeOrchestrator.execute(parts, chapa_dim, 0)
    print(f"Result Status: {res.status if res else 'None'}")
    
    # Let's find the orphaned process
    current = psutil.Process()
    children = current.children(recursive=True)
    if not children:
        print("Worker is DEAD immediately after!")
    else:
        print(f"Worker {children[0].pid} is still alive immediately after!")
        
    time.sleep(1)
    children = current.children(recursive=True)
    if not children:
        print("Worker is DEAD +1s!")
    else:
        print("Worker is still alive +1s!")
        
    time.sleep(4)
    children = current.children(recursive=True)
    if not children:
        print("Worker is DEAD +5s!")
    else:
        print("Worker is still alive +5s!")

if __name__ == '__main__':
    # Need to protect multiprocess entry point on Windows
    import multiprocessing
    multiprocessing.freeze_support()
    test_hard_timeout()
