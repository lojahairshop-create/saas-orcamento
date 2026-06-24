"""
Rotas para o dashboard de resumo estatístico e faturamento.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.auth.dependencies import get_current_user
from app.database import get_supabase_service_client

router = APIRouter()


@router.get("/resumo")
async def obter_resumo_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Retorna estatísticas consolidadas dos orçamentos do usuário logado:
    - Faturamento cotado (soma de todos os orçamentos)
    - Taxa de aprovação (%)
    - Contagem de orçamentos por status
    - Histórico de faturamento mensal (últimos 6 meses)
    """
    try:
        supabase = get_supabase_service_client()
        user_id = current_user["id"]

        # Buscar todos os orçamentos do usuário
        result = (
            supabase.table("orcamentos")
            .select("status, total_preco, total_nf, created_at")
            .eq("created_by", user_id)
            .execute()
        )

        orcamentos = result.data or []

        total_orcamentos = len(orcamentos)
        total_aprovados = 0
        total_reprovados = 0
        total_pendentes = 0
        faturamento_cotado = 0.0  # Soma total de orçamentos criados
        faturamento_aprovado = 0.0  # Soma de orçamentos aprovados

        for orc in orcamentos:
            status_orc = orc.get("status")
            total = float(orc.get("total_preco") or 0)
            faturamento_cotado += total

            if status_orc == "aprovado":
                total_aprovados += 1
                faturamento_aprovado += total
            elif status_orc == "reprovado":
                total_reprovados += 1
            else:
                total_pendentes += 1

        # Cálculo da taxa de aprovação
        total_concluidos = total_aprovados + total_reprovados
        taxa_aprovacao = (
            round((total_aprovados / total_concluidos) * 100, 2)
            if total_concluidos > 0
            else 0.0
        )

        # Histórico de faturamento dos últimos 6 meses
        # Vamos agrupar os dados dos orçamentos em Python
        mensal_dict: Dict[str, Dict[str, float]] = {}
        
        # Inicializar os últimos 6 meses com valor zero
        now = datetime.now()
        for i in range(5, -1, -1):
            m_date = now - timedelta(days=i*30)
            m_key = m_date.strftime("%Y-%m")
            m_label = m_date.strftime("%b/%y").capitalize()
            mensal_dict[m_key] = {"mes": m_label, "cotado": 0.0, "aprovado": 0.0}

        for orc in orcamentos:
            created_str = orc.get("created_at")
            if not created_str:
                continue
            
            # Formato de data comum do PostgreSQL/Supabase
            try:
                # Ex: "2026-06-22T22:36:10.123+00:00"
                dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                m_key = dt.strftime("%Y-%m")
                if m_key in mensal_dict:
                    total = float(orc.get("total_preco") or 0)
                    mensal_dict[m_key]["cotado"] += total
                    if orc.get("status") == "aprovado":
                        mensal_dict[m_key]["aprovado"] += total
            except ValueError:
                continue

        # Ordenar os meses cronologicamente para a resposta
        historico_mensal = sorted(mensal_dict.values(), key=lambda x: datetime.strptime(x["mes"], "%b/%y"))

        return {
            "faturamento_cotado": round(faturamento_cotado, 2),
            "faturamento_aprovado": round(faturamento_aprovado, 2),
            "taxa_aprovacao": taxa_aprovacao,
            "total_orcamentos": total_orcamentos,
            "total_aprovados": total_aprovados,
            "total_reprovados": total_reprovados,
            "total_pendentes": total_pendentes,
            "faturamento_por_mes": historico_mensal,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar resumo do dashboard: {str(exc)}",
        )
