from shapely.geometry import Polygon, MultiPolygon
from shapely.affinity import translate, rotate
import math
from typing import Tuple, List

class GeometryKernel:
    """ Abstração para operações geométricas usando Shapely por baixo """
    @staticmethod
    def create_polygon(outer: List[Tuple[float, float]], holes: List[List[Tuple[float, float]]] = None) -> Polygon:
        return Polygon(shell=outer, holes=holes)

    @staticmethod
    def is_valid(poly: Polygon) -> bool:
        return poly.is_valid

    @staticmethod
    def area(poly: Polygon) -> float:
        return poly.area

    @staticmethod
    def bounds(poly: Polygon) -> Tuple[float, float, float, float]:
        return poly.bounds

    @staticmethod
    def contains(poly1: Polygon, poly2: Polygon) -> bool:
        return poly1.contains(poly2)

    @staticmethod
    def intersects(poly1: Polygon, poly2: Polygon) -> bool:
        # intersects() true includes touching borders.
        # But we need to handle clearances. For clearance 0, touches is OK.
        # So if they only touch (relate 'T'), they don't overlap.
        # Actually overlaps() checks if they share interior.
        # poly1.intersection(poly2).area > 0 is a safe overlap check.
        # However, for pure boolean:
        return poly1.intersects(poly2)

    @staticmethod
    def overlaps(poly1: Polygon, poly2: Polygon) -> bool:
        """ Returns true if they intersect with an area > 0 (overlapping interiors) """
        return poly1.intersection(poly2).area > 1e-6

    @staticmethod
    def offset(poly: Polygon, distance: float) -> Polygon:
        # Positive distance = inflate. Negative = deflate.
        # join_style=2 (mitre) or 1 (round)
        return poly.buffer(distance, join_style=2)

    @staticmethod
    def translate(poly: Polygon, dx: float, dy: float) -> Polygon:
        return translate(poly, xoff=dx, yoff=dy)

    @staticmethod
    def rotate(poly: Polygon, angle_deg: float, origin='centroid') -> Polygon:
        return rotate(poly, angle_deg, origin=origin)
