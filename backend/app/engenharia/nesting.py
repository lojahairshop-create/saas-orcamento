"""
Algoritmo de Nesting (Bottom-Left Fill) para otimização do posicionamento de peças em chapas.
Organiza as peças para minimizar o desperdício de material.
"""

from typing import List, Dict, Any, Tuple, Optional


class NestingEngine:
    """Implementa o algoritmo Bottom-Left Fill (BLF) para nesting retangular."""

    @staticmethod
    def nested_rectangles(
        itens: List[Dict[str, Any]],
        chapa_l: float,
        chapa_c: float,
        gap: float = 5.0,
        chapas_disponiveis: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Executa o nesting de peças retangulares em uma ou mais chapas,
        suportando chapas de estoque de tamanhos variáveis (retalhos/inteiras).
        """
        # Expandir itens de acordo com a quantidade
        pecas_para_posicionar = []
        for it in itens:
            for _ in range(it.get("quantidade", 1)):
                pecas_para_posicionar.append({
                    "id": it.get("id"),
                    "w": float(it.get("largura", 0)),
                    "h": float(it.get("comprimento", 0)),
                    "area": float(it.get("largura", 0)) * float(it.get("comprimento", 0)),
                    "vetor_svg": it.get("vetor_svg")
                })

        # Ordenar as peças por área de forma decrescente
        pecas_para_posicionar.sort(key=lambda x: x["area"], reverse=True)

        # Preparar os templates de chapas disponíveis
        sheet_templates = []
        if chapas_disponiveis:
            # Ordenar: retalhos primeiro (menores primeiro para aproveitar sobras), depois chapas inteiras
            remnants = [s for s in chapas_disponiveis if s.get("tipo_registro") == "retalho"]
            remnants.sort(key=lambda s: float(s["largura"]) * float(s["comprimento"]))
            
            full_sheets = [s for s in chapas_disponiveis if s.get("tipo_registro") == "inteira"]
            
            for r in remnants:
                for _ in range(r.get("quantidade", 1)):
                    sheet_templates.append({
                        "id": r["id"],
                        "largura": float(r["largura"]),
                        "comprimento": float(r["comprimento"]),
                        "tipo_registro": "retalho"
                    })
            for f in full_sheets:
                for _ in range(f.get("quantidade", 1)):
                    sheet_templates.append({
                        "id": f["id"],
                        "largura": float(f["largura"]),
                        "comprimento": float(f["comprimento"]),
                        "tipo_registro": "inteira"
                    })

        chapas_utilizadas = []

        def overlaps(r1: Tuple[float, float, float, float], r2: Tuple[float, float, float, float]) -> bool:
            """Verifica se dois retângulos (x, y, w, h) se sobrepõem, considerando o gap."""
            x1, y1, w1, h1 = r1
            x2, y2, w2, h2 = r2
            return not (
                x1 + w1 + gap <= x2 or
                x2 + w2 + gap <= x1 or
                y1 + h1 + gap <= y2 or
                y2 + h2 + gap <= y1
            )

        # Processar cada peça
        for peca in pecas_para_posicionar:
            w_original = peca["w"]
            h_original = peca["h"]
            peca_id = peca["id"]

            posicionado = False

            # Tenta posicionar nas chapas já abertas
            for chapa in chapas_utilizadas:
                cl = chapa["l"]
                cc = chapa["c"]
                pontos_candidatos = chapa["pontos_candidatos"]
                pecas_posicionadas = chapa["pecas"]

                melhor_ponto = None
                melhor_orientacao = None
                menor_y_x = (float("inf"), float("inf"))

                for ponto in pontos_candidatos:
                    px, py = ponto

                    # Testar as duas orientações: normal e rotacionada 90°
                    for w, h, rot in [(w_original, h_original, False), (h_original, w_original, True)]:
                        # Verificar limites usando o tamanho real desta chapa
                        if px + w <= cl and py + h <= cc:
                            novo_ret = (px, py, w, h)
                            colisao = False
                            for p_pos in pecas_posicionadas:
                                r_pos = (p_pos["x"], p_pos["y"], p_pos["w"], p_pos["h"])
                                if overlaps(novo_ret, r_pos):
                                    colisao = True
                                    break
                            
                            if not colisao:
                                if py < menor_y_x[0] or (py == menor_y_x[0] and px < menor_y_x[1]):
                                    menor_y_x = (py, px)
                                    melhor_ponto = (px, py)
                                    melhor_orientacao = (w, h, rot)

                if melhor_ponto:
                    px, py = melhor_ponto
                    w, h, rot = melhor_orientacao

                    nova_peca = {
                        "id": peca_id,
                        "x": px,
                        "y": py,
                        "w": w,
                        "h": h,
                        "rotacionado": rot,
                        "vetor_svg": peca.get("vetor_svg")
                    }
                    pecas_posicionadas.append(nova_peca)

                    pontos_candidatos.remove(melhor_ponto)
                    pontos_candidatos.add((px + w + gap, py))
                    pontos_candidatos.add((px, py + h + gap))

                    posicionado = True
                    break

            # Se não coube em nenhuma chapa existente, abre uma nova chapa
            if not posicionado:
                # Obter próximo template ou criar padrão
                if len(chapas_utilizadas) < len(sheet_templates):
                    template = sheet_templates[len(chapas_utilizadas)]
                    cl = template["largura"]
                    cc = template["comprimento"]
                    chapa_id = template["id"]
                    tipo_reg = template["tipo_registro"]
                    fora_de_estoque = False
                else:
                    cl = chapa_l
                    cc = chapa_c
                    chapa_id = "default"
                    tipo_reg = "inteira"
                    # Se havia templates configurados mas acabaram, significa que estourou o estoque
                    fora_de_estoque = True if chapas_disponiveis is not None else False

                novas_pecas = []
                pontos_candidatos = {(0.0, 0.0)}

                w, h, rot = w_original, h_original, False
                if w > cl or h > cc:
                    if h_original <= cl and w_original <= cc:
                        w, h, rot = h_original, w_original, True
                    else:
                        w, h, rot = w_original, h_original, False

                nova_peca = {
                    "id": peca_id,
                    "x": 0.0,
                    "y": 0.0,
                    "w": w,
                    "h": h,
                    "rotacionado": rot,
                    "vetor_svg": peca.get("vetor_svg")
                }
                novas_pecas.append(nova_peca)

                pontos_candidatos.remove((0.0, 0.0))
                pontos_candidatos.add((w + gap, 0.0))
                pontos_candidatos.add((0.0, h + gap))

                chapas_utilizadas.append({
                    "id": chapa_id,
                    "l": cl,
                    "c": cc,
                    "tipo_registro": tipo_reg,
                    "fora_de_estoque": fora_de_estoque,
                    "pecas": novas_pecas,
                    "pontos_candidatos": pontos_candidatos
                })

        # Calcular estatísticas finais
        total_aproveitamento = 0.0
        chapas_resultado = []
        for ch in chapas_utilizadas:
            area_chapa = ch["l"] * ch["c"]
            area_ocupada = sum(p["w"] * p["h"] for p in ch["pecas"])
            aproveitamento = round((area_ocupada / area_chapa) * 100, 2)
            total_aproveitamento += aproveitamento

            chapas_resultado.append({
                "id": ch["id"],
                "l": ch["l"],
                "c": ch["c"],
                "tipo_registro": ch["tipo_registro"],
                "fora_de_estoque": ch["fora_de_estoque"],
                "pecas": ch["pecas"],
                "aproveitamento": aproveitamento
            })

        total_chapas = len(chapas_resultado)
        aproveitamento_medio = (
            round(total_aproveitamento / total_chapas, 2) if total_chapas > 0 else 0.0
        )

        return {
            "chapas": chapas_resultado,
            "total_chapas": total_chapas,
            "aproveitamento_medio": aproveitamento_medio
        }
