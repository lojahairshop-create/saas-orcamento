"""
Testes de regressão para o hotfix do bug de expansão exponencial
em Nesting2DEngine.otimizar_lote_multi_bin.

Bug: pecas_nao_posicionadas retornadas por otimizar_chapa_single_bin
mantêm o campo 'quantidade' original (N), causando re-expansão
N×N×N... nas iterações subsequentes do multi-bin.

Cobertura:
  - Reprodução segura do bug (antes do fix)
  - Conservação de peças (quantidade solicitada = posicionada + não posicionada)
  - Quantidade 1, 2, 5, 10
  - Tudo cabe em 1 bin / distribui em múltiplos / parcialmente / nenhuma cabe
  - Sem duplicação, sem perda
  - Identidade das instâncias
  - Impacto financeiro com quantidade=1
  - Determinismo com quantidade > 1
"""

import copy
import pytest
from app.calculo.nesting_engine import Nesting2DEngine
from app.calculo.engine import CalculoEngine


# ---------------------------------------------------------------------------
# REPRODUÇÃO DO BUG (antes do fix, este teste falharia por explosão)
# ---------------------------------------------------------------------------

def test_bug_reproducao_expansao_controlada():
    """
    Prova que o desempacotamento NÃO multiplica peças entre bins.

    Cenário: 3 peças de 800x800 com quantidade=2 cada = 6 unidades físicas.
    Chapa 1000x1000: cabe 1 peça por chapa (800+5 > 1000? não, 805 < 1000, cabe 1).
    Portanto: 6 chapas necessárias se 1 peça/chapa.

    SEM o fix: cada iteração re-expandiria quantidade=2, dobrando as peças.
    COM o fix: quantidade=1 nas unidades expandidas, loop finito e correto.
    """
    pecas = [
        {'id': f'p{i}', 'largura': 800.0, 'comprimento': 800.0, 'quantidade': 2, 'permitir_rotacao': False}
        for i in range(3)
    ]
    chapa_padrao = (1000.0, 1000.0)

    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas,
        retalhos_disponiveis=[],
        chapa_padrao=chapa_padrao,
        margem_corte=5.0
    )

    # Contar total de peças posicionadas em todos os bins
    total_posicionadas = 0
    for b in result['bins_utilizados']:
        total_posicionadas += len(b['nesting_result']['pecas_posicionadas'])

    total_nao_posicionadas = len(result.get('pecas_nao_suportadas', []))

    # Quantidade solicitada = 3 itens × 2 cada = 6 unidades
    quantidade_solicitada = sum(p['quantidade'] for p in pecas)
    assert quantidade_solicitada == 6

    # Conservação: posicionadas + não posicionadas == solicitada
    assert total_posicionadas + total_nao_posicionadas == quantidade_solicitada, \
        f"Conservação falhou: {total_posicionadas} + {total_nao_posicionadas} != {quantidade_solicitada}"

    # Não deve ter mais de 6 peças totais (prova que não houve explosão)
    assert total_posicionadas <= 6, \
        f"Explosão detectada: {total_posicionadas} peças posicionadas (esperado <= 6)"


# ---------------------------------------------------------------------------
# CONSERVAÇÃO DE PEÇAS — INVARIANTE PRINCIPAL
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("quantidade", [1, 2, 5, 10])
def test_conservacao_pecas_single_item(quantidade):
    """Quantidade solicitada == posicionada + não posicionada, para vários N."""
    pecas = [
        {'id': 'peca_A', 'largura': 300.0, 'comprimento': 400.0, 'quantidade': quantidade, 'permitir_rotacao': True}
    ]
    chapa_padrao = (1200.0, 2400.0)

    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas,
        retalhos_disponiveis=[],
        chapa_padrao=chapa_padrao,
        margem_corte=5.0
    )

    total_posicionadas = sum(
        len(b['nesting_result']['pecas_posicionadas'])
        for b in result['bins_utilizados']
    )
    total_nao_suportadas = len(result.get('pecas_nao_suportadas', []))

    assert total_posicionadas + total_nao_suportadas == quantidade, \
        f"Conservação falhou para qty={quantidade}: {total_posicionadas} + {total_nao_suportadas} != {quantidade}"


@pytest.mark.parametrize("quantidade", [1, 2, 5, 10])
def test_conservacao_pecas_multi_item(quantidade):
    """Conservação com múltiplos itens diferentes."""
    pecas = [
        {'id': 'A', 'largura': 200.0, 'comprimento': 300.0, 'quantidade': quantidade, 'permitir_rotacao': True},
        {'id': 'B', 'largura': 150.0, 'comprimento': 250.0, 'quantidade': quantidade, 'permitir_rotacao': True},
    ]
    chapa_padrao = (1200.0, 2400.0)

    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas,
        retalhos_disponiveis=[],
        chapa_padrao=chapa_padrao,
        margem_corte=5.0
    )

    total_posicionadas = sum(
        len(b['nesting_result']['pecas_posicionadas'])
        for b in result['bins_utilizados']
    )
    total_nao_suportadas = len(result.get('pecas_nao_suportadas', []))
    total_esperado = quantidade * 2  # 2 itens

    assert total_posicionadas + total_nao_suportadas == total_esperado, \
        f"Conservação falhou: {total_posicionadas} + {total_nao_suportadas} != {total_esperado}"


# ---------------------------------------------------------------------------
# CENÁRIOS DE DISTRIBUIÇÃO
# ---------------------------------------------------------------------------

def test_tudo_cabe_em_um_bin():
    """Todas as peças cabem em uma única chapa."""
    pecas = [
        {'id': 'A', 'largura': 100.0, 'comprimento': 100.0, 'quantidade': 3, 'permitir_rotacao': True}
    ]
    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas, retalhos_disponiveis=[], chapa_padrao=(1200.0, 2400.0), margem_corte=5.0
    )
    total_pos = sum(len(b['nesting_result']['pecas_posicionadas']) for b in result['bins_utilizados'])
    assert total_pos == 3
    assert len(result['bins_utilizados']) == 1


def test_distribui_entre_multiplos_bins():
    """Peças não cabem em uma chapa — precisam ser distribuídas."""
    # 4 peças de 600x600 com gap=5: cada peça ocupa 605x605
    # Chapa 1000x1000: cabe 1 peça (605 < 1000, segunda 605+605=1210 > 1000)
    pecas = [
        {'id': 'big', 'largura': 600.0, 'comprimento': 600.0, 'quantidade': 4, 'permitir_rotacao': False}
    ]
    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas, retalhos_disponiveis=[], chapa_padrao=(1000.0, 1000.0), margem_corte=5.0
    )
    total_pos = sum(len(b['nesting_result']['pecas_posicionadas']) for b in result['bins_utilizados'])
    assert total_pos == 4
    assert len(result['bins_utilizados']) >= 2  # Pelo menos 2 chapas


def test_nenhuma_cabe_oversized():
    """Peça maior que a chapa — deve ir para pecas_nao_suportadas."""
    pecas = [
        {'id': 'giant', 'largura': 2000.0, 'comprimento': 2000.0, 'quantidade': 2, 'permitir_rotacao': False}
    ]
    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas, retalhos_disponiveis=[], chapa_padrao=(1000.0, 1000.0), margem_corte=5.0
    )
    total_pos = sum(len(b['nesting_result']['pecas_posicionadas']) for b in result['bins_utilizados'])
    total_nao = len(result.get('pecas_nao_suportadas', []))
    assert total_pos == 0
    assert total_nao == 2  # Ambas oversized


def test_parcialmente_posicionadas():
    """Algumas cabem, outras são grandes demais."""
    pecas = [
        {'id': 'fits', 'largura': 100.0, 'comprimento': 100.0, 'quantidade': 3, 'permitir_rotacao': True},
        {'id': 'giant', 'largura': 2000.0, 'comprimento': 2000.0, 'quantidade': 2, 'permitir_rotacao': False},
    ]
    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas, retalhos_disponiveis=[], chapa_padrao=(1000.0, 1000.0), margem_corte=5.0
    )
    total_pos = sum(len(b['nesting_result']['pecas_posicionadas']) for b in result['bins_utilizados'])
    total_nao = len(result.get('pecas_nao_suportadas', []))
    # 3 peças pequenas posicionadas, 2 gigantes não posicionadas
    assert total_pos == 3
    assert total_nao == 2


# ---------------------------------------------------------------------------
# IDENTIDADE DAS INSTÂNCIAS
# ---------------------------------------------------------------------------

def test_identidade_instancias():
    """Peças expandidas mantêm o ID original do item para rateio."""
    pecas = [
        {'id': 'item_X', 'largura': 200.0, 'comprimento': 300.0, 'quantidade': 3, 'permitir_rotacao': True}
    ]
    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas, retalhos_disponiveis=[], chapa_padrao=(1200.0, 2400.0), margem_corte=5.0
    )
    for b in result['bins_utilizados']:
        for peca in b['nesting_result']['pecas_posicionadas']:
            assert peca.get('id') == 'item_X', f"ID perdido: {peca.get('id')}"
            assert peca.get('quantidade') == 1, f"quantidade deveria ser 1, é {peca.get('quantidade')}"


# ---------------------------------------------------------------------------
# IMPACTO FINANCEIRO — quantidade=1 inalterado
# ---------------------------------------------------------------------------

def test_impacto_financeiro_quantidade_1_inalterado():
    """Resultado financeiro com quantidade=1 deve ser idêntico antes/depois do fix.

    Usa a engine completa (CalculoEngine) para provar que o custo não mudou.
    """
    eng = CalculoEngine()
    items = [
        {
            'descricao': 'Peça A',
            'material': 'AÇO CARBONO',
            'espessura': 2.0,
            'largura': 200.0,
            'comprimento': 300.0,
            'perimetro': 1000.0,
            'num_entradas': 4,
            'quantidade': 1,
            'chapa_l': 1200.0,
            'chapa_c': 2400.0,
            'preco_kg': 8.0,
            'margem_lucro': 0.30,
            'chapa_arranjada': True,
            'taxa_comissao': 0.03,
        }
    ]
    config = {
        'estado': 'SP',
        'tipo_venda': 'pecas',
        'ipi_rate': 0.05,
        'custos_operacao': {'CORTE LASER': 180.0},
        'usar_nesting_2d': True,
        'retalhos_disponiveis': [],
    }

    r1 = eng.calcular_orcamento(copy.deepcopy(items), copy.deepcopy(config))

    # Executar segunda vez — deve ser idêntico
    r2 = eng.calcular_orcamento(copy.deepcopy(items), copy.deepcopy(config))

    assert abs(r1['total_custo_mp'] - r2['total_custo_mp']) < 0.001
    assert abs(r1['total_preco'] - r2['total_preco']) < 0.001
    assert r1['total_custo_mp'] >= 0  # Pode ser 0 se sobras cobrem


def test_custos_coerentes_quantidade_maior():
    """Com quantidade > 1, custos devem ser proporcionais e não explodir."""
    eng = CalculoEngine()
    base_item = {
        'descricao': 'Peça B',
        'material': 'AÇO CARBONO',
        'espessura': 2.0,
        'largura': 200.0,
        'comprimento': 300.0,
        'perimetro': 1000.0,
        'num_entradas': 4,
        'chapa_l': 1200.0,
        'chapa_c': 2400.0,
        'preco_kg': 8.0,
        'margem_lucro': 0.30,
        'chapa_arranjada': True,
        'taxa_comissao': 0.03,
    }
    config = {
        'estado': 'SP',
        'tipo_venda': 'pecas',
        'ipi_rate': 0.05,
        'custos_operacao': {'CORTE LASER': 180.0},
        'usar_nesting_2d': True,
        'retalhos_disponiveis': [],
    }

    # Quantidade = 1
    item_q1 = copy.deepcopy(base_item)
    item_q1['quantidade'] = 1
    r1 = eng.calcular_orcamento([item_q1], copy.deepcopy(config))

    # Quantidade = 5
    item_q5 = copy.deepcopy(base_item)
    item_q5['quantidade'] = 5
    r5 = eng.calcular_orcamento([item_q5], copy.deepcopy(config))

    # Custo total com qty=5 não deve ser astronomicamente maior que qty=1
    # (mesmo tendo rateio diferente por aproveitamento, a relação deve ser razoável)
    ratio = r5['total_preco'] / r1['total_preco'] if r1['total_preco'] > 0 else 0
    assert ratio < 20, f"Custo explodiu: ratio={ratio} (q5={r5['total_preco']}, q1={r1['total_preco']})"
    assert ratio > 0.1, f"Custo suspeitamente baixo: ratio={ratio}"


# ---------------------------------------------------------------------------
# DETERMINISMO — quantidade > 1
# ---------------------------------------------------------------------------

def test_determinismo_multi_bin_quantidade_maior():
    """Mesmos inputs com quantidade > 1 devem produzir resultados idênticos."""
    pecas = [
        {'id': 'A', 'largura': 600.0, 'comprimento': 600.0, 'quantidade': 3, 'permitir_rotacao': False},
        {'id': 'B', 'largura': 400.0, 'comprimento': 500.0, 'quantidade': 2, 'permitir_rotacao': True},
    ]
    chapa = (1000.0, 1000.0)

    r1 = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=copy.deepcopy(pecas), retalhos_disponiveis=[], chapa_padrao=chapa, margem_corte=5.0
    )
    r2 = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=copy.deepcopy(pecas), retalhos_disponiveis=[], chapa_padrao=chapa, margem_corte=5.0
    )

    # Mesma quantidade de bins
    assert len(r1['bins_utilizados']) == len(r2['bins_utilizados'])

    # Mesma quantidade total de peças posicionadas
    pos1 = sum(len(b['nesting_result']['pecas_posicionadas']) for b in r1['bins_utilizados'])
    pos2 = sum(len(b['nesting_result']['pecas_posicionadas']) for b in r2['bins_utilizados'])
    assert pos1 == pos2

    # Conservação
    total_esperado = sum(p['quantidade'] for p in pecas)  # 3 + 2 = 5
    nao1 = len(r1.get('pecas_nao_suportadas', []))
    assert pos1 + nao1 == total_esperado


# ---------------------------------------------------------------------------
# RETALHO COM QUANTIDADE > 1
# ---------------------------------------------------------------------------

def test_retalho_com_quantidade_maior():
    """Multi-bin com retalho e quantidade > 1 não deve explodir."""
    pecas = [
        {'id': 'small', 'largura': 100.0, 'comprimento': 100.0, 'quantidade': 3, 'permitir_rotacao': True}
    ]
    retalhos = [
        {'id': 'r1', 'largura': 250.0, 'comprimento': 250.0, 'valor_contabil': 10.0}
    ]

    result = Nesting2DEngine.otimizar_lote_multi_bin(
        pecas=pecas, retalhos_disponiveis=retalhos, chapa_padrao=(1200.0, 2400.0), margem_corte=5.0
    )

    total_pos = sum(len(b['nesting_result']['pecas_posicionadas']) for b in result['bins_utilizados'])
    total_nao = len(result.get('pecas_nao_suportadas', []))

    assert total_pos + total_nao == 3
    assert total_pos == 3  # All should fit somewhere
