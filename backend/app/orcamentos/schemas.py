"""
Schemas Pydantic para o módulo de orçamentos.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class StatusOrcamento(str, Enum):
    RASCUNHO = "rascunho"
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REPROVADO = "reprovado"
    CANCELADO = "cancelado"


# ---------------------------------------------------------------------------
# Operações
# ---------------------------------------------------------------------------

class OperacaoItem(BaseModel):
    nome: str
    tempo_min: float = 0.0
    custo_hora: float = 10.0


# ---------------------------------------------------------------------------
# Item – Criação / Atualização
# ---------------------------------------------------------------------------

class ItemCreate(BaseModel):
    descricao: str
    material: str = "AÇO CARBONO"
    tipo_material: Optional[str] = None
    espessura: float = 1.0
    largura: float = 0.0
    comprimento: float = 0.0
    perimetro: float = 0.0
    num_entradas: int = 1
    quantidade: int = 1
    chapa_l: float = 1200.0
    chapa_c: float = 2400.0
    preco_kg: float = 0.0
    margem_lucro: float = 0.30
    operacoes: List[OperacaoItem] = []
    observacoes: Optional[str] = None
    origem_material: Optional[str] = "chapa_inteira"
    vetor_svg: Optional[str] = None


class ItemUpdate(BaseModel):
    descricao: Optional[str] = None
    material: Optional[str] = None
    tipo_material: Optional[str] = None
    espessura: Optional[float] = None
    largura: Optional[float] = None
    comprimento: Optional[float] = None
    perimetro: Optional[float] = None
    num_entradas: Optional[int] = None
    quantidade: Optional[int] = None
    chapa_l: Optional[float] = None
    chapa_c: Optional[float] = None
    preco_kg: Optional[float] = None
    margem_lucro: Optional[float] = None
    operacoes: Optional[List[OperacaoItem]] = None
    observacoes: Optional[str] = None
    origem_material: Optional[str] = None
    vetor_svg: Optional[str] = None


# ---------------------------------------------------------------------------
# Item – Resposta (com valores calculados)
# ---------------------------------------------------------------------------

class ItemCalculadoResponse(BaseModel):
    # Dados de entrada
    descricao: str = ""
    material: str = ""
    tipo_material: Optional[str] = None
    espessura: float = 0.0
    largura: float = 0.0
    comprimento: float = 0.0
    perimetro: float = 0.0
    num_entradas: int = 1
    quantidade: int = 1
    chapa_l: float = 1200.0
    chapa_c: float = 2400.0
    preco_kg: float = 0.0
    margem_lucro: float = 0.30
    origem_material: str = "chapa_inteira"
    vetor_svg: Optional[str] = None

    # Valores calculados
    velocidade: float = 0.0
    peck: float = 0.0
    tempo_corte_laser: float = 0.0
    area: float = 0.0
    peso_unitario: float = 0.0
    peso_chapa: float = 0.0
    pecas_por_chapa: int = 0
    qtd_chapas: int = 0
    sobra: int = 0
    retalho: float = 0.0
    peso_total: float = 0.0
    custo_mp: float = 0.0
    total_fabricacao: float = 0.0
    custo_basico: float = 0.0
    valor_venda_sem_imp: float = 0.0
    preco_unitario_com_imp: float = 0.0
    preco_total: float = 0.0
    icms: float = 0.0
    ipi: float = 0.0
    pis: float = 0.0
    cofins: float = 0.0
    total_tributos: float = 0.0
    total_nf: float = 0.0
    comissao: float = 0.0

    operacoes: List[OperacaoItem] = []
    observacoes: Optional[str] = None


# ---------------------------------------------------------------------------
# Cliente
# ---------------------------------------------------------------------------

class ClienteInfo(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    cnpj: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: str = "SP"


# ---------------------------------------------------------------------------
# Orçamento – Criação / Atualização / Resposta
# ---------------------------------------------------------------------------

class OrcamentoCreate(BaseModel):
    cliente: ClienteInfo
    itens: List[ItemCreate]
    tipo_venda: str = "pecas"
    ipi_rate: float = 0.05
    taxa_comissao: float = 0.03
    condicao_pagamento: Optional[str] = None
    prazo_entrega: Optional[str] = None
    validade: Optional[int] = 30
    observacoes: Optional[str] = None


class OrcamentoUpdate(BaseModel):
    cliente: Optional[ClienteInfo] = None
    itens: Optional[List[ItemCreate]] = None
    tipo_venda: Optional[str] = None
    ipi_rate: Optional[float] = None
    taxa_comissao: Optional[float] = None
    condicao_pagamento: Optional[str] = None
    prazo_entrega: Optional[str] = None
    validade: Optional[int] = None
    observacoes: Optional[str] = None


class StatusUpdate(BaseModel):
    status: StatusOrcamento


class OrcamentoResponse(BaseModel):
    id: str
    numero: Optional[str] = None
    status: str = "rascunho"
    cliente: ClienteInfo
    itens: List[ItemCalculadoResponse] = []
    tipo_venda: str = "pecas"
    ipi_rate: float = 0.05
    taxa_comissao: float = 0.03
    condicao_pagamento: Optional[str] = None
    prazo_entrega: Optional[str] = None
    validade: Optional[int] = 30
    observacoes: Optional[str] = None

    # Totais
    total_preco: float = 0.0
    total_nf: float = 0.0
    total_tributos: float = 0.0
    total_comissao: float = 0.0
    total_peso: float = 0.0
    total_custo_mp: float = 0.0
    total_fabricacao: float = 0.0

    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    model_config = {"from_attributes": True}


class ItemUpdateNesting(BaseModel):
    descricao: Optional[str] = None
    material: Optional[str] = None
    espessura: Optional[float] = None
    largura: Optional[float] = None
    comprimento: Optional[float] = None
    quantidade: Optional[int] = None


class BulkUpdateNesting(BaseModel):
    item_ids: List[str]
    fields: ItemUpdateNesting

