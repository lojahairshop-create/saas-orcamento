"""
Ponto de entrada da API – FastAPI application factory.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.orcamentos.router import router as orcamentos_router
from app.configuracoes.router import router as configuracoes_router
from app.dashboard.router import router as dashboard_router
from app.engenharia.router import router as engenharia_router

app = FastAPI(
    title="SaaS Orçamentos Metalúrgicos - API",
    description=(
        "API para gestão de orçamentos metalúrgicos com cálculo automático "
        "de custos, impostos, corte laser e nesting de chapas."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – permite todas as origens em desenvolvimento
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router, prefix="/auth", tags=["Autenticação"])
app.include_router(orcamentos_router, prefix="/orcamentos", tags=["Orçamentos"])
app.include_router(configuracoes_router, prefix="/configuracoes", tags=["Configurações"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(engenharia_router, prefix="/engenharia", tags=["Engenharia"])


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
async def health_check():
    """Verifica se a API está online."""
    return {"status": "online", "version": "1.0.0"}
