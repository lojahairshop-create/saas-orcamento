"""
Schemas Pydantic para o módulo de estoque de chapas.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class EstoqueChapaCreate(BaseModel):
    material: str = Field(..., description="INOX, AÇO CARBONO, ALUMÍNIO")
    tipo_material: Optional[str] = Field(None, description="A 304, S 1020, etc.")
    espessura: float = Field(..., gt=0, description="Espessura em mm")
    largura: float = Field(..., gt=0, description="Largura em mm")
    comprimento: float = Field(..., gt=0, description="Comprimento em mm")
    quantidade: int = Field(1, ge=0, description="Quantidade em estoque")
    tipo_registro: str = Field("inteira", description="inteira ou retalho")


class EstoqueChapaUpdate(BaseModel):
    material: Optional[str] = None
    tipo_material: Optional[str] = None
    espessura: Optional[float] = None
    largura: Optional[float] = None
    comprimento: Optional[float] = None
    quantidade: Optional[int] = None
    tipo_registro: Optional[str] = None


class EstoqueChapaResponse(BaseModel):
    id: str
    material: str
    tipo_material: Optional[str] = None
    espessura: float
    largura: float
    comprimento: float
    quantidade: int
    tipo_registro: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EstoqueSugestaoRequest(BaseModel):
    material: str
    espessura: float
    largura: float
    comprimento: float
    quantidade: int


class RetalhoDisponivel(BaseModel):
    id: str
    largura: float
    comprimento: float
    quantidade: int


class EstoqueSugestaoResponse(BaseModel):
    sugestao: str
    opcao_sugerida: str  # 'chapa_inteira', 'retalho_<id>', 'cliente'
    retalhos_disponiveis: List[RetalhoDisponivel] = []
