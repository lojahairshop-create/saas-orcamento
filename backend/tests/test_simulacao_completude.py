from app.orcamentos.service import create_orcamento, simular_comparacao
from app.orcamentos.schemas import SimulacaoComparacaoRequest, ItemCreate, ClienteInfo
import pytest

def criar_request_base():
    return SimulacaoComparacaoRequest(
        cliente=ClienteInfo(nome="Teste", email="", telefone="", documento=""),
        tipo_venda="pecas",
        ipi_rate=0.0,
        taxa_comissao=0.0,
        itens=[]
    )

@pytest.mark.asyncio
async def test_cenario_completo():
    req = criar_request_base()
    req.itens.append(ItemCreate(
        descricao="Peca pequena",
        material="Aço",
        espessura=2.0,
        quantidade=1,
        largura=100,
        comprimento=100,
        chapa_l=1000,
        chapa_c=1000,
        preco_kg=5.0,
            chapa_arranjada=True
    ))
    res = await simular_comparacao(req, user_id='test')
    assert res.nesting.completo is True
    assert res.nesting.total_pecas_nao_suportadas == 0
    assert len(res.nesting.pecas_nao_suportadas) == 0
    assert res.nesting.total_bins == 1

@pytest.mark.asyncio
async def test_1_oversized_nao_suportada():
    req = criar_request_base()
    req.itens.append(ItemCreate(
        descricao="Peca Gigante",
        material="Aço",
        espessura=2.0,
        quantidade=1,
        largura=2000,
        comprimento=2000,
        chapa_l=1000,
        chapa_c=1000,
        preco_kg=5.0,
            chapa_arranjada=True
    ))
    res = await simular_comparacao(req, user_id='test')
    assert res.nesting.completo is False
    assert res.nesting.total_pecas_nao_suportadas == 1
    assert res.nesting.total_bins == 0

@pytest.mark.asyncio
async def test_multiplas_pecas_parcialmente_suportadas():
    req = criar_request_base()
    req.itens.append(ItemCreate(
        descricao="Peca Ok",
        material="Aço",
        espessura=2.0,
        quantidade=1,
        largura=100,
        comprimento=100,
        chapa_l=1000,
        chapa_c=1000,
        preco_kg=5.0,
            chapa_arranjada=True
    ))
    req.itens.append(ItemCreate(
        descricao="Peca Gigante",
        material="Aço",
        espessura=2.0,
        quantidade=1,
        largura=2000,
        comprimento=2000,
        chapa_l=1000,
        chapa_c=1000,
        preco_kg=5.0,
            chapa_arranjada=True
    ))
    res = await simular_comparacao(req, user_id='test')
    assert res.nesting.completo is False
    assert res.nesting.total_pecas_nao_suportadas == 1
    assert res.nesting.total_bins == 1

@pytest.mark.asyncio
async def test_quantidade_maior_parcial():
    # If there is a limit on bins, or if one item has quantity > 1 but doesn't fit...
    # In our engine, if a piece size doesn't fit, ALL units of it won't fit.
    req = criar_request_base()
    req.itens.append(ItemCreate(
        descricao="Peca Gigante Multi",
        material="Aço",
        espessura=2.0,
        quantidade=5,
        largura=2000,
        comprimento=2000,
        chapa_l=1000,
        chapa_c=1000,
        preco_kg=5.0,
            chapa_arranjada=True
    ))
    res = await simular_comparacao(req, user_id='test')
    assert res.nesting.completo is False
    assert res.nesting.total_pecas_nao_suportadas == 5
