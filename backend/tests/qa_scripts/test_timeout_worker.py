import concurrent.futures
import time
import os
import psutil

def cpu_bound_long_task():
    pid = os.getpid()
    print(f"Worker PID: {pid}")
    # Simulate CPU bound work with a loop
    end = time.time() + 30
    while time.time() < end:
        _ = 1 + 1
    return "Done"

def test_hard_timeout():
    print(f"Parent PID: {os.getpid()}")
    worker_pid = None
    
    with concurrent.futures.ProcessPoolExecutor(max_workers=1) as executor:
        # We need a way to grab the worker PID. Let's just submit a quick task first.
        future_pid = executor.submit(os.getpid)
        worker_pid = future_pid.result()
        print(f"Detected Worker PID: {worker_pid}")
        
        future = executor.submit(cpu_bound_long_task)
        
        try:
            future.result(timeout=2.0)
        except concurrent.futures.TimeoutError:
            print("Future returned TimeoutError.")
            # At this point, the worker is still inside the with block.
            # But the future timeout just gave control back to us.
            pass
            
    # Outside the 'with' block, the executor shuts down.
    # Python 3 ProcessPoolExecutor wait=True by default on exit.
    # If wait=True, it will block until the worker finishes!
    # Let's see if this script even gets here!
    print("Executor shutdown complete (or didn't block?).")
    
    if psutil.pid_exists(worker_pid):
        print("Worker is still alive immediately after!")
    else:
        print("Worker is DEAD immediately after!")
        
    time.sleep(1)
    if psutil.pid_exists(worker_pid):
        print("Worker is still alive +1s!")
    else:
        print("Worker is DEAD +1s!")
        
    time.sleep(4)
    if psutil.pid_exists(worker_pid):
        print("Worker is still alive +5s!")
    else:
        print("Worker is DEAD +5s!")

if __name__ == '__main__':
    test_hard_timeout()
