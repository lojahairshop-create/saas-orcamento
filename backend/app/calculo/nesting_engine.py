from typing import List, Dict, Any, Tuple
import copy
from backend.app.calculo.true_shape.orchestrator import TrueShapeOrchestrator, TRUE_SHAPE_ENABLED

class Nesting2DEngine:
    @staticmethod
    def _map_true_shape_to_legacy(ts_result, pecas_individuais, chapa_w, chapa_h):
        # Build positioned pieces
        pecas_posicionadas = []
        placed_ids = set()
        
        # map placements
        for pl in ts_result.placements:
            # Reconstruct original dict info
            # Our ID was original_id + _ + index. 
            # E.g. "peca_1" from "peca" index 1.
            orig_id = pl.part_id.rsplit('_', 1)[0]
            
            # Find the first matching peca that hasn't been placed yet
            # It's a bit tricky because we lost the original reference.
            # But we can just use the original pecas_individuais list
            # We'll match by the exact part_id we sent.
            for original_p in pecas_individuais:
                p_id = str(original_p.get("id", "0"))
                # To match correctly, we would need to know the exact generated ID.
                pass
                
        # Actually, let's just do a simpler mapping.
        # It's better to inject it carefully.
        pass

    @staticmethod
    def otimizar_chapa_single_bin(
        pecas: List[Dict[str, Any]], 
        chapa_dim: Tuple[float, float],
        margem_corte: float = 5.0
    ) -> Dict[str, Any]:
        """
        Otimiza o arranjo de peças em uma única chapa usando a heurística MaxRects (Bottom-Left).
        Ou True Shape se habilitado via feature flag.
        """
        chapa_w, chapa_h = chapa_dim
        
        if TRUE_SHAPE_ENABLED:
            print("[TRUE SHAPE] Feature flag ON. Tentando TrueShapeOrchestrator...")
            ts_res = TrueShapeOrchestrator.execute(pecas, chapa_dim, margem_corte)
            
            if ts_res.status == "SUCCESS":
                print(f"[TRUE SHAPE] Sucesso! Placements: {len(ts_res.placements)}")
                # Map to legacy
                # Desempacotar peças
                pecas_individuais = []
                for p in pecas:
                    qtd = p.get('quantidade', 1)
                    for i in range(qtd):
                        cp = copy.deepcopy(p)
                        cp["ts_id"] = f"{p.get('id', 'peca')}_{i}"
                        pecas_individuais.append(cp)
                        
                pecas_posicionadas = []
                placed_ts_ids = {pl.part_id for pl in ts_res.placements}
                
                area_usada_total = 0.0
                for pl in ts_res.placements:
                    # Find original
                    orig_p = next(p for p in pecas_individuais if p["ts_id"] == pl.part_id)
                    w = float(orig_p.get("largura", 0))
                    h = float(orig_p.get("comprimento", 0))
                    area_usada_total += (w * h)
                    
                    orig_p.update({
                        'x': pl.x,
                        'y': pl.y,
                        'w': w,
                        'h': h,
                        'rotacionado': pl.rotation != 0.0
                    })
                    pecas_posicionadas.append(orig_p)
                    
                pecas_nao_posicionadas = []
                for p in pecas_individuais:
                    if p["ts_id"] not in placed_ts_ids:
                        pecas_nao_posicionadas.append(p)
                        
                area_total_chapa = chapa_w * chapa_h
                aproveitamento_percentual = ts_res.utilization
                
                rateio_custo_pecas = {}
                for i, p in enumerate(pecas_posicionadas):
                    area_peca = p['w'] * p['h']
                    fator = area_peca / area_usada_total if area_usada_total > 0 else 0
                    peca_id = p.get('id', f'peca_{i}')
                    rateio_custo_pecas[peca_id] = rateio_custo_pecas.get(peca_id, 0) + fator
                    
                return {
                    'pecas_posicionadas': pecas_posicionadas,
                    'pecas_nao_posicionadas': pecas_nao_posicionadas,
                    'aproveitamento_percentual': aproveitamento_percentual,
                    'area_usada_m2': area_usada_total / 1_000_000,
                    'area_sobra_m2': (area_total_chapa - area_usada_total) / 1_000_000,
                    'retangulos_livres': [], # TrueShape does not produce free max rects
                    'rateio_custo_pecas': rateio_custo_pecas,
                    'engine_used': 'TrueShape'
                }
            else:
                print(f"[TRUE SHAPE] Falhou com status {ts_res.status}. Fallback para BoundingBox.")
        
        
        # Desempacotar peças considerando 'quantidade'
        pecas_individuais = []
        for p in pecas:
            qtd = p.get('quantidade', 1)
            for _ in range(qtd):
                pecas_individuais.append(copy.deepcopy(p))
                
        # Ordenar peças por área decrescente (heurística comum para bin packing)
        pecas_individuais.sort(key=lambda p: p['largura'] * p['comprimento'], reverse=True)
        
        # Inicializa lista de retângulos livres. Começa com a chapa inteira.
        free_rectangles = [{'x': 0, 'y': 0, 'w': chapa_w, 'h': chapa_h}]
        
        pecas_posicionadas = []
        pecas_nao_posicionadas = []
        
        area_usada_total = 0.0
        
        def fit_piece(w_needed, h_needed):
            # Bottom-Left: procurar o retângulo livre com menor Y, depois menor X
            best_rect = None
            best_y = float('inf')
            best_x = float('inf')
            
            for fr in free_rectangles:
                if fr['w'] >= w_needed and fr['h'] >= h_needed:
                    if fr['y'] < best_y or (fr['y'] == best_y and fr['x'] < best_x):
                        best_rect = fr
                        best_y = fr['y']
                        best_x = fr['x']
            return best_rect
        
        def split_free_rectangles(placed_rect):
            px, py, pw, ph = placed_rect['x'], placed_rect['y'], placed_rect['w'], placed_rect['h']
            new_free = []
            
            # Para cada retângulo livre, se houver interseção, divide
            for fr in free_rectangles:
                fx, fy, fw, fh = fr['x'], fr['y'], fr['w'], fr['h']
                
                # Checar se há interseção
                if px < fx + fw and px + pw > fx and py < fy + fh and py + ph > fy:
                    # Dividir em até 4 retângulos menores
                    # Top
                    if py + ph < fy + fh:
                        new_free.append({'x': fx, 'y': py + ph, 'w': fw, 'h': fy + fh - (py + ph)})
                    # Bottom
                    if py > fy:
                        new_free.append({'x': fx, 'y': fy, 'w': fw, 'h': py - fy})
                    # Left
                    if px > fx:
                        new_free.append({'x': fx, 'y': fy, 'w': px - fx, 'h': fh})
                    # Right
                    if px + pw < fx + fw:
                        new_free.append({'x': px + pw, 'y': fy, 'w': fx + fw - (px + pw), 'h': fh})
                else:
                    new_free.append(fr)
                    
            # Remover retângulos que estão totalmente contidos em outros
            filtered_free = []
            for i, r1 in enumerate(new_free):
                is_contained = False
                for j, r2 in enumerate(new_free):
                    if i != j:
                        if r1['x'] >= r2['x'] and r1['y'] >= r2['y'] and \
                           r1['x'] + r1['w'] <= r2['x'] + r2['w'] and \
                           r1['y'] + r1['h'] <= r2['y'] + r2['h']:
                            is_contained = True
                            break
                if not is_contained:
                    filtered_free.append(r1)
            
            return filtered_free

        for peca in pecas_individuais:
            w = peca['largura']
            h = peca['comprimento']
            permitir_rotacao = peca.get('permitir_rotacao', False)
            
            # Dimensões reais a ocupar (inclui margem de corte). 
            # Assumimos margem apenas na direita e topo de cada peça, exceto bordas?
            # Na verdade, a forma mais fácil é considerar a margem somada ao tamanho da peça,
            # e a chapa começa "maior" ou a gente só soma margem.
            # Para simplificar: cada peça ocupa w + margem, h + margem.
            # Mas se a peça tocar a borda direita/topo da chapa, não precisaria de margem lá.
            # Como segurança, somamos a margem_corte em todas.
            w_needed = w + margem_corte
            h_needed = h + margem_corte
            
            # Tentar encaixar sem rotacionar
            best_rect_normal = fit_piece(w_needed, h_needed)
            
            best_rect_rot = None
            if permitir_rotacao:
                # Tentar encaixar rotacionado
                best_rect_rot = fit_piece(h_needed, w_needed)
                
            # Escolher a melhor orientação (aquela que coloca a peça mais para baixo-esquerda)
            placed = False
            rotacionado = False
            
            best_rect = None
            final_w, final_h = w_needed, h_needed
            
            if best_rect_normal and not best_rect_rot:
                best_rect = best_rect_normal
            elif best_rect_rot and not best_rect_normal:
                best_rect = best_rect_rot
                rotacionado = True
                final_w, final_h = h_needed, w_needed
            elif best_rect_normal and best_rect_rot:
                # Ambas cabem, escolher a que fica com menor Y, ou menor X
                if best_rect_normal['y'] < best_rect_rot['y'] or (best_rect_normal['y'] == best_rect_rot['y'] and best_rect_normal['x'] <= best_rect_rot['x']):
                    best_rect = best_rect_normal
                else:
                    best_rect = best_rect_rot
                    rotacionado = True
                    final_w, final_h = h_needed, w_needed
                    
            if best_rect:
                x = best_rect['x']
                y = best_rect['y']
                
                # Posiciona a peça
                peca_pos = copy.deepcopy(peca)
                peca_pos.update({
                    'x': x,
                    'y': y,
                    'w': w if not rotacionado else h,
                    'h': h if not rotacionado else w,
                    'rotacionado': rotacionado
                })
                pecas_posicionadas.append(peca_pos)
                
                area_usada_total += (w * h)
                
                # O espaço OCUPADO para fins de corte inclui a margem
                placed_rect = {'x': x, 'y': y, 'w': final_w, 'h': final_h}
                free_rectangles = split_free_rectangles(placed_rect)
            else:
                pecas_nao_posicionadas.append(peca)
                
        area_total_chapa = chapa_w * chapa_h
        area_usada_m2 = area_usada_total / 1_000_000
        area_sobra_m2 = (area_total_chapa - area_usada_total) / 1_000_000
        aproveitamento_percentual = (area_usada_total / area_total_chapa) * 100 if area_total_chapa > 0 else 0
        
        # Calcular rateio de custo (proporcional à área da peça)
        # Se ratear 100% da chapa (incluindo retalhos e perda) proporcionalmente à área de cada peça posicionada:
        # rateio_fator = área da peça / área total usada.
        rateio_custo_pecas = {}
        for i, p in enumerate(pecas_posicionadas):
            area_peca = p['w'] * p['h']
            fator = area_peca / area_usada_total if area_usada_total > 0 else 0
            # Usar o ID ou um índice caso id não exista.
            peca_id = p.get('id', f'peca_{i}')
            # Agrupa se a mesma peça aparece múltiplas vezes
            rateio_custo_pecas[peca_id] = rateio_custo_pecas.get(peca_id, 0) + fator

        return {
            'pecas_posicionadas': pecas_posicionadas,
            'pecas_nao_posicionadas': pecas_nao_posicionadas,
            'aproveitamento_percentual': aproveitamento_percentual,
            'area_usada_m2': area_usada_m2,
            'area_sobra_m2': area_sobra_m2,
            'retangulos_livres': free_rectangles,
            'rateio_custo_pecas': rateio_custo_pecas
        }

    @classmethod
    def otimizar_lote_multi_bin(
        cls,
        pecas: List[Dict[str, Any]],
        retalhos_disponiveis: List[Dict[str, Any]],
        chapa_padrao: Tuple[float, float],
        margem_corte: float = 5.0
    ) -> Dict[str, Any]:
        """
        Orquestra o empacotamento em múltiplos bins (retalhos e chapas novas).
        Retalhos disponíveis são tentados primeiro usando Best-Fit (menor área primeiro).
        Se restarem peças, chapas novas padrão são abertas sequencialmente.
        
        :param pecas: Lista de peças a produzir.
        :param retalhos_disponiveis: Lista de dicionários [{'id': uuid, 'largura': w, 'comprimento': h, 'valor_contabil': v}]
        :param chapa_padrao: Dimensões da chapa inteira (largura, comprimento) para quando acabarem os retalhos.
        :return: Resultado multi-bin mapeando peças para os bins, e métricas gerais.
        """
        # Ordenar retalhos do menor para o maior (Best-Fit)
        retalhos = sorted(
            retalhos_disponiveis, 
            key=lambda r: r['largura'] * r['comprimento']
        )
        
        pecas_restantes = copy.deepcopy(pecas)
        bins_utilizados = []
        
        # 1. Tentar alocar nos retalhos disponíveis
        for retalho in retalhos:
            if not pecas_restantes:
                break
                
            # Dimensão do retalho
            dim = (retalho['largura'], retalho['comprimento'])
            
            # Roda o nesting no retalho
            res = cls.otimizar_chapa_single_bin(pecas_restantes, dim, margem_corte)
            
            if res['pecas_posicionadas']:
                # Se alocou pelo menos uma peça, contabiliza este retalho como utilizado
                bin_info = {
                    'tipo': 'retalho',
                    'id': retalho.get('id'),
                    'dimensao': dim,
                    'valor_original': retalho.get('valor_contabil', 0),
                    'nesting_result': res
                }
                bins_utilizados.append(bin_info)
                # Atualiza a lista de peças restantes
                pecas_restantes = res['pecas_nao_posicionadas']
                
        # 2. Tentar alocar em chapas novas caso ainda restem peças
        chapas_abertas = 0
        while pecas_restantes:
            chapas_abertas += 1
            res = cls.otimizar_chapa_single_bin(pecas_restantes, chapa_padrao, margem_corte)
            
            # Se não alocou NENHUMA peça na chapa virgem, significa que existe alguma peça 
            # MAIOR que a chapa padrão (oversized). Para evitar loop infinito, abortamos essa peça.
            if not res['pecas_posicionadas']:
                # A primeira peça da lista restante é definitivamente grande demais.
                # Removemos ela para poder tentar o resto.
                peca_gigante = pecas_restantes.pop(0)
                # Opcional: registrar que a peça_gigante falhou.
                continue
                
            bin_info = {
                'tipo': 'chapa_nova',
                'id': f'nova_chapa_{chapas_abertas}',
                'dimensao': chapa_padrao,
                'valor_original': 0, # Será calculado na service com o preço do material
                'nesting_result': res
            }
            bins_utilizados.append(bin_info)
            pecas_restantes = res['pecas_nao_posicionadas']
            
        return {
            'bins_utilizados': bins_utilizados,
            'pecas_nao_suportadas': pecas_restantes # Vazio no caso ideal
        }
