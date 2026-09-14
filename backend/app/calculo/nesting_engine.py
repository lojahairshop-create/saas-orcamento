from typing import List, Dict, Any, Tuple
import copy

class Nesting2DEngine:
    @staticmethod
    def otimizar_chapa_single_bin(
        pecas: List[Dict[str, Any]], 
        chapa_dim: Tuple[float, float],
        margem_corte: float = 5.0
    ) -> Dict[str, Any]:
        """
        Otimiza o arranjo de peças em uma única chapa usando a heurística MaxRects (Bottom-Left).
        
        :param pecas: Lista de dicionários, ex: [{'id': 1, 'largura': 300, 'comprimento': 400, 'quantidade': 2, 'permitir_rotacao': True, 'peso_unitario': 1.5}]
        :param chapa_dim: Tupla (largura, comprimento) da chapa.
        :param margem_corte: Gap/margem adicionada entre as peças e nas bordas.
        :return: Dicionário com resultados do posicionamento.
        """
        chapa_w, chapa_h = chapa_dim
        
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
