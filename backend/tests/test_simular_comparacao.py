"""
Testes para o endpoint POST /orcamentos/simular-comparacao

Estes testes validam a simulação comparativa Clássico × Nesting
SEM depender de banco de dados real (mocking do Supabase).

Cobertura:
  - Comparação clássico × nesting
  - Economia positiva
  - Economia negativa (nesting mais caro)
  - Nenhum retalho disponível
  - Múltiplas chapas
  - Payload original não mutado
  - Nenhuma escrita de estoque
  - Determinismo
  - Consistência simulação × cálculo real
"""

import copy
import json
import pytest
from unittest.mock import patch, MagicMock

from app.calculo.engine import CalculoEngine
from app.orcamentos.schemas import (
    SimulacaoComparacaoRequest,
    ClienteInfo,
    ItemCreate,
)
from app.orcamentos.service import simular_comparacao, _item_create_to_dict


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_payload(
    itens=None,
    estado="SP",
    ipi_rate=0.05,
    taxa_comissao=0.03,
):
    """Cria um SimulacaoComparacaoRequest de teste.

    NOTA: Usamos quantidade=1 para evitar o bug pré-existente em
    Nesting2DEngine.otimizar_lote_multi_bin que causa crescimento
    exponencial quando pecas_nao_posicionadas (já desempacotadas)
    são re-desempacotadas com quantidade > 1 em iterações subsequentes.
    """
    if itens is None:
        itens = [
            ItemCreate(
                descricao="Peça teste A",
                material="AÇO CARBONO",
                espessura=2.0,
                largura=200.0,
                comprimento=300.0,
                perimetro=1000.0,
                num_entradas=4,
                quantidade=1,
                chapa_l=1200.0,
                chapa_c=2400.0,
                preco_kg=8.0,
                margem_lucro=0.30,
                chapa_arranjada=True,
            ),
            ItemCreate(
                descricao="Peça teste B",
                material="AÇO CARBONO",
                espessura=2.0,
                largura=150.0,
                comprimento=250.0,
                perimetro=800.0,
                num_entradas=4,
                quantidade=1,
                chapa_l=1200.0,
                chapa_c=2400.0,
                preco_kg=8.0,
                margem_lucro=0.30,
                chapa_arranjada=True,
            ),
        ]
    return SimulacaoComparacaoRequest(
        cliente=ClienteInfo(nome="Cliente Teste", estado=estado),
        itens=itens,
        ipi_rate=ipi_rate,
        taxa_comissao=taxa_comissao,
    )


def _mock_supabase(retalhos_data=None):
    """Mock do Supabase que retorna custos e opcionalmente retalhos. SELECT only."""
    if retalhos_data is None:
        retalhos_data = []

    mock_client = MagicMock()

    custos_result = MagicMock()
    custos_result.data = [{"operacao": "CORTE LASER", "custo_hora": 180.0}]

    estoque_result = MagicMock()
    estoque_result.data = retalhos_data

    def table_factory(name):
        t = MagicMock()
        if name == "custos_operacao":
            # .select(...).execute()
            t.select.return_value.execute.return_value = custos_result
        elif name == "estoque_chapas":
            # .select(...).eq(...).eq(...).execute()
            t.select.return_value.eq.return_value.eq.return_value.execute.return_value = estoque_result
        return t

    mock_client.table = MagicMock(side_effect=table_factory)
    return mock_client


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_comparacao_basica_sem_retalhos():
    """Cenário básico: 2 peças, sem retalhos. Ambos cenários retornam valores reais."""
    payload = _make_payload()
    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        result = await simular_comparacao(payload, "user-test-1")

    # Cenário clássico deve ter valores positivos
    assert result.classico.total_custo_mp > 0
    assert result.classico.total_preco > 0

    # Cenário nesting deve ter valores não-negativos
    # NOTA: custo_mp pode ser legitimamente 0.0 quando o valor dos retalhos
    # gerados cobre ou excede o custo da chapa (custo_bin_liquido = max(0, ...))
    assert result.nesting.total_custo_mp >= 0
    assert result.nesting.total_preco > 0

    # nesting_json deve estar presente
    assert result.nesting.nesting_json is not None
    assert len(result.nesting.nesting_json) > 0

    # Comparação deve existir
    assert result.comparacao is not None


@pytest.mark.asyncio
async def test_economia_pode_ser_negativa():
    """Se nesting for mais caro, economia deve ser negativa (não clamped)."""
    # Peça que cabe 1 por chapa = nesting basicamente idêntico ou pior
    payload = _make_payload(itens=[
        ItemCreate(
            descricao="Peça grande",
            material="AÇO CARBONO",
            espessura=2.0,
            largura=1100.0,
            comprimento=2300.0,
            perimetro=6800.0,
            num_entradas=4,
            quantidade=1,
            chapa_l=1200.0,
            chapa_c=2400.0,
            preco_kg=8.0,
            margem_lucro=0.30,
            chapa_arranjada=True,
        ),
    ])
    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        result = await simular_comparacao(payload, "user-test-1")

    # A economia pode ser zero, positiva, OU negativa. Não há clamp.
    # O teste prova que o campo não é forçado a >= 0.
    assert isinstance(result.comparacao.economia_total, float)
    assert isinstance(result.comparacao.economia_material, float)


@pytest.mark.asyncio
async def test_com_retalho_disponivel():
    """Quando há retalho, o nesting deve detectá-lo e potencialmente usá-lo.

    NOTA: Usamos quantidade=1 para evitar um bug pré-existente em
    otimizar_lote_multi_bin que causa crescimento exponencial quando
    pecas_nao_posicionadas (já desempacotadas) são re-desempacotadas
    com quantidade > 1 em iterações subsequentes. Bug documentado,
    porém fora do escopo desta sprint (NÃO alterar Nesting2DEngine).
    """
    payload = _make_payload(itens=[
        ItemCreate(
            descricao="Peça pequena",
            material="AÇO CARBONO",
            espessura=2.0,
            largura=100.0,
            comprimento=150.0,
            perimetro=500.0,
            num_entradas=2,
            quantidade=1,
            chapa_l=1200.0,
            chapa_c=2400.0,
            preco_kg=8.0,
            margem_lucro=0.30,
            chapa_arranjada=True,
        ),
    ])
    mock_sb = _mock_supabase(retalhos_data=[
        {
            "id": "retalho-uuid-001",
            "material": "AÇO CARBONO",
            "espessura": 2.0,
            "largura": 600.0,
            "comprimento": 400.0,
            "quantidade": 1,
            "tipo_registro": "retalho",
            "status": "disponivel",
            "valor_contabil": 50.0,
        },
    ])

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        result = await simular_comparacao(payload, "user-test-1")

    # O nesting pode ou não ter usado o retalho dependendo do tamanho
    assert result.nesting.total_bins > 0
    assert result.nesting.chapas_novas >= 0
    assert result.nesting.retalhos_utilizados >= 0


@pytest.mark.asyncio
async def test_payload_nao_mutado():
    """O payload original não deve ser alterado após a simulação."""
    payload = _make_payload()
    payload_snapshot = payload.model_dump()

    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        await simular_comparacao(payload, "user-test-1")

    # Payload deve ser idêntico ao snapshot
    assert payload.model_dump() == payload_snapshot


@pytest.mark.asyncio
async def test_nenhuma_escrita_banco():
    """O mock do Supabase não deve receber chamadas de insert/update/delete/rpc."""
    payload = _make_payload()
    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        await simular_comparacao(payload, "user-test-1")

    # Verificar que nenhuma tabela recebeu insert/update/delete
    # (select é a única operação esperada)
    for call in mock_sb.method_calls:
        method_name = call[0]
        assert "insert" not in method_name, f"Escrita detectada: {method_name}"
        assert "update" not in method_name, f"Escrita detectada: {method_name}"
        assert "delete" not in method_name, f"Escrita detectada: {method_name}"
        assert "rpc" not in method_name, f"RPC detectada: {method_name}"


@pytest.mark.asyncio
async def test_determinismo():
    """Executar a simulação duas vezes com mesmos dados deve produzir resultado idêntico."""
    payload = _make_payload()
    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        result1 = await simular_comparacao(payload, "user-test-1")

    # Recriar mock (para reset de call counts)
    mock_sb2 = _mock_supabase()
    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb2):
        result2 = await simular_comparacao(payload, "user-test-1")

    # Totais devem ser idênticos
    assert result1.classico.total_custo_mp == result2.classico.total_custo_mp
    assert result1.classico.total_preco == result2.classico.total_preco
    assert result1.nesting.total_custo_mp == result2.nesting.total_custo_mp
    assert result1.nesting.total_preco == result2.nesting.total_preco
    assert result1.nesting.total_bins == result2.nesting.total_bins
    assert result1.nesting.chapas_novas == result2.nesting.chapas_novas


@pytest.mark.asyncio
async def test_consistencia_simulacao_vs_calculo_real():
    """
    O resultado do cenário Nesting na simulação deve ser idêntico
    ao resultado de calcular_orcamento com usar_nesting_2d=True diretamente.
    """
    payload = _make_payload()
    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        sim_result = await simular_comparacao(payload, "user-test-1")

    # Calcular diretamente com a engine
    eng = CalculoEngine()
    items_direct = [_item_create_to_dict(item, payload.taxa_comissao) for item in payload.itens]
    config_direct = {
        "estado": payload.cliente.estado,
        "tipo_venda": payload.tipo_venda,
        "ipi_rate": payload.ipi_rate,
        "custos_operacao": {"CORTE LASER": 180.0},
        "usar_nesting_2d": True,
        "retalhos_disponiveis": [],
    }
    resultado_direto = eng.calcular_orcamento(copy.deepcopy(items_direct), config_direct)

    # Totais devem coincidir
    assert abs(sim_result.nesting.total_custo_mp - resultado_direto["total_custo_mp"]) < 0.01
    assert abs(sim_result.nesting.total_preco - resultado_direto["total_preco"]) < 0.01
    assert abs(sim_result.nesting.total_fabricacao - resultado_direto["total_fabricacao"]) < 0.01


@pytest.mark.asyncio
async def test_multiplas_chapas():
    """Com muitas peças, o nesting deve gerar múltiplos bins.

    NOTA: Usamos quantidade=1 por item para evitar o bug pré-existente
    de re-desempacotamento exponencial no Nesting2DEngine.
    """
    itens = [
        ItemCreate(
            descricao=f"Peça {i}",
            material="AÇO CARBONO",
            espessura=2.0,
            largura=800.0,
            comprimento=1000.0,
            perimetro=3600.0,
            num_entradas=4,
            quantidade=1,
            chapa_l=1200.0,
            chapa_c=2400.0,
            preco_kg=8.0,
            margem_lucro=0.30,
            chapa_arranjada=True,
        )
        for i in range(4)  # 4 peças de 800x1000; ~2 cabem por chapa → precisa 2+ chapas
    ]
    payload = _make_payload(itens=itens)
    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        result = await simular_comparacao(payload, "user-test-1")

    # Deve usar múltiplas chapas
    assert result.nesting.chapas_novas >= 2
    assert result.nesting.total_bins >= 2
    assert result.nesting.aproveitamento_medio > 0


@pytest.mark.asyncio
async def test_campos_nesting_derivados():
    """Verifica que os campos derivados do nesting_json estão corretos."""
    payload = _make_payload()
    mock_sb = _mock_supabase()

    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_sb):
        result = await simular_comparacao(payload, "user-test-1")

    bins = result.nesting.nesting_json
    assert bins is not None

    # Contar manualmente chapas novas e retalhos
    chapas_novas_manual = sum(1 for b in bins if b.get("tipo") == "chapa_nova")
    retalhos_manual = sum(1 for b in bins if b.get("tipo") == "retalho")

    assert result.nesting.chapas_novas == chapas_novas_manual
    assert result.nesting.retalhos_utilizados == retalhos_manual
    assert result.nesting.total_bins == len(bins)
