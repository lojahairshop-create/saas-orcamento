"""
Rotas para o estoque de chapas e sugestões de retalhos/chapas.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.auth.dependencies import get_current_user
from app.estoque.schemas import (
    EstoqueChapaCreate,
    EstoqueChapaUpdate,
    EstoqueChapaResponse,
    EstoqueSugestaoRequest,
    EstoqueSugestaoResponse,
)
from app.estoque.service import (
    list_estoque,
    create_estoque,
    update_estoque,
    delete_estoque,
    obter_sugestao_estoque,
)

router = APIRouter()


@router.get("/", response_model=List[EstoqueChapaResponse])
async def obter_estoque(current_user: dict = Depends(get_current_user)):
    """Retorna todo o estoque de chapas do usuário logado."""
    user_id = current_user["id"]
    return await list_estoque(user_id)


@router.post("/", response_model=EstoqueChapaResponse, status_code=status.HTTP_201_CREATED)
async def adicionar_chapa(
    payload: EstoqueChapaCreate,
    current_user: dict = Depends(get_current_user),
):
    """Adiciona uma nova chapa ou retalho ao estoque."""
    user_id = current_user["id"]
    return await create_estoque(payload, user_id)


@router.put("/{id}", response_model=EstoqueChapaResponse)
async def atualizar_chapa(
    id: str,
    payload: EstoqueChapaUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza dados de uma chapa/retalho existente no estoque."""
    user_id = current_user["id"]
    try:
        return await update_estoque(id, payload, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_chapa(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove um item do estoque de chapas."""
    user_id = current_user["id"]
    success = await delete_estoque(id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item de estoque não encontrado ou acesso negado.",
        )
    return None


@router.post("/sugestao", response_model=EstoqueSugestaoResponse)
async def obter_sugestao(
    payload: EstoqueSugestaoRequest,
    current_user: dict = Depends(get_current_user),
):
    """Retorna sugestões de chapas ou retalhos com base nos requisitos da peça."""
    user_id = current_user["id"]
    return await obter_sugestao_estoque(
        material=payload.material,
        espessura=payload.espessura,
        largura=payload.largura,
        comprimento=payload.comprimento,
        quantidade=payload.quantidade,
        user_id=user_id,
    )
