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
