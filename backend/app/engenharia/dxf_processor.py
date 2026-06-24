"""
Módulo para processamento de arquivos DXF/CAD usando a biblioteca ezdxf.
Extrai perímetro total de corte, quantidade de furos, bounding box (largura e comprimento) e área aproximada.
"""

import math
import ezdxf
from typing import Dict, Any, Tuple


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
        """
        try:
            # 1. Verifica se é um arquivo binário pelo sentinel
            if file_bytes.startswith(b"AutoCAD Binary DXF\r\n\x1a\x00"):
                from ezdxf.lldxf.tagger import binary_tags_loader
                from ezdxf.document import Drawing
                loader = binary_tags_loader(file_bytes, errors="surrogateescape")
                doc = Drawing.load(loader)
            else:
                # 2. Se for ASCII, tentamos decodificar e ler com ezdxf.read()
                import io
                try:
                    text_stream = io.StringIO(file_bytes.decode("utf-8", errors="surrogateescape"))
                    doc = ezdxf.read(text_stream)
                except Exception:
                    # Se falhar com UTF-8, tentamos CP1252/latin-1
                    text_stream = io.StringIO(file_bytes.decode("cp1252", errors="ignore"))
                    doc = ezdxf.read(text_stream)
        except Exception as exc:
            # 3. Se falhar, tentamos recuperar usando o recover module que aceita BytesIO diretamente
            try:
                import io
                from ezdxf import recover
                binary_stream = io.BytesIO(file_bytes)
                doc, auditor = recover.read(binary_stream)
            except Exception as rec_exc:
                raise ValueError(f"Falha ao ler arquivo DXF: {str(exc)} (Recuperação também falhou: {str(rec_exc)})")

        msp = doc.modelspace()
        
        perimetro_total = 0.0
        furos = 0
        entradas = 0

        # Para cálculo do Bounding Box
        min_x, max_x = float("inf"), float("-inf")
        min_y, max_y = float("inf"), float("-inf")

        def update_bounds(x: float, y: float):
            nonlocal min_x, max_x, min_y, max_y
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

        # Iterar sobre entidades geométricas
        for entity in msp:
            dxftype = entity.dxftype()

            if dxftype == "LINE":
                start = entity.dxf.start
                end = entity.dxf.end
                length = math.hypot(end.x - start.x, end.y - start.y)
                perimetro_total += length
                update_bounds(start.x, start.y)
                update_bounds(end.x, end.y)

            elif dxftype == "CIRCLE":
                radius = entity.dxf.radius
                center = entity.dxf.center
                length = 2 * math.pi * radius
                perimetro_total += length
                furos += 1
                entradas += 1  # Cada círculo é um furo que precisa de uma entrada/peck
                # Bounds do círculo
                update_bounds(center.x - radius, center.y - radius)
                update_bounds(center.x + radius, center.y + radius)

            elif dxftype == "ARC":
                radius = entity.dxf.radius
                start_angle = entity.dxf.start_angle
                end_angle = entity.dxf.end_angle
                center = entity.dxf.center
                
                # Delta angle em graus
                delta_angle = end_angle - start_angle
                if delta_angle < 0:
                    delta_angle += 360
                
                length = (delta_angle / 360.0) * (2 * math.pi * radius)
                perimetro_total += length
                
                # Para limites simplificados do ARC, usamos o centro +/- raio e pontos iniciais/finais
                update_bounds(center.x, center.y)  # Apenas para garantir que esteja mapeado
                # Calcular pontas do arco
                x_start = center.x + radius * math.cos(math.radians(start_angle))
                y_start = center.y + radius * math.sin(math.radians(start_angle))
                x_end = center.x + radius * math.cos(math.radians(end_angle))
                y_end = center.y + radius * math.sin(math.radians(end_angle))
                update_bounds(x_start, y_start)
                update_bounds(x_end, y_end)

            elif dxftype in ("LWPOLYLINE", "POLYLINE"):
                points = []
                # lwpolyline vértices
                for vertex in entity.get_points(format="xy"):
                    points.append(vertex)
                    update_bounds(vertex[0], vertex[1])
                
                if len(points) > 1:
                    poly_len = 0.0
                    for i in range(len(points) - 1):
                        p1 = points[i]
                        p2 = points[i+1]
                        poly_len += math.hypot(p2[0] - p1[0], p2[1] - p1[1])
                    
                    if entity.is_closed:
                        p1 = points[-1]
                        p2 = points[0]
                        poly_len += math.hypot(p2[0] - p1[0], p2[1] - p1[1])
                        entradas += 1  # Caminho fechado é uma entrada de corte
                    
                    perimetro_total += poly_len

            elif dxftype == "SPLINE":
                # Splines podem ser avaliadas usando pontos de controle como aproximação
                control_points = list(entity.control_points)
                if control_points:
                    spline_len = 0.0
                    for i in range(len(control_points) - 1):
                        p1 = control_points[i]
                        p2 = control_points[i+1]
                        spline_len += math.hypot(p2[0] - p1[0], p2[1] - p1[1])
                        update_bounds(p1[0], p1[1])
                    update_bounds(control_points[-1][0], control_points[-1][1])
                    
                    if entity.is_closed:
                        p1 = control_points[-1]
                        p2 = control_points[0]
                        spline_len += math.hypot(p2[0] - p1[0], p2[1] - p1[1])
                        entradas += 1
                        
                    perimetro_total += spline_len

        # Caso não tenhamos nenhuma geometria cadastrada
        if min_x == float("inf"):
            min_x, max_x, min_y, max_y = 0.0, 0.0, 0.0, 0.0

        largura = max_x - min_x
        comprimento = max_y - min_y

        # Se não houver entradas computadas mas houver perímetro, assumimos pelo menos 1 entrada (a peça externa)
        if entradas == 0 and perimetro_total > 0:
            entradas = 1

        # Conversão de área de bounding box (mm² para m²)
        area_m2 = (largura / 1000.0) * (comprimento / 1000.0)

        return {
            "perimetro": round(perimetro_total, 2),
            "num_entradas": max(1, entradas),
            "largura": round(largura, 2),
            "comprimento": round(comprimento, 2),
            "area": round(area_m2, 6),
            "furos": furos
        }
