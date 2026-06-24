"""
Rotas para CRUD de tabelas de configurações administrativas (Impostos, Materiais, Parâmetros Laser, Custos/Hora).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from app.auth.dependencies import get_current_user
from app.database import get_supabase_service_client
from app.configuracoes.schemas import (
    ConfigGlobaisResponse,
    ConfigGlobaisBase,
    ImpostoEstadoResponse,
    ImpostoEstadoBase,
    MaterialResponse,
    MaterialBase,
    ParametroLaserResponse,
    ParametroLaserBase,
    CustoOperacaoResponse,
    CustoOperacaoBase,
    MedidaChapaResponse,
    MedidaChapaBase,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Global Configurations
# ---------------------------------------------------------------------------

@router.get("/globais", response_model=Optional[ConfigGlobaisResponse])
async def obter_configs_globais(current_user: dict = Depends(get_current_user)):
    """Busca as configurações gerais do sistema (alíquotas base, comissões)."""
    supabase = get_supabase_service_client()
    result = supabase.table("configuracoes").select("*").limit(1).execute()
    if not result.data:
        return None
    return result.data[0]


@router.post("/globais", response_model=ConfigGlobaisResponse)
async def salvar_configs_globais(
    payload: ConfigGlobaisBase,
    current_user: dict = Depends(get_current_user),
):
    """Cria ou atualiza as configurações gerais do sistema."""
    supabase = get_supabase_service_client()
    # Verifica se já existe
    existing = supabase.table("configuracoes").select("id").limit(1).execute()
    if existing.data:
        # Update
        config_id = existing.data[0]["id"]
        result = (
            supabase.table("configuracoes")
            .update(payload.model_dump())
            .eq("id", config_id)
            .execute()
        )
    else:
        # Insert
        result = supabase.table("configuracoes").insert(payload.model_dump()).execute()

    return result.data[0]


# ---------------------------------------------------------------------------
# Impostos por Estado
# ---------------------------------------------------------------------------

@router.get("/impostos-estados", response_model=List[ImpostoEstadoResponse])
async def listar_impostos_estados(current_user: dict = Depends(get_current_user)):
    """Lista as alíquotas de impostos cadastradas por estado."""
    supabase = get_supabase_service_client()
    result = supabase.table("impostos_estados").select("*").order("uf").execute()
    return result.data


@router.put("/impostos-estados/{uf}", response_model=ImpostoEstadoResponse)
async def atualizar_imposto_estado(
    uf: str,
    payload: ImpostoEstadoBase,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza as alíquotas de impostos de um estado específico."""
    supabase = get_supabase_service_client()
    result = (
        supabase.table("impostos_estados")
        .update(payload.model_dump())
        .eq("uf", uf.upper())
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estado {uf} não encontrado.",
        )
    return result.data[0]


# ---------------------------------------------------------------------------
# Materiais
# ---------------------------------------------------------------------------

@router.get("/materiais", response_model=List[MaterialResponse])
async def listar_materiais(current_user: dict = Depends(get_current_user)):
    """Lista todos os materiais e seus preços por KG cadastrados."""
    supabase = get_supabase_service_client()
    result = supabase.table("materiais").select("*").order("nome").execute()
    return result.data


@router.post("/materiais", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def criar_material(
    payload: MaterialBase,
    current_user: dict = Depends(get_current_user),
):
    """Cadastra um novo material."""
    supabase = get_supabase_service_client()
    result = supabase.table("materiais").insert(payload.model_dump()).execute()
    return result.data[0]


@router.put("/materiais/{material_id}", response_model=MaterialResponse)
async def atualizar_material(
    material_id: str,
    payload: MaterialBase,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza dados e preço de um material cadastrado."""
    supabase = get_supabase_service_client()
    result = (
        supabase.table("materiais")
        .update(payload.model_dump())
        .eq("id", material_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material não encontrado.",
        )
    return result.data[0]


@router.delete("/materiais/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_material(
    material_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove um material do cadastro."""
    supabase = get_supabase_service_client()
    result = supabase.table("materiais").delete().eq("id", material_id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material não encontrado.",
        )
    return None


# ---------------------------------------------------------------------------
# Parâmetros Laser
# ---------------------------------------------------------------------------

@router.get("/parametros-laser", response_model=List[ParametroLaserResponse])
async def listar_parametros_laser(
    material: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Lista parâmetros de velocidade de corte por material/espessura."""
    supabase = get_supabase_service_client()
    query = supabase.table("parametros_laser").select("*")
    if material:
        query = query.eq("material", material.upper())
    result = query.order("material").order("espessura").execute()
    return result.data


@router.post("/parametros-laser", response_model=ParametroLaserResponse, status_code=status.HTTP_201_CREATED)
async def criar_parametro_laser(
    payload: ParametroLaserBase,
    current_user: dict = Depends(get_current_user),
):
    """Cadastra um novo parâmetro de velocidade de corte a laser."""
    supabase = get_supabase_service_client()
    result = supabase.table("parametros_laser").insert(payload.model_dump()).execute()
    return result.data[0]


@router.put("/parametros-laser/{param_id}", response_model=ParametroLaserResponse)
async def atualizar_parametro_laser(
    param_id: str,
    payload: ParametroLaserBase,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza dados de avanço/peck para corte a laser."""
    supabase = get_supabase_service_client()
    result = (
        supabase.table("parametros_laser")
        .update(payload.model_dump())
        .eq("id", param_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parâmetro não encontrado.",
        )
    return result.data[0]


@router.delete("/parametros-laser/{param_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_parametro_laser(
    param_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Deleta um parâmetro de corte a laser."""
    supabase = get_supabase_service_client()
    result = supabase.table("parametros_laser").delete().eq("id", param_id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parâmetro não encontrado.",
        )
    return None


# ---------------------------------------------------------------------------
# Custos por Hora (Operações)
# ---------------------------------------------------------------------------

@router.get("/custos-operacao", response_model=List[CustoOperacaoResponse])
async def listar_custos_operacao(current_user: dict = Depends(get_current_user)):
    """Lista o valor/hora cobrado para cada tipo de operação de fabricação."""
    supabase = get_supabase_service_client()
    result = supabase.table("custos_operacao").select("*").order("operacao").execute()
    return result.data


@router.put("/custos-operacao/{custo_id}", response_model=CustoOperacaoResponse)
async def atualizar_custo_operacao(
    custo_id: str,
    payload: CustoOperacaoBase,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza o custo/hora de uma operação específica."""
    supabase = get_supabase_service_client()
    result = (
        supabase.table("custos_operacao")
        .update(payload.model_dump())
        .eq("id", custo_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operação não encontrada.",
        )
    return result.data[0]


# ---------------------------------------------------------------------------
# Medidas de Chapa
# ---------------------------------------------------------------------------

@router.get("/medidas-chapas", response_model=List[MedidaChapaResponse])
async def listar_medidas_chapas(current_user: dict = Depends(get_current_user)):
    """Lista as medidas padrão de chapas cadastradas no sistema."""
    supabase = get_supabase_service_client()
    result = supabase.table("medidas_chapas").select("*").order("largura").execute()
    return result.data


@router.post("/medidas-chapas", response_model=MedidaChapaResponse, status_code=status.HTTP_201_CREATED)
async def criar_medida_chapa(
    payload: MedidaChapaBase,
    current_user: dict = Depends(get_current_user),
):
    """Cadastra um novo tamanho padrão de chapa comercial."""
    supabase = get_supabase_service_client()
    result = supabase.table("medidas_chapas").insert(payload.model_dump()).execute()
    return result.data[0]


@router.delete("/medidas-chapas/{medida_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_medida_chapa(
    medida_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove um tamanho de chapa comercial do cadastro."""
    supabase = get_supabase_service_client()
    result = supabase.table("medidas_chapas").delete().eq("id", medida_id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medida de chapa não encontrada.",
        )
    return None
