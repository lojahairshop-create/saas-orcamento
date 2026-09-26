import os
import copy
from typing import List, Dict, Any, Tuple
import concurrent.futures
import time
import multiprocessing
from app.calculo.true_shape.models import CanonicalPartGeometry, NestingResult, Placement
from app.calculo.true_shape.strategy_b import StrategyBNfp
from app.calculo.true_shape.validator import PlacementValidator

# Feature Flags and Limits
TRUE_SHAPE_ENABLED = os.getenv("TRUE_SHAPE_ENABLED", "false").lower() == "true"
TRUE_SHAPE_SOFT_BUDGET_SECONDS = float(os.getenv("TRUE_SHAPE_SOFT_BUDGET_SECONDS", "10.0"))
TRUE_SHAPE_HARD_TIMEOUT_SECONDS = float(os.getenv("TRUE_SHAPE_HARD_TIMEOUT_SECONDS", "20.0"))

def _run_strategy_b_worker_pipe(
    parts_data: List[Dict[str, Any]], 
    sheet_w: float, 
    sheet_h: float, 
    clearance: float, 
    soft_budget: float,
    result_queue: multiprocessing.Queue
):
    """
    Worker function to be run in a separate process via multiprocessing.Process.
    It writes the result dict to the multiprocessing.Queue.
    """
    try:
        parts = [CanonicalPartGeometry(**p) for p in parts_data]
        start = time.time()
        
        rotations = [0.0]
        strategy = StrategyBNfp(sheet_w, sheet_h, clearance=clearance)
        
        placements = strategy.execute(parts, rotations=rotations, timeout_budget=soft_budget)
        
        validator = PlacementValidator(sheet_w, sheet_h, clearance)
        val_res = validator.validate(placements, parts)
        
        result_queue.put({
            "placements": [p.dict() for p in placements],
            "validation": val_res.dict(),
            "time_taken": time.time() - start
        })
    except Exception as e:
        result_queue.put({
            "error": str(e),
            "time_taken": time.time() - start if 'start' in locals() else 0.0
        })


import threading
# Limit is applied PER FASTAPI WORKER. If you run Gunicorn with 4 workers, the global limit will be 4 * MAX_CONCURRENT_JOBS.
TRUE_SHAPE_MAX_CONCURRENT_JOBS = int(os.getenv("TRUE_SHAPE_MAX_CONCURRENT_JOBS", "2"))
_concurrency_semaphore = threading.Semaphore(TRUE_SHAPE_MAX_CONCURRENT_JOBS)

class TrueShapeOrchestrator:
    # _create_canonical_part remains exactly the same...

    @staticmethod
    def _create_canonical_part(p: Dict[str, Any]) -> CanonicalPartGeometry:
        pid = str(p.get("id", "0"))
        w = float(p.get("largura", 0))
        h = float(p.get("comprimento", 0))
        
        source_meta = p.get("source_metadata")
        outer = []
        holes = []
        
        # Try to extract precise geometry from DXF primitives
        extracted = False
        if source_meta:
            try:
                import math
                from shapely.geometry import LineString, Point, Polygon
                from shapely.ops import linemerge, polygonize
                
                lines = []
                
                # Function to convert a primitive to a Shapely LineString
                def prim_to_line(prim):
                    ptype = prim["type"]
                    if ptype == "LINE":
                        return LineString([prim["start"], prim["end"]])
                    elif ptype == "ARC":
                        # Discretize arc
                        cx, cy = prim["center"]
                        r = prim["radius"]
                        sa = prim["start_angle"]
                        ea = prim["end_angle"]
                        if ea < sa:
                            ea += 360
                        
                        steps = max(8, int((ea - sa) / 5)) # approx 5 degrees per step
                        pts = []
                        for i in range(steps + 1):
                            ang = sa + (ea - sa) * (i / steps)
                            rad = math.radians(ang)
                            pts.append((cx + r * math.cos(rad), cy + r * math.sin(rad)))
                        return LineString(pts)
                    elif ptype == "CIRCLE":
                        cx, cy = prim["center"]
                        r = prim["radius"]
                        return Point(cx, cy).buffer(r, resolution=16).exterior
                    return None

                prims = source_meta.get("primitives", [])
                if not prims and "outer" in source_meta:
                    prims = source_meta["outer"]
                    for inner_prims in source_meta.get("inner", []):
                        prims.extend(inner_prims)

                for prim in prims:
                    ln = prim_to_line(prim)
                    if ln:
                        lines.append(ln)
                        
                if lines:
                    merged = linemerge(lines)
                    polygons = list(polygonize(merged))
                    
                    if polygons:
                        # Check if there are independent polygons
                        independent_polys = []
                        for p in polygons:
                            is_inside = any(other.contains(p) for other in polygons if other != p)
                            if not is_inside:
                                independent_polys.append(p)
                                
                        if len(independent_polys) > 1:
                            print("[TrueShape] Multiple independent contours found in a single part. Falling back to Bounding Box to prevent discarding geometry.")
                            extracted = False
                        else:
                            base_poly = independent_polys[0]
                            
                            # Fix orientation and extract
                            if not base_poly.exterior.is_ccw:
                                outer = list(base_poly.exterior.coords)[::-1]
                            else:
                                outer = list(base_poly.exterior.coords)
                                
                            # If there are inner holes in the DXF, they are parsed as other polygons 
                            # totally inside the base_poly, or as holes inside base_poly.
                            for p_in in base_poly.interiors:
                                holes.append(list(p_in.coords))
                                
                            for i in range(len(polygons)):
                                if polygons[i] != base_poly and base_poly.contains(polygons[i]):
                                    holes.append(list(polygons[i].exterior.coords))
                                    
                            extracted = True
            except Exception as e:
                print(f"[TrueShape] Failed to extract canonical geometry from DXF metadata: {e}")
                
        if not extracted:
            # Fallback to Rect
            outer = [(0.0, 0.0), (w, 0.0), (w, h), (0.0, h)]
            
        # Reposition to origin (0,0) min bounds
        if extracted and outer:
            from shapely.geometry import Polygon
            temp_poly = Polygon(outer, holes)
            min_x, min_y, max_x, max_y = temp_poly.bounds
            
            new_outer = [(x - min_x, y - min_y) for x, y in outer]
            new_holes = [[(x - min_x, y - min_y) for x, y in h_pts] for h_pts in holes]
            outer = new_outer
            holes = new_holes
            
        bounds = (0.0, 0.0, w, h)
        area = w * h
        
        return CanonicalPartGeometry(
            id=pid,
            outer=outer,
            holes=holes,
            bounds=bounds,
            area=area,
            geometry_tolerance=0.1,
            source_metadata={"original_dict": p}
        )

    @classmethod
    def execute(
        cls, 
        pecas: List[Dict[str, Any]], 
        chapa_dim: Tuple[float, float],
        margem_corte: float = 5.0
    ) -> NestingResult:
        """
        Executes True Shape Nesting with ProcessPoolExecutor isolation and Hard Timeout.
        """
        start = time.time()
        
        # Flatten pieces by quantity
        pecas_individuais = []
        for p in pecas:
            qtd = p.get('quantidade', 1)
            for i in range(qtd):
                cp = copy.deepcopy(p)
                cp["id"] = f"{p.get('id', 'peca')}_{i}"
                pecas_individuais.append(cp)
                
        canonical_parts = [cls._create_canonical_part(p) for p in pecas_individuais]
        parts_data = [p.dict() for p in canonical_parts]
        sheet_w, sheet_h = chapa_dim
        
        # Isolation with multiprocessing.Process
        placements_data = []
        validation_data = None
        error_msg = None
        
        # Check capacity
        acquired = _concurrency_semaphore.acquire(blocking=False)
        if not acquired:
            print("[TRUE SHAPE] Capacity rejected: TRUE_SHAPE_MAX_CONCURRENT_JOBS exceeded.")
            error_msg = "TRUE_SHAPE_CAPACITY_LIMIT"
        else:
            try:
                import multiprocessing
                import queue
                import psutil
                
                q = multiprocessing.Queue()
                
                process = multiprocessing.Process(
                    target=_run_strategy_b_worker_pipe,
                    args=(parts_data, sheet_w, sheet_h, margem_corte, TRUE_SHAPE_SOFT_BUDGET_SECONDS, q)
                )
                process.start()
                child_pid = process.pid
                print(f"DEBUG: Spawned TrueShape process PID: {child_pid}")
                
                try:
                    result = q.get(timeout=TRUE_SHAPE_HARD_TIMEOUT_SECONDS)
                    process.join()
                    
                    if "error" in result:
                        error_msg = result["error"]
                        print(f"DEBUG WORKER ERROR: {error_msg}")
                    else:
                        placements_data = result["placements"]
                        validation_data = result["validation"]
                        
                except queue.Empty:
                    error_msg = f"Hard timeout exceeded ({TRUE_SHAPE_HARD_TIMEOUT_SECONDS}s)"
                    print(f"DEBUG: {error_msg}")
                except Exception as e:
                    error_msg = f"Process IPC execution failed: {str(e)}"
                    print(f"DEBUG: {error_msg}")
                    
                # TRUE KILL
                if process.is_alive():
                    print(f"DEBUG: Process {child_pid} is alive. Terminating...")
                    process.terminate()
                    process.join(timeout=1.0)
                    if process.is_alive():
                        print(f"DEBUG: Process {child_pid} resisted terminate. Killing...")
                        try:
                            # In Windows process.kill() is same as terminate(), but we can use psutil to enforce
                            p = psutil.Process(child_pid)
                            p.kill()
                        except Exception:
                            process.kill()
                        process.join(timeout=1.0)
                    print(f"DEBUG: Process {child_pid} cleanup done.")
            finally:
                _concurrency_semaphore.release()
                
        duration_ms = (time.time() - start) * 1000
        
        # Evaluate result and return
        if error_msg:
            return NestingResult(
                status="TIMEOUT" if "timeout" in error_msg.lower() else "ENGINE_ERROR",
                placements=[],
                utilization=0.0,
                duration_ms=duration_ms,
                warnings=[error_msg],
                diagnostics={"fallback_reason": error_msg}
            )
            
        if not validation_data.get("geometry_valid"):
            return NestingResult(
                status="INVALID_GEOMETRY",
                placements=[],
                utilization=0.0,
                duration_ms=duration_ms,
                warnings=["Validator rejected geometry (overlaps or bounds violation)"],
                diagnostics=validation_data
            )
            
        if not validation_data.get("complete"):
            return NestingResult(
                status="INCOMPLETE_RESULT",
                placements=[],
                utilization=0.0,
                duration_ms=duration_ms,
                warnings=["Not all pieces could be placed within the sheet"],
                diagnostics=validation_data
            )
            
        placements = [Placement(**p) for p in placements_data]
        
        # Calculate Utilization
        placed_area = sum(p.area for p in canonical_parts if any(pl.part_id == p.id for pl in placements))
        sheet_area = sheet_w * sheet_h
        utilization = (placed_area / sheet_area) * 100 if sheet_area > 0 else 0
        
        return NestingResult(
            status="SUCCESS",
            placements=placements,
            utilization=utilization,
            duration_ms=duration_ms,
            warnings=[],
            diagnostics=validation_data
        )
