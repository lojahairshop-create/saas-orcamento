"""
Rotas para processamento de engenharia: leitura de DXF e algoritmo de Nesting.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.auth.dependencies import get_current_user
from app.database import get_supabase_service_client
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
    vetor_svg: Optional[str] = Field(None, description="SVG path string da peça")


class NestingRequest(BaseModel):
    itens: List[NestingItemInput] = Field(..., description="Lista de peças para o nesting")
    chapa_l: Optional[float] = Field(None, description="Largura da chapa padrão em mm")
    chapa_c: Optional[float] = Field(None, description="Comprimento da chapa padrão em mm")
    gap: float = Field(5.0, ge=0, description="Espaçamento entre as peças na chapa (mm)")
    tipo_chapa: Optional[str] = Field("automatico", description="inteira, retalho, cliente, automatico")
    chapa_cliente_l: Optional[float] = Field(None, description="Largura da chapa do cliente")
    chapa_cliente_c: Optional[float] = Field(None, description="Comprimento da chapa do cliente")
    material: Optional[str] = Field(None, description="Material para buscar estoque")
    espessura: Optional[float] = Field(None, description="Espessura para buscar estoque")


class ChapaConsumidaInput(BaseModel):
    id: str
    quantidade: int
    tipo_registro: str
    largura: float
    comprimento: float
    material: str
    espessura: float
    retalho_gerado: Optional[dict] = None


class BaixaNestingRequest(BaseModel):
    chapas: List[ChapaConsumidaInput]


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
    Recebe um arquivo DXF e extrai informações geométricas essenciais.
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
    peças em chapas, consultando o estoque se necessário.
    """
    try:
        supabase = get_supabase_service_client()
        chapas_disponiveis = None
        
        # Consultar estoque de chapas se solicitado
        if payload.tipo_chapa in ("inteira", "retalho", "automatico") and payload.material and payload.espessura:
            query = (
                supabase.table("estoque_chapas")
                .select("*")
                .eq("material", payload.material)
                .eq("espessura", payload.espessura)
                .eq("created_by", current_user["id"])
                .gt("quantidade", 0)
            )
            
            if payload.tipo_chapa == "inteira":
                query = query.eq("tipo_registro", "inteira")
            elif payload.tipo_chapa == "retalho":
                query = query.eq("tipo_registro", "retalho")
                
            res = query.execute()
            chapas_disponiveis = []
            for item in (res.data or []):
                chapas_disponiveis.append({
                    "id": str(item["id"]),
                    "largura": float(item["largura"]),
                    "comprimento": float(item["comprimento"]),
                    "tipo_registro": item["tipo_registro"],
                    "quantidade": int(item["quantidade"])
                })

        # Determinar dimensões padrão/cliente
        chapa_l = payload.chapa_l or 1200.0
        chapa_c = payload.chapa_c or 2400.0
        if payload.tipo_chapa == "cliente":
            if payload.chapa_cliente_l and payload.chapa_cliente_c:
                chapa_l = payload.chapa_cliente_l
                chapa_c = payload.chapa_cliente_c

        itens_dicts = [item.model_dump() for item in payload.itens]
        
        resultado = NestingEngine.nested_rectangles(
            itens=itens_dicts,
            chapa_l=chapa_l,
            chapa_c=chapa_c,
            gap=payload.gap,
            chapas_disponiveis=chapas_disponiveis
        )

        # Enriquecer com retalhos gerados
        for ch in resultado.get("chapas", []):
            if ch.get("tipo_registro") == "inteira" and ch.get("pecas"):
                max_c_usado = max((p["y"] + p["h"]) for p in ch["pecas"])
                sobra_c = ch["c"] - max_c_usado - payload.gap
                if sobra_c >= 150.0 and ch["l"] >= 150.0:
                    ch["retalho_gerado"] = {
                        "largura": ch["l"],
                        "comprimento": round(sobra_c, 2),
                        "material": payload.material or "AÇO CARBONO",
                        "espessura": payload.espessura or 3.18,
                        "tipo_material": None
                    }
                else:
                    ch["retalho_gerado"] = None
            else:
                ch["retalho_gerado"] = None

        return resultado
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao calcular nesting: {str(exc)}",
        )


@router.post("/dar-baixa-nesting")
async def dar_baixa_nesting(
    payload: BaixaNestingRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Dá baixa no estoque de chapas utilizadas em um arranjo aprovado e
    aloca as sobras (retalhos) geradas.
    """
    try:
        supabase = get_supabase_service_client()
        avisos = []
        
        for chapa in payload.chapas:
            chapa_id = chapa.id
            qtd_consumida = chapa.quantidade
            
            # Se for UUID de estoque cadastrado
            if chapa_id and chapa_id != "default":
                res = (
                    supabase.table("estoque_chapas")
                    .select("*")
                    .eq("id", chapa_id)
                    .eq("created_by", current_user["id"])
                    .single()
                    .execute()
                )
                
                if not res.data:
                    avisos.append(f"Chapa ID {chapa_id} não encontrada no estoque.")
                    continue
                    
                estoque_item = res.data
                qtd_atual = estoque_item["quantidade"]
                
                if qtd_atual < qtd_consumida:
                    avisos.append(
                        f"Estoque insuficiente para a chapa {estoque_item['material']} "
                        f"{estoque_item['espessura']}mm ({estoque_item['largura']}x{estoque_item['comprimento']}). "
                        f"Disponível: {qtd_atual}, Requerido: {qtd_consumida}."
                    )
                    nova_qtd = 0
                else:
                    nova_qtd = qtd_atual - qtd_consumida
                    
                # Atualizar estoque
                supabase.table("estoque_chapas").update({"quantidade": nova_qtd}).eq("id", chapa_id).execute()
                
                # Se era chapa inteira e sobrou retalho, salvar o retalho
                if chapa.tipo_registro == "inteira" and chapa.retalho_gerado:
                    ret = chapa.retalho_gerado
                    ret_data = {
                        "material": ret["material"],
                        "tipo_material": ret.get("tipo_material"),
                        "espessura": ret["espessura"],
                        "largura": ret["largura"],
                        "comprimento": ret["comprimento"],
                        "quantidade": 1,
                        "tipo_registro": "retalho",
                        "created_by": current_user["id"]
                    }
                    supabase.table("estoque_chapas").insert(ret_data).execute()
            else:
                # Se for chapa default (inteira) usada mas estamos em modo estoque, avisa
                if chapa.tipo_registro == "inteira" and chapa_id == "default":
                    avisos.append(
                        f"Chapa utilizada fora do estoque cadastrado ({chapa.largura}x{chapa.comprimento}mm)."
                    )
                    
        return {"status": "success", "avisos": avisos}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao dar baixa no estoque: {str(exc)}",
        )
