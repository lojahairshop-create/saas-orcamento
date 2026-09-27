import copy
import pytest
from fastapi import HTTPException
from app.orcamentos.nesting_review import calculate_review
from app.orcamentos.schemas import ItemCreate
from app.calculo.engine import CalculoEngine, calcular_custo_mp


def inputs():
    item = ItemCreate(descricao='Placa', material='AÇO CARBONO', espessura=2, largura=100,
                      comprimento=200, quantidade=2, chapa_l=1000, chapa_c=2000, preco_kg=10).model_dump()
    item['taxa_comissao'] = .03
    return [item], dict(estado='SP', tipo_venda='pecas', ipi_rate=.05, custos_operacao={}, usar_nesting_2d=False)


def test_automatic_and_manual_have_same_fingerprint():
    items, cfg = inputs()
    result = calculate_review(items, cfg, 'retalho_arranjado')
    assert result['completo']
    verified = calculate_review(items, cfg, 'retalho_arranjado', result['bins_utilizados'])
    assert result['fingerprint'] == verified['fingerprint']


def test_oversized_piece_returns_diagnostic_without_empty_bins():
    items, cfg = inputs()
    items[0]['largura'] = 1200
    items[0]['comprimento'] = 2400
    result = calculate_review(items, cfg, 'retalho_arranjado')
    assert result['completo'] is False
    assert result['bins_utilizados'] == []
    assert result['pecas_nao_suportadas']


def test_occupied_rectangle_excludes_translation_and_extra_20mm():
    items, cfg = inputs()
    layout = [dict(dimensao=[1000,2000], nesting_result=dict(pecas_posicionadas=[
        dict(id=0,x=50,y=80,w=100,h=200), dict(id=0,x=155,y=80,w=100,h=200)]))]
    result = calculate_review(items,cfg,'retalho_arranjado',layout)
    assert result['bins_utilizados'][0]['largura_ocupada'] == 205
    assert result['bins_utilizados'][0]['comprimento_ocupado'] == 200
    weight = 2*205*200*CalculoEngine().get_densidade('AÇO CARBONO')/1_000_000
    assert result['total_custo_mp'] == pytest.approx(calcular_custo_mp(weight,10,.05),abs=.02)
    whole = calculate_review(items,cfg,'chapa_inteira',layout)
    assert whole['total_custo_mp'] > result['total_custo_mp']
    assert whole['total_fabricacao'] == result['total_fabricacao']


def test_individual_preserves_existing_calculation_and_inputs():
    items,cfg=inputs(); original=copy.deepcopy(items)
    result=calculate_review(items,cfg,'individual')
    expected=CalculoEngine().calcular_orcamento(copy.deepcopy(items),cfg)
    for key in ['total_preco','total_nf','total_tributos','total_comissao','total_fabricacao']:
        assert result[key] == expected[key]
    assert items == original


@pytest.mark.parametrize('failure',['overlap','outside','missing','duplicate','dimensions','material'])
def test_invalid_layouts_are_rejected(failure):
    items,cfg=inputs()
    result=calculate_review(items,cfg,'retalho_arranjado')
    bins=result['bins_utilizados']; ps=bins[0]['nesting_result']['pecas_posicionadas']
    if failure=='overlap': ps[1].update(x=ps[0]['x'],y=ps[0]['y'],w=ps[0]['w'],h=ps[0]['h'],rotacionado=ps[0]['rotacionado'])
    if failure=='outside': ps[0]['x']=2000
    if failure=='missing': ps.pop()
    if failure=='duplicate': ps.append(copy.deepcopy(ps[0]))
    if failure=='dimensions': ps[0]['w']=3
    if failure=='material': bins[0]['dimensao']=[3000,3000]
    with pytest.raises(HTTPException) as exc: calculate_review(items,cfg,'retalho_arranjado',bins)
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_save_conflict_performs_zero_writes(monkeypatch):
    from unittest.mock import MagicMock
    from app.orcamentos import service
    from app.orcamentos.schemas import OrcamentoCreate, ClienteInfo
    db=MagicMock(); db.table.return_value.select.return_value.execute.return_value.data=[]
    monkeypatch.setattr(service,'get_supabase_service_client',lambda:db)
    items,cfg=inputs()
    layout=calculate_review(items,cfg,'retalho_arranjado')['bins_utilizados']
    data=OrcamentoCreate(numero='TEST',cliente=ClienteInfo(nome='Teste'),itens=items,
        modo_cobranca_nesting='retalho_arranjado',layout_revisao=layout,simulation_fingerprint='stale')
    with pytest.raises(HTTPException) as exc: await service.create_orcamento(data,'test-user')
    assert exc.value.status_code==409
    assert not db.table.return_value.insert.called
    assert not db.table.return_value.update.called
    assert not db.table.return_value.delete.called
    assert not db.rpc.called


@pytest.mark.asyncio
async def test_verified_layout_saved_without_stock_mutation(monkeypatch):
    from unittest.mock import MagicMock
    from app.orcamentos import service
    from app.orcamentos.schemas import OrcamentoCreate, ClienteInfo
    db=MagicMock(); db.table.return_value.select.return_value.execute.return_value.data=[]
    monkeypatch.setattr(service,'get_supabase_service_client',lambda:db)
    items,cfg=inputs()
    preview=calculate_review(items,cfg,'retalho_arranjado')
    data=OrcamentoCreate(numero='TEST',cliente=ClienteInfo(nome='Teste'),itens=items,
        modo_cobranca_nesting='retalho_arranjado',layout_revisao=preview['bins_utilizados'],simulation_fingerprint=preview['fingerprint'])
    saved=await service.create_orcamento(data,'test-user')
    assert saved.total_preco == preview['total_preco']
    assert saved.nesting_json[0]['nesting_result'] == preview['bins_utilizados'][0]['nesting_result']
    assert len(saved.nesting_json[0]['source_item_ids']) == len(items)
    assert db.table.return_value.insert.call_count==2
    assert not db.rpc.called


@pytest.mark.asyncio
async def test_update_conflict_does_not_delete_saved_items(monkeypatch):
    from unittest.mock import MagicMock
    from app.orcamentos import service
    from app.orcamentos.schemas import OrcamentoUpdate, ClienteInfo
    db=MagicMock()
    db.table.return_value.select.return_value.execute.return_value.data=[]
    monkeypatch.setattr(service,'get_supabase_service_client',lambda:db)
    items,cfg=inputs()
    preview=calculate_review(items,cfg,'retalho_arranjado')
    payload=OrcamentoUpdate(cliente=ClienteInfo(nome='Teste'),itens=items,tipo_venda='pecas',
        ipi_rate=.05,taxa_comissao=.03,usar_nesting_2d=False,
        modo_cobranca_nesting='retalho_arranjado',layout_revisao=preview['bins_utilizados'],simulation_fingerprint='outdated')
    with pytest.raises(HTTPException) as exc:
        await service.update_orcamento('saved-quote',payload,'test-user')
    assert exc.value.status_code==409
    assert not db.table.return_value.delete.called
    assert not db.table.return_value.update.called
    assert not db.table.return_value.insert.called
    assert not db.rpc.called
