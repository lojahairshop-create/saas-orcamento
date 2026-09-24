import cProfile
import pstats
from backend.geometry_lab.test_lab import create_rect, create_half_moon
from backend.geometry_lab.strategy import PlacementStrategy

def run_profiling():
    # 100 pieces identical
    parts_100 = [create_rect(f'P{i}', 10, 10) for i in range(100)]
    
    strategy = PlacementStrategy(200, 200, 0.0)
    
    profiler = cProfile.Profile()
    profiler.enable()
    
    placements = strategy.execute(parts_100, [0.0])
    
    profiler.disable()
    
    stats = pstats.Stats(profiler)
    stats.strip_dirs()
    stats.sort_stats('cumtime')
    stats.print_stats(15)

if __name__ == "__main__":
    run_profiling()
