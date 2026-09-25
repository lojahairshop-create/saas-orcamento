import time
from shapely.geometry import Polygon
from shapely.affinity import translate, scale
from shapely.ops import unary_union, triangulate
from backend.app.calculo.true_shape.kernel import GeometryKernel
from typing import Tuple

class RealNfpProvider:
    @staticmethod
    def _convex_minkowski(p1: Polygon, p2: Polygon) -> Polygon:
        # For two convex polygons, the Minkowski sum is the convex hull of all pairwise vertex sums.
        # But an easier way in Shapely is: take all vertices of p1, translate p2 to them, and convex hull the union.
        sweeps = []
        for x, y in p1.exterior.coords:
            sweeps.append(translate(p2, x, y))
        return unary_union(sweeps).convex_hull

    @staticmethod
    def generate_nfp(fixed_poly: Polygon, moving_poly: Polygon) -> Polygon:
        """
        Exact NFP generation using Convex Decomposition (Triangulation).
        NFP(A, B) = Union( MinkowskiSum(A_i, -B_j) ) for all convex parts i, j.
        """
        inv_moving = scale(moving_poly, xfact=-1.0, yfact=-1.0, origin=(0,0))
        
        # Decompose into triangles (which are convex)
        fixed_triangles = triangulate(fixed_poly)
        moving_triangles = triangulate(inv_moving)
        
        # Filter triangles that are actually inside the polygons
        # (Delaunay triangulates the convex hull, we must keep only internal ones)
        # Using a point strictly inside the triangle, or just intersection area
        fixed_parts = [t for t in fixed_triangles if fixed_poly.intersection(t).area > t.area * 0.99]
        moving_parts = [t for t in moving_triangles if inv_moving.intersection(t).area > t.area * 0.99]
        
        nfp_parts = []
        for f_part in fixed_parts:
            for m_part in moving_parts:
                nfp_parts.append(RealNfpProvider._convex_minkowski(f_part, m_part))
                
        nfp_poly = unary_union(nfp_parts)
        
        # Clean up floating point artifacts
        nfp_poly = nfp_poly.buffer(1e-6).buffer(-1e-6)
        
        return nfp_poly
