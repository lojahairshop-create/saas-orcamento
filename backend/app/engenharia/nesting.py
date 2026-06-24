"""
Algoritmo de Nesting (Bottom-Left Fill) para otimização do posicionamento de peças em chapas.
Organiza as peças para minimizar o desperdício de material.
"""

from typing import List, Dict, Any, Tuple


class NestingEngine:
    """Implementa o algoritmo Bottom-Left Fill (BLF) para nesting retangular."""

    @staticmethod
    def nested_rectangles(
        itens: List[Dict[str, Any]],
        chapa_l: float,
        chapa_c: float,
        gap: float = 5.0,
    ) -> Dict[str, Any]:
        """
        Executa o nesting de peças retangulares em uma ou mais chapas de tamanho chapa_l x chapa_c.
        
        Parâmetros:
        - itens: Lista de dicionários, cada um contendo:
            - id: Identificador/Índice do item
            - largura: largura em mm
            - comprimento: comprimento em mm
            - quantidade: quantidade de peças
        - chapa_l: Largura da chapa em mm
        - chapa_c: Comprimento da chapa em mm
        - gap: Espaçamento de segurança entre peças (mm)

        Retorna um dicionário com:
        - chapas: Lista de chapas utilizadas, cada uma contendo:
            - pecas: Lista de peças posicionadas (id, x, y, w, h, rotacionado)
            - aproveitamento: % de área ocupada pelas peças
        - total_chapas: Quantidade total de chapas necessárias
        - aproveitamento_medio: % média de aproveitamento de todas as chapas
        """
        # Expandir itens de acordo com a quantidade
        pecas_para_posicionar = []
        for it in itens:
            for _ in range(it.get("quantidade", 1)):
                pecas_para_posicionar.append({
                    "id": it.get("id"),
                    "w": float(it.get("largura", 0)),
                    "h": float(it.get("comprimento", 0)),
                    "area": float(it.get("largura", 0)) * float(it.get("comprimento", 0))
                })

        # Ordenar as peças por área de forma decrescente (Heurística clássica de Nesting)
        pecas_para_posicionar.sort(key=lambda x: x["area"], reverse=True)

        chapas_utilizadas = []

        def overlaps(r1: Tuple[float, float, float, float], r2: Tuple[float, float, float, float]) -> bool:
            """Verifica se dois retângulos (x, y, w, h) se sobrepõem, considerando o gap."""
            x1, y1, w1, h1 = r1
            x2, y2, w2, h2 = r2
            # Adiciona o gap para a verificação de sobreposição
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
                pontos_candidatos = chapa["pontos_candidatos"]
                pecas_posicionadas = chapa["pecas"]

                # Procurar o melhor ponto Bottom-Left
                melhor_ponto = None
                melhor_orientacao = None  # (w, h, rotacionado)
                menor_y_x = (float("inf"), float("inf"))

                for ponto in pontos_candidatos:
                    px, py = ponto

                    # Testar as duas orientações: normal e rotacionada 90°
                    for w, h, rot in [(w_original, h_original, False), (h_original, w_original, True)]:
                        # Verificar limites da chapa
                        if px + w <= chapa_l and py + h <= chapa_c:
                            novo_ret = (px, py, w, h)
                            # Verificar colisões com outras peças
                            colisao = False
                            for p_pos in pecas_posicionadas:
                                r_pos = (p_pos["x"], p_pos["y"], p_pos["w"], p_pos["h"])
                                if overlaps(novo_ret, r_pos):
                                    colisao = True
                                    break
                            
                            if not colisao:
                                # Prioridade Bottom-Left: menor Y, depois menor X
                                if py < menor_y_x[0] or (py == menor_y_x[0] and px < menor_y_x[1]):
                                    menor_y_x = (py, px)
                                    melhor_ponto = (px, py)
                                    melhor_orientacao = (w, h, rot)

                if melhor_ponto:
                    px, py = melhor_ponto
                    w, h, rot = melhor_orientacao

                    # Adicionar peça na chapa
                    nova_peca = {
                        "id": peca_id,
                        "x": px,
                        "y": py,
                        "w": w,
                        "h": h,
                        "rotacionado": rot
                    }
                    pecas_posicionadas.append(nova_peca)

                    # Atualizar pontos candidatos
                    pontos_candidatos.remove(melhor_ponto)
                    # Novos pontos: à direita da peça e acima da peça
                    pontos_candidatos.add((px + w + gap, py))
                    pontos_candidatos.add((px, py + h + gap))

                    posicionado = True
                    break

            # Se não coube em nenhuma chapa existente, abre uma nova chapa
            if not posicionado:
                # Criar nova chapa
                novas_pecas = []
                pontos_candidatos = {(0.0, 0.0)}

                # Tenta posicionar no ponto inicial (0,0) - se couber
                w, h, rot = w_original, h_original, False
                if w > chapa_l or h > chapa_c:
                    # Tenta rotacionar para caber
                    if h_original <= chapa_l and w_original <= chapa_c:
                        w, h, rot = h_original, w_original, True
                    else:
                        # Peça é maior que a chapa inteira! Coloca no ponto (0,0) estourando os limites
                        # (sinaliza erro visual ou corta fora)
                        w, h, rot = w_original, h_original, False

                nova_peca = {
                    "id": peca_id,
                    "x": 0.0,
                    "y": 0.0,
                    "w": w,
                    "h": h,
                    "rotacionado": rot
                }
                novas_pecas.append(nova_peca)

                pontos_candidatos.remove((0.0, 0.0))
                pontos_candidatos.add((w + gap, 0.0))
                pontos_candidatos.add((0.0, h + gap))

                chapas_utilizadas.append({
                    "pecas": novas_pecas,
                    "pontos_candidatos": pontos_candidatos
                })

        # Calcular estatísticas finais e aproveitamento de cada chapa
        area_chapa = chapa_l * chapa_c
        total_aproveitamento = 0.0

        chapas_resultado = []
        for ch in chapas_utilizadas:
            area_ocupada = sum(p["w"] * p["h"] for p in ch["pecas"])
            aproveitamento = round((area_ocupada / area_chapa) * 100, 2)
            total_aproveitamento += aproveitamento

            chapas_resultado.append({
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
