import pytest
from unittest.mock import MagicMock
from app.orcamentos.service import create_orcamento, generate_simulation_fingerprint
from app.orcamentos.schemas import OrcamentoCreate, ClienteInfo, ItemCreate
from fastapi import HTTPException
import app.orcamentos.service as service

def mock_config():
    return {
        "estado": "SP",
        "tipo_venda": "venda",
        "ipi_rate": 0.0,
        "custos_operacao": {},
        "usar_nesting_2d": True
    }

def mock_resultado(usar_nesting):
    return {
        "total_preco": 1000.0,
        "total_custo_mp": 500.0,
        "total_peso": 10.0,
        "total_nf": 1000.0,
        "total_tributos": 0.0,
        "total_fabricacao": 100.0,
        "total_comissao": 0.0,
        "bins_utilizados": [{"id": "ret_1", "tipo": "retalho", "material": "A", "espessura": 1}],
        "items_calculados": [{}]
    }

def create_payload(validation_req=False, fingerprint=None, nesting=True):
    return OrcamentoCreate(
        numero="",
        cliente=ClienteInfo(nome="T", estado="SP", email="", telefone=""),
        tipo_venda="venda",
        ipi_rate=0.0,
        taxa_comissao=0.0,
        usar_nesting_2d=nesting,
        comparison_validation_required=validation_req,
        simulation_fingerprint=fingerprint,
        itens=[
            ItemCreate(descricao="Item 1", quantidade=1, material="A", espessura=1, largura=100, comprimento=100)
        ]
    )

class MockSupabase:
    def __init__(self, retalhos=None):
        self.mutations = []
        self.retalhos = retalhos or []
        
    def table(self, table_name):
        self.table_name = table_name
        return self
        
    def select(self, *args, **kwargs):
        return self
        
    def eq(self, k, v):
        return self
    def like(self, *args, **kwargs): return self
    def order(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    def single(self, *args, **kwargs): return self
        
    def execute(self):
        if self.table_name == "estoque_chapas":
            class Ret: data = self.retalhos
            return Ret()
        elif self.table_name == "custos_operacao":
            class Ret: data = []
            return Ret()
        class Ret: data = []
        return Ret()
        
    def insert(self, data):
        self.mutations.append(f"insert_{self.table_name}")
        return self
        
    def update(self, data):
        self.mutations.append(f"update_{self.table_name}")
        return self
        
    def delete(self):
        self.mutations.append(f"delete_{self.table_name}")
        return self
        
    def rpc(self, func_name, payload):
        self.mutations.append(f"rpc_{func_name}")
        class RPC:
            def execute(self): pass
        return RPC()

@pytest.fixture
def setup_mocks(monkeypatch):
    monkeypatch.setenv('NESTING_2D_HABILITADO', 'true')
    mock_sb = MockSupabase()
    monkeypatch.setattr(service, "get_supabase_service_client", lambda: mock_sb)
    
    mock_engine = MagicMock()
    def calc_side_effect(items, config):
        res = mock_resultado(config.get("usar_nesting_2d", False))
        res["items_calculados"] = [{} for _ in items]
        return res
    mock_engine.calcular_orcamento.side_effect = calc_side_effect
    monkeypatch.setattr(service, "engine", mock_engine)
    
    return mock_sb, mock_engine

@pytest.mark.asyncio
async def test_novo_fluxo_fingerprint_correto(setup_mocks):
    mock_sb, mock_engine = setup_mocks
    
    # Pre-calcular o fingerprint válido
    payload_fake = create_payload(True, None, True)
    items_dicts = [service._item_create_to_dict(it, payload_fake.taxa_comissao) for it in payload_fake.itens]
    valid_fp = generate_simulation_fingerprint(mock_resultado(True), True, items_dicts, mock_config())
    
    payload = create_payload(validation_req=True, fingerprint=valid_fp, nesting=True)
    
    await create_orcamento(payload, "user1")
    
    # Must have performed inserts
    assert "insert_orcamentos" in mock_sb.mutations

@pytest.mark.asyncio
async def test_novo_fluxo_fingerprint_incorreto_409(setup_mocks):
    mock_sb, mock_engine = setup_mocks
    
    payload = create_payload(validation_req=True, fingerprint="wrong_fingerprint", nesting=True)
    
    with pytest.raises(HTTPException) as exc:
        await create_orcamento(payload, "user1")
        
    assert exc.value.status_code == 409
    # PROVA: Nenhuma mutação (0 writes)
    assert len(mock_sb.mutations) == 0

@pytest.mark.asyncio
async def test_novo_fluxo_fingerprint_ausente_422(setup_mocks):
    mock_sb, mock_engine = setup_mocks
    
    payload = create_payload(validation_req=True, fingerprint=None, nesting=True)
    
    with pytest.raises(HTTPException) as exc:
        await create_orcamento(payload, "user1")
        
    assert exc.value.status_code == 422
    # PROVA: Nenhuma mutação (0 writes)
    assert len(mock_sb.mutations) == 0

@pytest.mark.asyncio
async def test_fluxo_legado_sem_fingerprint_funciona(setup_mocks):
    mock_sb, mock_engine = setup_mocks
    
    payload = create_payload(validation_req=False, fingerprint=None, nesting=False)
    
    await create_orcamento(payload, "user1")
    assert "insert_orcamentos" in mock_sb.mutations

@pytest.mark.asyncio
async def test_fluxo_legado_nesting_sem_fingerprint_funciona(setup_mocks):
    mock_sb, mock_engine = setup_mocks
    
    # Legacy client sending nesting=True without validation req
    payload = create_payload(validation_req=False, fingerprint=None, nesting=True)
    
    await create_orcamento(payload, "user1")
    assert "insert_orcamentos" in mock_sb.mutations
