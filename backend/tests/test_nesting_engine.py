import pytest
from app.calculo.nesting_engine import Nesting2DEngine

def test_single_piece_without_rotation():
    pecas = [
        {'id': 'A', 'largura': 200, 'comprimento': 300, 'quantidade': 1, 'permitir_rotacao': False}
    ]
    # Chapa 1000x1000
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, (1000, 1000), margem_corte=10)
    
    assert len(res['pecas_posicionadas']) == 1
    p = res['pecas_posicionadas'][0]
    assert p['w'] == 200
    assert p['h'] == 300
    assert p['rotacionado'] is False
    
    # Com margem de 10, usa 210x310.
    # Área usada na métrica final pode ser apenas da peça em si ou com margem?
    # O código conta área da peça, ou seja, 200*300 = 60000 mm2 = 0.06 m2
    assert res['area_usada_m2'] == 0.06

def test_rotation_lock():
    # Peça 300x500 não cabe numa chapa 400x400 sem rotacionar
    # Mas se rotacionar também não cabe.
    # Vamos usar chapa de 600x400 e peça 300x500.
    # Se não puder rotacionar, (w=300, h=500). Com margem 5: 305x505.
    # O comprimento 505 não cabe em 400.
    
    peca_nao_rotaciona = {'id': 'A', 'largura': 300, 'comprimento': 500, 'quantidade': 1, 'permitir_rotacao': False}
    res_f = Nesting2DEngine.otimizar_chapa_single_bin([peca_nao_rotaciona], (600, 400), margem_corte=5)
    assert len(res_f['pecas_posicionadas']) == 0
    assert len(res_f['pecas_nao_posicionadas']) == 1
    
    # Se puder rotacionar: vira h=300, w=500.
    # Com margem 5: 505 x 305. Cabe em 600x400!
    peca_rotaciona = {'id': 'A', 'largura': 300, 'comprimento': 500, 'quantidade': 1, 'permitir_rotacao': True}
    res_t = Nesting2DEngine.otimizar_chapa_single_bin([peca_rotaciona], (600, 400), margem_corte=5)
    
    assert len(res_t['pecas_posicionadas']) == 1
    assert len(res_t['pecas_nao_posicionadas']) == 0
    assert res_t['pecas_posicionadas'][0]['rotacionado'] is True

def test_multiple_pieces_and_scrap():
    # Duas peças de 100x100, chapa 200x200, gap = 0
    pecas = [
        {'id': 'P1', 'largura': 100, 'comprimento': 100, 'quantidade': 2, 'permitir_rotacao': False}
    ]
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, (200, 200), margem_corte=0)
    
    assert len(res['pecas_posicionadas']) == 2
    # Ocupam 20.000 de 40.000 mm2
    assert res['aproveitamento_percentual'] == 50.0
    
    # Verifica os retângulos livres (deve sobrar algo que some 20.000)
    livres = res['retangulos_livres']
    area_livre = sum(r['w'] * r['h'] for r in livres)
    # A área dos retângulos livres não se soma diretamente se houver sobreposição, mas o algoritmo remove totalmente contidos.
    # Em um Bottom-Left com split maxrects perfeito:
    # 1ª peça: (0,0,100,100). Sobras: Right(100,0,100,200), Top(0,100,200,100)
    # 2ª peça vai tentar Y menor (0), logo entra na Right(100,0,100,100).
    # Sobras pós 2ª peça: Top(0,100,200,100). (Área exata 20000)
    
    assert any(r['w'] == 200 and r['h'] == 100 for r in livres) or any(r['w'] == 100 and r['h'] == 200 for r in livres)
    
def test_rateio_custo():
    pecas = [
        {'id': 'A', 'largura': 100, 'comprimento': 100, 'quantidade': 1}, # area 10.000
        {'id': 'B', 'largura': 100, 'comprimento': 200, 'quantidade': 1}  # area 20.000
    ]
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, (1000, 1000), margem_corte=0)
    
    # Area total usada = 30.000
    rateio = res['rateio_custo_pecas']
    
    # A deve custar ~33.3% do material usado, B ~66.6%
    assert abs(rateio['A'] - (10000 / 30000)) < 0.001
    assert abs(rateio['B'] - (20000 / 30000)) < 0.001

from shapely.geometry import box
from shapely.ops import unary_union

def check_no_overlap(pecas_posicionadas):
    # Cria uma lista de geometrias (shapely) para cada peça
    geoms = []
    for p in pecas_posicionadas:
        geoms.append(box(p['x'], p['y'], p['x'] + p['w'], p['y'] + p['h']))
    
    # Verifica todos os pares
    for i in range(len(geoms)):
        for j in range(i + 1, len(geoms)):
            # Interseção deve ter área zero (podem se tocar nas bordas, mas não sobrepor)
            inter = geoms[i].intersection(geoms[j])
            assert inter.area == 0.0, f"Peças se sobrepõem! {pecas_posicionadas[i]} e {pecas_posicionadas[j]}"

def test_invariant_no_overlap():
    # Stress test com várias peças pequenas em uma chapa maior
    pecas = [
        {'id': 'P1', 'largura': 30, 'comprimento': 40, 'quantidade': 15, 'permitir_rotacao': True},
        {'id': 'P2', 'largura': 50, 'comprimento': 50, 'quantidade': 10, 'permitir_rotacao': False},
        {'id': 'P3', 'largura': 15, 'comprimento': 80, 'quantidade': 20, 'permitir_rotacao': True}
    ]
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, (500, 500), margem_corte=2.0)
    
    # Invariante: nenhuma peça posicionada pode se sobrepor
    # Atenção: a caixa posicionada para fins de ocupação física (com margem) foi usada no engine,
    # Mas o engine retorna p['w'] e p['h'] da *peça em si*. 
    # A margem ficou "no ar" na frente/cima da peça. 
    # Precisamos validar a caixa ocupada real (w + gap, h + gap) caso o gap aplique entre elas.
    # Como o engine não retorna a caixa bruta ocupada, vamos testar apenas as peças em si, 
    # mas o ideal seria reconstruir a caixa ocupada. O gap do engine está a mais no H e W interno.
    # Vamos validar pelo menos se as caixas retornadas não se sobrepõem.
    check_no_overlap(res['pecas_posicionadas'])

def test_invariant_area_conservation():
    pecas = [
        {'id': 'P1', 'largura': 100, 'comprimento': 150, 'quantidade': 3, 'permitir_rotacao': False},
        {'id': 'P2', 'largura': 80, 'comprimento': 80, 'quantidade': 5, 'permitir_rotacao': True}
    ]
    chapa_dim = (400, 400)
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, chapa_dim, margem_corte=5.0)
    
    area_chapa = chapa_dim[0] * chapa_dim[1]
    
    # Área usada ocupada: inclui as margens no motor. 
    # No motor: best_rect['w'] e ['h'] continham as margens.
    # As peças retornadas não incluem as margens.
    # A área dos retângulos livres usando MaxRects contém sobreposições.
    # Para validar a conservação, a União(espaço ocupado pelas peças com margem) + União(retângulos livres) deve ser = área da chapa.
    # O motor internamente dividiu free_rectangles baseado em caixas de `(x, y, w+gap, h+gap)`.
    
    livres_geoms = [box(r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']) for r in res['retangulos_livres']]
    uniao_livres = unary_union(livres_geoms)
    area_livres_real = uniao_livres.area
    
    # O espaço exato que o motor considerou ocupado. O `area_usada_m2` retornou apenas a soma WxH, não a do corte.
    # No engine, `area_usada_total += (w * h)` apenas da peça. O espaço de corte "sumiu".
    # Então a área usada relatada + área dos espaços livres não soma a área da chapa.
    # Para testar a invariante do algoritmo (MaxRects), devemos montar a caixa de corte ocupada de cada peça.
    geoms_ocupadas = []
    for p in res['pecas_posicionadas']:
        # O motor ocupou: w+margem se normal, ou h+margem e rotacionou.
        # No motor: final_w = h + margem se rotacionado. O x, y está lá.
        margem = 5.0
        # A peça tem (p['w'], p['h']). O espaço ocupado foi (p['w']+margem, p['h']+margem).
        gw = p['w'] + margem
        gh = p['h'] + margem
        geoms_ocupadas.append(box(p['x'], p['y'], p['x'] + gw, p['y'] + gh))
        
    uniao_ocupadas = unary_union(geoms_ocupadas)
    
    area_total_coberta = uniao_ocupadas.area + area_livres_real
    # Diferença deve ser irrisória
    assert abs(area_total_coberta - area_chapa) < 0.1, f"Área de conservação falhou! Coberta {area_total_coberta} != chapa {area_chapa}"

def test_invariant_oversized_piece():
    # Peça maior que a chapa
    pecas = [
        {'id': 'GG', 'largura': 2000, 'comprimento': 2000, 'quantidade': 1, 'permitir_rotacao': True}
    ]
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, (1200, 1500), margem_corte=0)
    
    assert len(res['pecas_posicionadas']) == 0
    assert len(res['pecas_nao_posicionadas']) == 1

def test_invariant_exact_fit():
    # Encaixe exato
    pecas = [
        {'id': 'P1', 'largura': 500, 'comprimento': 500, 'quantidade': 4, 'permitir_rotacao': False}
    ]
    res = Nesting2DEngine.otimizar_chapa_single_bin(pecas, (1000, 1000), margem_corte=0)
    
    assert len(res['pecas_posicionadas']) == 4
    assert len(res['pecas_nao_posicionadas']) == 0
    
    # Todos os retângulos livres devem ser menores ou iguais a zero (ou seja, lista vazia ou retângulos de área zero)
    area_livres = sum(r['w'] * r['h'] for r in res['retangulos_livres'])
    assert area_livres == 0, f"Deveria ter área livre zero num fit exato, encontrou retângulos: {res['retangulos_livres']}"
