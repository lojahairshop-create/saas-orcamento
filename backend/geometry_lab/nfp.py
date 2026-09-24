from backend.geometry_lab.kernel import GeometryKernel
from shapely.geometry import Polygon
import numpy as np

class NfpProvider:
    """
    Experimental NFP provider to generate candidate placements.
    Since we don't have a robust C++ NFP library yet, we use a discrete 
    vertex-matching heuristic to generate candidate positions.
    """
    @staticmethod
    def generate_candidates(fixed_poly: Polygon, moving_poly: Polygon) -> list:
        # To make moving_poly touch fixed_poly, we can align their vertices.
        # Candidate translation T = V_fixed - V_moving
        candidates = []
        
        fixed_coords = list(fixed_poly.exterior.coords)
        moving_coords = list(moving_poly.exterior.coords)
        
        for fx, fy in fixed_coords:
            for mx, my in moving_coords:
                candidates.append((fx - mx, fy - my))
                
        # Also include some edge midpoints to be safe for T-junctions
        return candidates

    @staticmethod
    def generate_inner_candidates(sheet_poly: Polygon, moving_poly: Polygon) -> list:
        # Match moving_poly vertices to sheet vertices
        candidates = []
        sheet_coords = list(sheet_poly.exterior.coords)
        moving_coords = list(moving_poly.exterior.coords)
        
        for sx, sy in sheet_coords:
            for mx, my in moving_coords:
                candidates.append((sx - mx, sy - my))
        
        # Add corners specifically
        min_x, min_y, max_x, max_y = sheet_poly.bounds
        candidates.append((0, 0))
        return candidates
