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

    @staticmethod
    def process_file_content_split(file_bytes: bytes) -> list:
        """
        Lê o conteúdo binário de um arquivo DXF contendo múltiplas peças,
        individualiza cada peça via análise de componentes conectados,
        e retorna uma lista de dicionários de metadados geométricos para cada peça.
        """
        with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        try:
            doc = ezdxf.readfile(temp_path)
        except Exception as exc:
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

        def decompose(entity) -> list:
            dxftype = entity.dxftype()
            if dxftype in ("INSERT", "LWPOLYLINE", "POLYLINE"):
                prims = []
                try:
                    for sub_entity in entity.virtual_entities():
                        prims.extend(decompose(sub_entity))
                except Exception:
                    pass
                return prims
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

        # Separar primitivas de linhas/arcos e círculos
        line_arc_prims = []
        circle_prims = []
        for prim in primitives:
            if prim["type"] in ("LINE", "ARC"):
                line_arc_prims.append(prim)
            elif prim["type"] == "CIRCLE":
                circle_prims.append(prim)

        # DSU para agrupar linhas/arcos
        n_la = len(line_arc_prims)
        parent = list(range(n_la))

        def find(i):
            path = []
            while parent[i] != i:
                path.append(i)
                i = parent[i]
            for node in path:
                parent[node] = i
            return i

        def union(i, j):
            root_i = find(i)
            root_j = find(j)
            if root_i != root_j:
                parent[root_i] = root_j

        # Mapear coordenadas arredondadas
        coord_map = {}
        for idx, prim in enumerate(line_arc_prims):
            # Usar tolerância de 0.8 mm para unir caminhos próximos
            p1 = (round(prim["start"][0] / 0.8) * 0.8, round(prim["start"][1] / 0.8) * 0.8)
            p2 = (round(prim["end"][0] / 0.8) * 0.8, round(prim["end"][1] / 0.8) * 0.8)
            coord_map.setdefault(p1, []).append(idx)
            coord_map.setdefault(p2, []).append(idx)

        for idxs in coord_map.values():
            for k in range(1, len(idxs)):
                union(idxs[0], idxs[k])

        # Agrupar linhas/arcos por raiz
        components = {}
        for idx in range(n_la):
            root = find(idx)
            components.setdefault(root, []).append(line_arc_prims[idx])

        # Criar contornos (contours)
        contours = []
        for comp_prims in components.values():
            contours.append({
                "primitives": comp_prims,
                "is_circle": False
            })

        for circle in circle_prims:
            contours.append({
                "primitives": [circle],
                "is_circle": True
            })

        # Calcular bbox e área aproximada para cada contorno
        for contour in contours:
            min_x, max_x = float("inf"), float("-inf")
            min_y, max_y = float("inf"), float("-inf")

            def update_bounds(x: float, y: float):
                nonlocal min_x, max_x, min_y, max_y
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y

            for prim in contour["primitives"]:
                ptype = prim["type"]
                if ptype == "LINE":
                    update_bounds(prim["start"][0], prim["start"][1])
                    update_bounds(prim["end"][0], prim["end"][1])
                elif ptype == "ARC":
                    start = prim["start"]
                    end = prim["end"]
                    center = prim["center"]
                    radius = prim["radius"]
                    start_angle = prim["start_angle"]
                    end_angle = prim["end_angle"]

                    update_bounds(start[0], start[1])
                    update_bounds(end[0], end[1])

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
                elif ptype == "CIRCLE":
                    center = prim["center"]
                    radius = prim["radius"]
                    update_bounds(center[0] - radius, center[1] - radius)
                    update_bounds(center[0] + radius, center[1] + radius)

            contour["bbox"] = (min_x, max_x, min_y, max_y)
            contour["area"] = (max_x - min_x) * (max_y - min_y)

        # Filtrar contornos vazios
        contours = [c for c in contours if c["bbox"][0] != float("inf")]

        # Se nenhum contorno foi encontrado, retornar vazio
        if not contours:
            return []

        # Ordenar por área de bbox decrescente
        contours.sort(key=lambda c: c["area"], reverse=True)

        # Agrupar em peças (pieces). Se o centro de um contorno está dentro de outro contorno maior, é uma peça interna (furo)
        pieces = []
        for contour in contours:
            bbox_c = contour["bbox"]
            cx = (bbox_c[0] + bbox_c[1]) / 2
            cy = (bbox_c[2] + bbox_c[3]) / 2

            assigned = False
            for piece in pieces:
                bbox_p = piece["outer_contour"]["bbox"]
                if (bbox_p[0] <= cx <= bbox_p[1]) and (bbox_p[2] <= cy <= bbox_p[3]):
                    piece["inner_contours"].append(contour)
                    assigned = True
                    break

            if not assigned:
                pieces.append({
                    "outer_contour": contour,
                    "inner_contours": []
                })

        # Calcular estatísticas finais para cada peça
        results = []
        for piece in pieces:
            all_prims = list(piece["outer_contour"]["primitives"])
            for inner in piece["inner_contours"]:
                all_prims.extend(inner["primitives"])

            # Bounding box e dimensões
            p_min_x, p_max_x, p_min_y, p_max_y = piece["outer_contour"]["bbox"]
            largura = p_max_x - p_min_x
            comprimento = p_max_y - p_min_y

            # Área aproximada em m²
            area_m2 = (largura / 1000.0) * (comprimento / 1000.0)

            # Perímetro, furos e contornos internos
            perimetro_total = 0.0
            furos = 0
            entradas_count = 0

            if piece["outer_contour"]["is_circle"]:
                furos += 1
                entradas_count += 1
            else:
                entradas_count += 1

            for inner in piece["inner_contours"]:
                if inner["is_circle"]:
                    furos += 1
                    entradas_count += 1
                else:
                    entradas_count += 1

            for prim in all_prims:
                ptype = prim["type"]
                if ptype == "LINE":
                    start = prim["start"]
                    end = prim["end"]
                    perimetro_total += math.hypot(end[0] - start[0], end[1] - start[1])
                elif ptype == "ARC":
                    radius = prim["radius"]
                    start_angle = prim["start_angle"]
                    end_angle = prim["end_angle"]
                    delta_angle = end_angle - start_angle
                    if delta_angle < 0:
                        delta_angle += 360
                    perimetro_total += (delta_angle / 360.0) * (2 * math.pi * radius)
                elif ptype == "CIRCLE":
                    perimetro_total += 2 * math.pi * prim["radius"]

            # Ignorar peças de ruído ou contornos muito pequenos (por exemplo, < 1 mm de dimensão)
            if largura < 1.0 or comprimento < 1.0:
                continue

            results.append({
                "perimetro": round(perimetro_total, 2),
                "num_entradas": max(1, entradas_count),
                "largura": round(largura, 2),
                "comprimento": round(comprimento, 2),
                "area": round(area_m2, 6),
                "furos": furos
            })

        return results

