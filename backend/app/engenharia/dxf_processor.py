"""
Módulo para processamento de arquivos DXF/CAD usando a biblioteca ezdxf.
Extrai perímetro total de corte, quantidade de furos, bounding box (largura e comprimento) e área aproximada.
"""

import os
import math
import tempfile
import ezdxf
from typing import Dict, Any


class DXFProcessor:
    """Classe responsável pelo processamento geométrico de arquivos DXF."""

    @staticmethod
    def process_file_content(file_bytes: bytes) -> Dict[str, Any]:
        """
        Lê o conteúdo binário de um arquivo DXF e extrai seus metadados geométricos.
        Retorna um dicionário com:
        - perimetro: float (em mm)
        - num_entradas: int (número de perfurações/caminhos fechados + furos)
        - largura: float (em mm)
        - comprimento: float (em mm)
        - area: float (área do bounding box em m²)
        - furos: int (número de círculos encontrados)
        """
        # Escreve os bytes em um arquivo temporário físico para ezdxf.readfile rodar de forma robusta
        with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        try:
            # Tenta carregar com readfile para detecção de codificação e parsing automático
            doc = ezdxf.readfile(temp_path)
        except Exception as exc:
            # Fallback para modo recover
            try:
                from ezdxf import recover
                doc, auditor = recover.readfile(temp_path)
            except Exception as rec_exc:
                raise ValueError(
                    f"Falha ao ler arquivo DXF: {str(exc)} (Recuperação também falhou: {str(rec_exc)})"
                )
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        msp = doc.modelspace()

        # Função auxiliar recursiva para decompor blocos (INSERT), polilinhas e splines em primitivas básicas
        def decompose(entity) -> list:
            dxftype = entity.dxftype()
            
            # Decompõe referências de blocos ou polilinhas em suas primitivas correspondentes (LINE, ARC, etc.)
            if dxftype in ("INSERT", "LWPOLYLINE", "POLYLINE"):
                prims = []
                try:
                    for sub_entity in entity.virtual_entities():
                        prims.extend(decompose(sub_entity))
                except Exception:
                    pass
                return prims
            
            # Decompõe splines suavizadas aproximando-as por pequenos segmentos de linha (tolerância 0.1 mm)
            elif dxftype == "SPLINE":
                prims = []
                try:
                    points = list(entity.flattening(0.1))
                    for i in range(len(points) - 1):
                        prims.append({
                            "type": "LINE",
                            "start": (points[i][0], points[i][1]),
                            "end": (points[i+1][0], points[i+1][1])
                        })
                except Exception:
                    pass
                return prims
            
            # Primitivas nativas
            elif dxftype == "LINE":
                return [{
                    "type": "LINE",
                    "start": (entity.dxf.start.x, entity.dxf.start.y),
                    "end": (entity.dxf.end.x, entity.dxf.end.y)
                }]
            elif dxftype == "ARC":
                center = entity.dxf.center
                radius = entity.dxf.radius
                start_angle = entity.dxf.start_angle
                end_angle = entity.dxf.end_angle
                
                # Calcula coordenadas globais de início e fim do arco
                x_start = center.x + radius * math.cos(math.radians(start_angle))
                y_start = center.y + radius * math.sin(math.radians(start_angle))
                x_end = center.x + radius * math.cos(math.radians(end_angle))
                y_end = center.y + radius * math.sin(math.radians(end_angle))
                
                return [{
                    "type": "ARC",
                    "center": (center.x, center.y),
                    "radius": radius,
                    "start_angle": start_angle,
                    "end_angle": end_angle,
                    "start": (x_start, y_start),
                    "end": (x_end, y_end)
                }]
            elif dxftype == "CIRCLE":
                center = entity.dxf.center
                return [{
                    "type": "CIRCLE",
                    "center": (center.x, center.y),
                    "radius": entity.dxf.radius
                }]
            return []

        # Extrai todas as primitivas geométricas
        primitives = []
        for entity in msp:
            primitives.extend(decompose(entity))

        # Inicializadores dos cálculos
        perimetro_total = 0.0
        furos = 0
        circles_count = 0

        # Bounding box limits
        min_x, max_x = float("inf"), float("-inf")
        min_y, max_y = float("inf"), float("-inf")

        def update_bounds(x: float, y: float):
            nonlocal min_x, max_x, min_y, max_y
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

        # Estrutura DSU (Disjoint Set Union) para contar caminhos contínuos de corte (entradas)
        parent = {}

        def find(p):
            if parent[p] != p:
                parent[p] = find(parent[p])
            return parent[p]

        def union(p1, p2):
            r1 = find(p1)
            r2 = find(p2)
            if r1 != r2:
                parent[r1] = r2

        # Arredondamento para tolerar imperfeições geométricas comuns no CAD (limite de 0.1 mm)
        def round_point(pt, tolerance=0.1):
            return (round(pt[0] / tolerance) * tolerance, round(pt[1] / tolerance) * tolerance)

        # Processamento geométrico das primitivas
        for prim in primitives:
            ptype = prim["type"]
            
            if ptype == "LINE":
                start = prim["start"]
                end = prim["end"]
                length = math.hypot(end[0] - start[0], end[1] - start[1])
                perimetro_total += length
                
                update_bounds(start[0], start[1])
                update_bounds(end[0], end[1])
                
                # Union endpoints in DSU
                p1 = round_point(start)
                p2 = round_point(end)
                if p1 not in parent: parent[p1] = p1
                if p2 not in parent: parent[p2] = p2
                union(p1, p2)

            elif ptype == "ARC":
                start = prim["start"]
                end = prim["end"]
                center = prim["center"]
                radius = prim["radius"]
                start_angle = prim["start_angle"]
                end_angle = prim["end_angle"]
                
                # Calcula comprimento do arco
                delta_angle = end_angle - start_angle
                if delta_angle < 0:
                    delta_angle += 360
                length = (delta_angle / 360.0) * (2 * math.pi * radius)
                perimetro_total += length
                
                update_bounds(start[0], start[1])
                update_bounds(end[0], end[1])
                
                # Atualiza limites para os quadrantes que o arco intercepta
                def angle_in_arc(a, s, e):
                    if s <= e:
                        return s <= a <= e
                    else:
                        return a >= s or a <= e
                for angle in [0, 90, 180, 270]:
                    if angle_in_arc(angle, start_angle, end_angle):
                        x = center[0] + radius * math.cos(math.radians(angle))
                        y = center[1] + radius * math.sin(math.radians(angle))
                        update_bounds(x, y)

                # Union endpoints in DSU
                p1 = round_point(start)
                p2 = round_point(end)
                if p1 not in parent: parent[p1] = p1
                if p2 not in parent: parent[p2] = p2
                union(p1, p2)

            elif ptype == "CIRCLE":
                center = prim["center"]
                radius = prim["radius"]
                length = 2 * math.pi * radius
                perimetro_total += length
                circles_count += 1
                furos += 1
                
                update_bounds(center[0] - radius, center[1] - radius)
                update_bounds(center[0] + radius, center[1] + radius)

        # Encontra a quantidade de contornos/caminhos conectados no DSU
        roots = set()
        for p in parent:
            roots.add(find(p))
        
        unique_components = len(roots)
        
        # O total de entradas/peckings é o número de contornos de linhas/arcos conectados + número de círculos
        entradas = unique_components + circles_count

        # Tratamento de desenho vazio
        if min_x == float("inf"):
            min_x, max_x, min_y, max_y = 0.0, 0.0, 0.0, 0.0

        largura = max_x - min_x
        comprimento = max_y - min_y
        area_m2 = (largura / 1000.0) * (comprimento / 1000.0)

        return {
            "perimetro": round(perimetro_total, 2),
            "num_entradas": max(1, entradas),
            "largura": round(largura, 2),
            "comprimento": round(comprimento, 2),
            "area": round(area_m2, 6),
            "furos": furos
        }
