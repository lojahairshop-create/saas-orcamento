"""
Rotas de autenticação: login, registro e perfil.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database import get_supabase_client
from app.auth.dependencies import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    nome: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MessageResponse(BaseModel):
    mensagem: str
    user: Optional[dict] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    """Autentica o usuário e retorna um token de acesso."""
    try:
        supabase = get_supabase_client()
        response = supabase.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
        session = response.session
        user = response.user

        if session is None or user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha inválidos",
            )

        return TokenResponse(
            access_token=session.access_token,
            user={
                "id": user.id,
                "email": user.email,
                "nome": (user.user_metadata or {}).get("nome", ""),
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Erro na autenticação: {str(exc)}",
        )


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """Registra um novo usuário."""
    try:
        supabase = get_supabase_client()
        response = supabase.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {"data": {"nome": payload.nome}},
            }
        )
        user = response.user

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível criar a conta",
            )

        return MessageResponse(
            mensagem="Conta criada com sucesso. Verifique seu e-mail para confirmar.",
            user={
                "id": user.id,
                "email": user.email,
                "nome": payload.nome,
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao registrar: {str(exc)}",
        )


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Retorna os dados do usuário autenticado."""
    return current_user
