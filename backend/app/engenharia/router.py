"""
Rotas para processamento de engenharia: leitura de DXF e algoritmo de Nesting.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field
from typing import List, Optional

from app.auth.dependencies import get_current_user
from app.engenharia.dxf_processor import DXFProcessor
from app.engenharia.nesting import NestingEngine

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class NestingItemInput(BaseModel):
    id: str = Field(..., description="ID ou índice identificador da peça")
    largura: float = Field(..., gt=0, description="Largura da peça em mm")
    comprimento: float = Field(..., gt=0, description="Comprimento da peça em mm")
    quantidade: int = Field(1, ge=1, description="Quantidade de peças")


class NestingRequest(BaseModel):
    itens: List[NestingItemInput] = Field(..., description="Lista de peças para o nesting")
    chapa_l: float = Field(..., gt=0, description="Largura da chapa padrão em mm")
    chapa_c: float = Field(..., gt=0, description="Comprimento da chapa padrão em mm")
    gap: float = Field(5.0, ge=0, description="Espaçamento entre as peças na chapa (mm)")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/processar-dxf")
async def processar_dxf(
    file: UploadFile = File(...),
    split_parts: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """
    Recebe um arquivo DXF e extrai informações geométricas essenciais:
    - Perímetro total de corte (mm)
    - Quantidade de furos (entradas de corte adicionais)
    - Bounding Box (Largura x Comprimento da peça em mm)
    - Área real em m²
    """
    # Validação da extensão
    if not file.filename.lower().endswith(".dxf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas arquivos .dxf são aceitos.",
        )

    try:
        content = await file.read()
        if split_parts:
            resultados = DXFProcessor.process_file_content_split(content)
            base_name = file.filename.replace(".dxf", "").replace(".DXF", "")
            for idx, res in enumerate(resultados):
                res["filename"] = f"{base_name} - Peça {idx + 1}"
            return resultados
        else:
            resultado = DXFProcessor.process_file_content(content)
            resultado["filename"] = file.filename
            return resultado
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao processar o arquivo DXF: {str(exc)}",
        )


@router.post("/nesting")
async def calcular_nesting(
    payload: NestingRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Executa o algoritmo Bottom-Left Fill para otimizar a disposição de
    diversas peças retangulares em uma ou mais chapas de dimensões padrão.
    Retorna o arranjo geométrico (coordenadas x, y e rotação) de cada peça.
    """
    try:
        itens_dicts = [item.model_dump() for item in payload.itens]
        resultado = NestingEngine.nested_rectangles(
            itens=itens_dicts,
            chapa_l=payload.chapa_l,
            chapa_c=payload.chapa_c,
            gap=payload.gap,
        )
        return resultado
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao calcular nesting: {str(exc)}",
        )
