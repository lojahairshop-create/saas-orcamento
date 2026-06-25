"""
Rotas para gerenciamento de orçamentos (CRUD + PDF).
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import Optional

from app.auth.dependencies import get_current_user
from app.orcamentos.schemas import (
    OrcamentoCreate,
    OrcamentoUpdate,
    OrcamentoResponse,
    StatusUpdate,
)
from app.orcamentos import service
from app.pdf.generator import PDFGenerator

router = APIRouter()


@router.post("/", response_model=OrcamentoResponse, status_code=status.HTTP_201_CREATED)
async def criar_orcamento(
    payload: OrcamentoCreate,
    current_user: dict = Depends(get_current_user),
):
    """Cria um novo orçamento com todos os itens calculados."""
    try:
        return await service.create_orcamento(payload, current_user["id"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar orçamento: {str(exc)}",
        )


@router.get("/", response_model=dict)
async def listar_orçamentos(
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """Lista os orçamentos criados pelo usuário logado."""
    return await service.list_orcamentos(
        user_id=current_user["id"],
        status_filter=status,
        page=page,
        per_page=per_page,
    )


@router.get("/itens-para-nesting")
async def obter_itens_para_nesting(
    status: Optional[str] = None,
    orcamentos: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Busca itens de múltiplos orçamentos para nesting, filtrados por status ou IDs separados por vírgula."""
    try:
        orcamento_ids = None
        if orcamentos:
            orcamento_ids = [o.strip() for o in orcamentos.split(",") if o.strip()]
        return await service.get_itens_para_nesting(
            user_id=current_user["id"],
            status_filter=status,
            orcamento_ids=orcamento_ids
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao obter itens para nesting: {str(exc)}",
        )


@router.get("/{orcamento_id}", response_model=OrcamentoResponse)
async def obter_orcamento(
    orcamento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Busca os detalhes de um orçamento pelo ID."""
    try:
        return await service.get_orcamento(orcamento_id, current_user["id"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado ou acesso negado",
        )


@router.put("/{orcamento_id}", response_model=OrcamentoResponse)
async def atualizar_orcamento(
    orcamento_id: str,
    payload: OrcamentoUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza e recalcula um orçamento existente."""
    try:
        return await service.update_orcamento(orcamento_id, payload, current_user["id"])
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar orçamento: {str(exc)}",
        )


@router.patch("/{orcamento_id}/status", response_model=OrcamentoResponse)
async def atualizar_status(
    orcamento_id: str,
    payload: StatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza apenas o status de um orçamento (ex: aprovado, reprovado)."""
    try:
        return await service.update_status(orcamento_id, payload.status.value, current_user["id"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar status: {str(exc)}",
        )


@router.delete("/{orcamento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_orcamento(
    orcamento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove um orçamento e seus itens."""
    success = await service.delete_orcamento(orcamento_id, current_user["id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado ou acesso negado",
        )
    return None


@router.get("/{orcamento_id}/pdf")
async def exportar_pdf(
    orcamento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Gera e exporta o orçamento comercial em formato PDF."""
    try:
        orc = await service.get_orcamento(orcamento_id, current_user["id"])
        pdf_bytes = PDFGenerator.gerar_pdf_orcamento(orc)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=orcamento_{orc.numero}.pdf"
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao gerar PDF: {str(exc)}"
        )


@router.get("/{orcamento_id}/html")
async def exportar_html(
    orcamento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Gera e retorna o orçamento comercial em HTML com script de impressão automática do navegador."""
    try:
        orc = await service.get_orcamento(orcamento_id, current_user["id"])
        
        # Obter o caminho do template HTML
        import os
        from jinja2 import Environment, FileSystemLoader
        from datetime import datetime, timedelta
        
        template_dir = os.path.join(os.path.dirname(__file__), "..", "pdf", "templates")
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("orcamento.html")
        
        validade_dias = orc.validade or 30
        
        # Tratar created_at se for string ou datetime
        created_at_dt = orc.created_at
        if isinstance(created_at_dt, str):
            try:
                # Tenta parsear string ISO
                created_at_dt = datetime.fromisoformat(created_at_dt.replace("Z", "+00:00"))
            except Exception:
                created_at_dt = datetime.now()
        elif not created_at_dt:
            created_at_dt = datetime.now()

        validade_dt = created_at_dt + timedelta(days=validade_dias)
        validade_str = validade_dt.strftime("%d/%m/%Y")

        # Carregar as configurações gerais do banco (inclui a logo e dados da empresa)
        from app.database import get_supabase_service_client
        try:
            supabase = get_supabase_service_client()
            configs_res = supabase.table("configuracoes").select("*").limit(1).execute()
            configs_globais = configs_res.data[0] if configs_res.data else None
        except Exception as err:
            print(f"Erro ao carregar configuracoes gerais para o HTML: {err}")
            configs_globais = None

        html_rendered = template.render(
            orcamento=orc,
            validade_data=validade_str,
            datetime=datetime,
            configs_globais=configs_globais
        )
        
        # Adiciona um script JS simples no final do HTML para disparar a janela de impressão automaticamente
        html_with_print = html_rendered.replace(
            "</body>",
            "<script>window.onload = function() { window.print(); }</script></body>"
        )
        
        return Response(
            content=html_with_print,
            media_type="text/html"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao gerar visualização HTML: {str(exc)}"
        )


@router.get("/{orcamento_id}/nesting-html")
async def exportar_nesting_html(
    orcamento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Gera e retorna o relatório de arranjo de chapas em HTML com script de impressão automática."""
    try:
        orc = await service.get_orcamento(orcamento_id, current_user["id"])
        
        # Agrupar itens por material e espessura
        groups = {}
        for item in orc.itens:
            key = f"{item.material} - {item.espessura}mm"
            if key not in groups:
                groups[key] = []
            groups[key].append(item)
            
        # Calcular Nesting para cada grupo
        from app.engenharia.nesting import NestingEngine
        results = []
        for key, items in groups.items():
            valid_items = [it for it in items if it.largura > 0 and it.comprimento > 0]
            if not valid_items:
                continue
                
            chapa_l = valid_items[0].chapa_l or 1200.0
            chapa_c = valid_items[0].chapa_c or 2400.0
            
            payload_items = []
            for idx, it in enumerate(valid_items):
                payload_items.append({
                    "id": it.descricao or f"P{idx + 1}",
                    "largura": it.largura,
                    "comprimento": it.comprimento,
                    "quantidade": it.quantidade
                })
                
            res = NestingEngine.nested_rectangles(
                itens=payload_items,
                chapa_l=chapa_l,
                chapa_c=chapa_c,
                gap=5.0
            )
            
            results.append({
                "key": key,
                "chapa_l": chapa_l,
                "chapa_c": chapa_c,
                "aproveitamento_medio": res.get("aproveitamento_medio", 0),
                "total_chapas": res.get("total_chapas", 0),
                "chapas": res.get("chapas", [])
            })
            
        # Obter o caminho do template HTML
        import os
        from jinja2 import Environment, FileSystemLoader
        from datetime import datetime
        
        template_dir = os.path.join(os.path.dirname(__file__), "..", "pdf", "templates")
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("nesting_print.html")
        
        # Carregar as configurações gerais do banco
        from app.database import get_supabase_service_client
        try:
            supabase = get_supabase_service_client()
            configs_res = supabase.table("configuracoes").select("*").limit(1).execute()
            configs_globais = configs_res.data[0] if configs_res.data else None
        except Exception as err:
            print(f"Erro ao carregar configuracoes gerais para o nesting HTML: {err}")
            configs_globais = None
            
        html_rendered = template.render(
            orcamento=orc,
            results=results,
            datetime=datetime,
            configs_globais=configs_globais
        )
        
        # Script de impressão automática
        html_with_print = html_rendered.replace(
            "</body>",
            "<script>window.onload = function() { window.print(); }</script></body>"
        )
        
        return Response(
            content=html_with_print,
            media_type="text/html"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao gerar relatório de arranjo: {str(exc)}"
        )
