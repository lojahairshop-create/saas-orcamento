"""
Schemas Pydantic para o módulo de configurações administrativas.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


# ---------------------------------------------------------------------------
# Global Settings
# ---------------------------------------------------------------------------

class ConfigGlobaisBase(BaseModel):
    icms_padrao: float = Field(..., description="Alíquota padrão de ICMS")
    ipi_padrao: float = Field(..., description="Alíquota padrão de IPI")
    pis_padrao: float = Field(..., description="Alíquota de PIS")
    cofins_padrao: float = Field(..., description="Alíquota de COFINS")
    csll_padrao: float = Field(..., description="Alíquota de CSLL")
    irpj_padrao: float = Field(..., description="Alíquota de IRPJ")
    comissao_padrao: float = Field(..., description="Taxa de comissão padrão")
    base_calculo_padrao: float = Field(..., description="Base de cálculo padrão do ICMS (percentual)")
    
    # Informações da empresa e logo
    empresa_nome: Optional[str] = None
    empresa_cnpj: Optional[str] = None
    empresa_endereco: Optional[str] = None
    empresa_telefone: Optional[str] = None
    empresa_email: Optional[str] = None
    logo_base64: Optional[str] = None


class ConfigGlobaisResponse(ConfigGlobaisBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Impostos por Estado
# ---------------------------------------------------------------------------

class ImpostoEstadoBase(BaseModel):
    uf: str = Field(..., max_length=3, description="Sigla do estado (UF)")
    nome: str = Field(..., description="Nome completo do estado")
    icms_equipamento: float = Field(..., description="Alíquota ICMS para equipamentos")
    base_calc_equipamento: float = Field(..., description="Base de cálculo ICMS para equipamentos")
    icms_pecas: float = Field(..., description="Alíquota ICMS para peças")
    base_calc_pecas: float = Field(..., description="Base de cálculo ICMS para peças")
    ipi_padrao: float = Field(..., description="IPI padrão para o estado")
    csll: float = Field(1.08, description="CSLL padrão (1.08%)")


class ImpostoEstadoResponse(ImpostoEstadoBase):
    id: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Materiais
# ---------------------------------------------------------------------------

class MaterialBase(BaseModel):
    nome: str = Field(..., description="Nome do material (ex: INOX, AÇO CARBONO)")
    tipo: str = Field(..., description="Tipo/Especificação (ex: A 304, S 1020)")
    preco_kg: float = Field(..., description="Preço por KG em R$")
    densidade: float = Field(..., description="Densidade em g/cm³ ou kg/(m²·mm)")


class MaterialResponse(MaterialBase):
    id: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Parâmetros Laser
# ---------------------------------------------------------------------------

class ParametroLaserBase(BaseModel):
    material: str = Field(..., description="Nome do material correspondente")
    espessura: float = Field(..., description="Espessura da chapa em mm")
    avanco: float = Field(..., description="Velocidade de avanço em mm/min")
    peck: float = Field(..., description="Tempo de peck em segundos")


class ParametroLaserResponse(ParametroLaserBase):
    id: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Custos de Operação
# ---------------------------------------------------------------------------

class CustoOperacaoBase(BaseModel):
    operacao: str = Field(..., description="Nome da operação (ex: CORTE LASER, DOBRA)")
    custo_hora: float = Field(..., description="Custo por hora em R$")


class CustoOperacaoResponse(CustoOperacaoBase):
    id: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Medidas de Chapa
# ---------------------------------------------------------------------------

class MedidaChapaBase(BaseModel):
    descricao: str = Field(..., description="Descrição comercial (ex: 1200x2400)")
    largura: float = Field(..., description="Largura em mm")
    comprimento: float = Field(..., description="Comprimento em mm")


class MedidaChapaResponse(MedidaChapaBase):
    id: str

    class Config:
        from_attributes = True
