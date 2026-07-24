"""
Camada de serviço para orçamentos – lógica de negócio + persistência.
"""

import json
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.database import get_supabase_service_client
from app.calculo.engine import CalculoEngine
from app.orcamentos.schemas import (
    OrcamentoCreate,
    OrcamentoUpdate,
    OrcamentoResponse,
    ItemCalculadoResponse,
    ClienteInfo,
    OperacaoItem,
)

engine = CalculoEngine()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_numero_orcamento() -> str:
    """Gera número sequencial no formato ORC-AAAA-NNNN."""
    supabase = get_supabase_service_client()
    year = datetime.now().year

    result = (
        supabase.table("orcamentos")
        .select("numero")
        .like("numero", f"ORC-{year}-%")
        .order("numero", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        last_num = result.data[0]["numero"]
        seq = int(last_num.split("-")[-1]) + 1
    else:
        seq = 1

    return f"ORC-{year}-{seq:04d}"


def _build_item_response(
    item_input: dict,
    calc_result: dict,
    operacoes: list,
) -> ItemCalculadoResponse:
    """Combina dados de entrada e resultado do cálculo em um ItemCalculadoResponse."""
    return ItemCalculadoResponse(
        descricao=item_input.get("descricao", ""),
        material=item_input.get("material", ""),
        tipo_material=item_input.get("tipo_material"),
        espessura=item_input.get("espessura", 0),
        largura=item_input.get("largura", 0),
        comprimento=item_input.get("comprimento", 0),
        perimetro=item_input.get("perimetro", 0),
        num_entradas=item_input.get("num_entradas", 1),
        quantidade=item_input.get("quantidade", 1),
        chapa_l=item_input.get("chapa_l", 1200),
        chapa_c=item_input.get("chapa_c", 2400),
        preco_kg=item_input.get("preco_kg", 0),
        margem_lucro=item_input.get("margem_lucro", 0.30),
        beneficiamento=item_input.get("beneficiamento", False),
        origem_material=item_input.get("origem_material", "chapa_inteira"),
        vetor_svg=item_input.get("vetor_svg"),
        velocidade=calc_result.get("velocidade", 0),
        peck=calc_result.get("peck", 0),
        tempo_corte_laser=calc_result.get("tempo_corte_laser", 0),
        area=calc_result.get("area", 0),
        peso_unitario=calc_result.get("peso_unitario", 0),
        peso_chapa=calc_result.get("peso_chapa", 0),
        pecas_por_chapa=calc_result.get("pecas_por_chapa", 0),
        qtd_chapas=calc_result.get("qtd_chapas", 0),
        sobra=calc_result.get("sobra", 0),
        retalho=calc_result.get("retalho", 0),
        peso_total=calc_result.get("peso_total", 0),
        custo_mp=calc_result.get("custo_mp", 0),
        total_fabricacao=calc_result.get("total_fabricacao", 0),
        custo_basico=calc_result.get("custo_basico", 0),
        valor_venda_sem_imp=calc_result.get("valor_venda_sem_imp", 0),
        preco_unitario_com_imp=calc_result.get("preco_unitario_com_imp", 0),
        preco_total=calc_result.get("preco_total", 0),
        icms=calc_result.get("icms", 0),
        ipi=calc_result.get("ipi", 0),
        pis=calc_result.get("pis", 0),
        cofins=calc_result.get("cofins", 0),
        total_tributos=calc_result.get("total_tributos", 0),
        total_nf=calc_result.get("total_nf", 0),
        comissao=calc_result.get("comissao", 0),
        operacoes=operacoes,
        observacoes=item_input.get("observacoes"),
        custo_extra=float(item_input.get("custo_extra", 0.0)),
        tempo_corte=float(item_input.get("tempo_corte", 0.0)),
        preco_pintura_kg=float(item_input.get("preco_pintura_kg", 0.0)),
    )


def _item_create_to_dict(item, taxa_comissao: float) -> dict:
    """Converte um ItemCreate (ou dict) para o formato esperado pelo engine."""
    if hasattr(item, "model_dump"):
        d = item.model_dump()
    else:
        d = dict(item)
    d["taxa_comissao"] = taxa_comissao
    return d


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def create_orcamento(
    data: OrcamentoCreate,
    user_id: str,
) -> OrcamentoResponse:
    """Cria um orçamento, calcula todos os itens e persiste no banco."""
    supabase = get_supabase_service_client()

    # Carregar custos de operação cadastrados no banco
    custos_res = supabase.table("custos_operacao").select("operacao, custo_hora").execute()
    custos_op = {c["operacao"]: float(c["custo_hora"]) for c in custos_res.data} if custos_res.data else {}

    # Preparar config para o engine
    config = {
        "estado": data.cliente.estado,
        "tipo_venda": data.tipo_venda,
        "ipi_rate": data.ipi_rate,
        "custos_operacao": custos_op,
    }

    # Converter itens para dicts
    items_dicts = [_item_create_to_dict(item, data.taxa_comissao) for item in data.itens]

    # Calcular
    resultado = engine.calcular_orcamento(items_dicts, config)

    # Gerar número
    numero = data.numero.strip() if (data.numero and data.numero.strip()) else _generate_numero_orcamento()

    # Inserir orçamento
    orc_data = {
        "numero": numero,
        "status": "rascunho",
        "cliente_nome": data.cliente.nome,
        "cliente_email": data.cliente.email or "",
        "cliente_telefone": data.cliente.telefone or "",
        "cliente_cnpj": data.cliente.cnpj or "",
        "cliente_endereco": data.cliente.endereco or "",
        "cliente_cidade": data.cliente.cidade or "",
        "cliente_estado": data.cliente.estado,
        "tipo_venda": data.tipo_venda,
        "ipi_rate": data.ipi_rate,
        "taxa_comissao": data.taxa_comissao,
        "condicao_pagamento": data.condicao_pagamento or "",
        "prazo_entrega": data.prazo_entrega or "",
        "frete": data.frete or "FOB",
        "validade": data.validade or 30,
        "observacoes": data.observacoes or "",
        "total_preco": resultado["total_preco"],
        "total_nf": resultado["total_nf"],
        "total_tributos": resultado["total_tributos"],
        "total_comissao": resultado["total_comissao"],
        "total_peso": resultado["total_peso"],
        "total_custo_mp": resultado["total_custo_mp"],
        "total_fabricacao": resultado["total_fabricacao"],
        "created_by": user_id,
    }

    orc_result = supabase.table("orcamentos").insert(orc_data).execute()
    orc_record = orc_result.data[0]
    orc_id = orc_record["id"]

    # Inserir itens
    items_responses: List[ItemCalculadoResponse] = []
    for i, item_input in enumerate(items_dicts):
        calc = resultado["items_calculados"][i]
        operacoes_list = item_input.get("operacoes", [])
        operacoes_json = (
            [op.model_dump() if hasattr(op, "model_dump") else op for op in operacoes_list]
        )

        item_db = {
            "orcamento_id": orc_id,
            "descricao": item_input.get("descricao", ""),
            "material": item_input.get("material", ""),
            "tipo_material": item_input.get("tipo_material"),
            "espessura": item_input.get("espessura", 0),
            "largura": item_input.get("largura", 0),
            "comprimento": item_input.get("comprimento", 0),
            "perimetro": item_input.get("perimetro", 0),
            "num_entradas": item_input.get("num_entradas", 1),
            "quantidade": item_input.get("quantidade", 1),
            "chapa_l": item_input.get("chapa_l", 1200),
            "chapa_c": item_input.get("chapa_c", 2400),
            "preco_kg": item_input.get("preco_kg", 0),
            "margem_lucro": item_input.get("margem_lucro", 0.30),
            "beneficiamento": item_input.get("beneficiamento", False),
            "origem_material": item_input.get("origem_material", "chapa_inteira"),
            "custo_extra": item_input.get("custo_extra", 0.0),
            "tempo_corte": item_input.get("tempo_corte", 0.0),
            "preco_pintura_kg": item_input.get("preco_pintura_kg", 0.0),
            "vetor_svg": item_input.get("vetor_svg"),
            "velocidade": calc.get("velocidade", 0),
            "peck": calc.get("peck", 0),
            "tempo_corte_laser": calc.get("tempo_corte_laser", 0),
            "area": calc.get("area", 0),
            "peso_unitario": calc.get("peso_unitario", 0),
            "peso_chapa": calc.get("peso_chapa", 0),
            "pecas_por_chapa": calc.get("pecas_por_chapa", 0),
            "qtd_chapas": calc.get("qtd_chapas", 0),
            "sobra": calc.get("sobra", 0),
            "retalho": calc.get("retalho", 0),
            "peso_total": calc.get("peso_total", 0),
            "custo_mp": calc.get("custo_mp", 0),
            "total_fabricacao": calc.get("total_fabricacao", 0),
            "custo_basico": calc.get("custo_basico", 0),
            "valor_venda_sem_imp": calc.get("valor_venda_sem_imp", 0),
            "preco_unitario_com_imp": calc.get("preco_unitario_com_imp", 0),
            "preco_total": calc.get("preco_total", 0),
            "icms_valor": calc.get("icms", 0),
            "ipi_valor": calc.get("ipi", 0),
            "pis_valor": calc.get("pis", 0),
            "cofins_valor": calc.get("cofins", 0),
            "total_tributos": calc.get("total_tributos", 0),
            "total_nf": calc.get("total_nf", 0),
            "comissao": calc.get("comissao", 0),
            "observacoes": item_input.get("observacoes", ""),
            "operacoes": json.dumps(operacoes_json),
        }

        supabase.table("orcamento_itens").insert(item_db).execute()

        operacoes_model = [
            OperacaoItem(**(op if isinstance(op, dict) else op.model_dump()))
            for op in operacoes_list
            if isinstance(op, dict) or hasattr(op, "model_dump")
        ]
        items_responses.append(
            _build_item_response(item_input, calc, operacoes_model)
        )

    return OrcamentoResponse(
        id=orc_id,
        numero=numero,
        status="rascunho",
        cliente=data.cliente,
        itens=items_responses,
        tipo_venda=data.tipo_venda,
        ipi_rate=data.ipi_rate,
        taxa_comissao=data.taxa_comissao,
        condicao_pagamento=data.condicao_pagamento,
        prazo_entrega=data.prazo_entrega,
        frete=data.frete or "FOB",
        validade=data.validade,
        observacoes=data.observacoes,
        total_preco=resultado["total_preco"],
        total_nf=resultado["total_nf"],
        total_tributos=resultado["total_tributos"],
        total_comissao=resultado["total_comissao"],
        total_peso=resultado["total_peso"],
        total_custo_mp=resultado["total_custo_mp"],
        total_fabricacao=resultado["total_fabricacao"],
        created_at=orc_record.get("created_at"),
        updated_at=orc_record.get("updated_at"),
        created_by=user_id,
    )


async def get_orcamento(orcamento_id: str, user_id: str) -> OrcamentoResponse:
    """Busca um orçamento pelo ID com seus itens."""
    supabase = get_supabase_service_client()

    orc_result = (
        supabase.table("orcamentos")
        .select("*")
        .eq("id", orcamento_id)
        .eq("created_by", user_id)
        .single()
        .execute()
    )
    orc = orc_result.data

    items_result = (
        supabase.table("orcamento_itens")
        .select("*")
        .eq("orcamento_id", orcamento_id)
        .execute()
    )

    itens_response: List[ItemCalculadoResponse] = []
    for item_db in items_result.data:
        operacoes_raw = item_db.get("operacoes", "[]")
        if isinstance(operacoes_raw, str):
            operacoes_list = json.loads(operacoes_raw)
        else:
            operacoes_list = operacoes_raw or []

        operacoes_model = [OperacaoItem(**op) for op in operacoes_list]

        itens_response.append(
            ItemCalculadoResponse(
                descricao=item_db.get("descricao", ""),
                material=item_db.get("material", ""),
                tipo_material=item_db.get("tipo_material"),
                espessura=item_db.get("espessura", 0),
                largura=item_db.get("largura", 0),
                comprimento=item_db.get("comprimento", 0),
                perimetro=item_db.get("perimetro", 0),
                num_entradas=item_db.get("num_entradas", 1),
                quantidade=item_db.get("quantidade", 1),
                chapa_l=item_db.get("chapa_l", 1200),
                chapa_c=item_db.get("chapa_c", 2400),
                preco_kg=item_db.get("preco_kg", 0),
                margem_lucro=item_db.get("margem_lucro", 0.30),
                beneficiamento=item_db.get("beneficiamento", False),
                origem_material=item_db.get("origem_material", "chapa_inteira"),
                vetor_svg=item_db.get("vetor_svg"),
                velocidade=item_db.get("velocidade", 0),
                peck=item_db.get("peck", 0),
                tempo_corte_laser=item_db.get("tempo_corte_laser", 0),
                area=item_db.get("area", 0),
                peso_unitario=item_db.get("peso_unitario", 0),
                peso_chapa=item_db.get("peso_chapa", 0),
                pecas_por_chapa=item_db.get("pecas_por_chapa", 0),
                qtd_chapas=item_db.get("qtd_chapas", 0),
                sobra=item_db.get("sobra", 0),
                retalho=item_db.get("retalho", 0),
                peso_total=item_db.get("peso_total", 0),
                custo_mp=item_db.get("custo_mp", 0),
                total_fabricacao=item_db.get("total_fabricacao", 0),
                custo_basico=item_db.get("custo_basico", 0),
                valor_venda_sem_imp=item_db.get("valor_venda_sem_imp", 0),
                preco_unitario_com_imp=item_db.get("preco_unitario_com_imp", 0),
                preco_total=item_db.get("preco_total", 0),
                icms=item_db.get("icms_valor", 0),
                ipi=item_db.get("ipi_valor", 0),
                pis=item_db.get("pis_valor", 0),
                cofins=item_db.get("cofins_valor", 0),
                total_tributos=item_db.get("total_tributos", 0),
                total_nf=item_db.get("total_nf", 0),
                comissao=item_db.get("comissao", 0),
                operacoes=operacoes_model,
                observacoes=item_db.get("observacoes"),
                custo_extra=float(item_db.get("custo_extra", 0.0)),
                tempo_corte=float(item_db.get("tempo_corte", 0.0)),
                preco_pintura_kg=float(item_db.get("preco_pintura_kg", 0.0)),
            )
        )

    return OrcamentoResponse(
        id=orc["id"],
        numero=orc.get("numero"),
        status=orc.get("status", "rascunho"),
        cliente=ClienteInfo(
            nome=orc.get("cliente_nome", ""),
            email=orc.get("cliente_email"),
            telefone=orc.get("cliente_telefone"),
            cnpj=orc.get("cliente_cnpj"),
            endereco=orc.get("cliente_endereco"),
            cidade=orc.get("cliente_cidade"),
            estado=orc.get("cliente_estado", "SP"),
        ),
        itens=itens_response,
        tipo_venda=orc.get("tipo_venda", "pecas"),
        ipi_rate=orc.get("ipi_rate", 0.05),
        taxa_comissao=orc.get("taxa_comissao", 0.03),
        condicao_pagamento=orc.get("condicao_pagamento"),
        prazo_entrega=orc.get("prazo_entrega"),
        frete=orc.get("frete", "FOB"),
        validade=orc.get("validade", 30),
        observacoes=orc.get("observacoes"),
        total_preco=orc.get("total_preco", 0),
        total_nf=orc.get("total_nf", 0),
        total_tributos=orc.get("total_tributos", 0),
        total_comissao=orc.get("total_comissao", 0),
        total_peso=orc.get("total_peso", 0),
        total_custo_mp=orc.get("total_custo_mp", 0),
        total_fabricacao=orc.get("total_fabricacao", 0),
        created_at=orc.get("created_at"),
        updated_at=orc.get("updated_at"),
        created_by=orc.get("created_by"),
    )


async def list_orcamentos(
    user_id: str,
    status_filter: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    """Lista orçamentos com filtros e paginação."""
    supabase = get_supabase_service_client()

    query = (
        supabase.table("orcamentos")
        .select("*", count="exact")
        .eq("created_by", user_id)
        .order("created_at", desc=True)
    )

    if status_filter:
        query = query.eq("status", status_filter)

    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)

    result = query.execute()

    items = []
    for orc in result.data:
        items.append(
            {
                "id": orc["id"],
                "numero": orc.get("numero"),
                "status": orc.get("status"),
                "cliente_nome": orc.get("cliente_nome"),
                "cliente_estado": orc.get("cliente_estado"),
                "total_preco": orc.get("total_preco", 0),
                "total_nf": orc.get("total_nf", 0),
                "created_at": orc.get("created_at"),
                "updated_at": orc.get("updated_at"),
            }
        )

    return {
        "items": items,
        "total": result.count or len(result.data),
        "page": page,
        "per_page": per_page,
    }


async def update_orcamento(
    orcamento_id: str,
    data: OrcamentoUpdate,
    user_id: str,
) -> OrcamentoResponse:
    """Atualiza um orçamento e recalcula se itens mudarem."""
    supabase = get_supabase_service_client()

    # Verificar permissão
    existing = (
        supabase.table("orcamentos")
        .select("id")
        .eq("id", orcamento_id)
        .eq("created_by", user_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise ValueError("Orçamento não encontrado")

    update_data: Dict[str, Any] = {}

    # Atualizar dados do cliente
    if data.cliente:
        update_data["cliente_nome"] = data.cliente.nome
        if data.cliente.email is not None:
            update_data["cliente_email"] = data.cliente.email
        if data.cliente.telefone is not None:
            update_data["cliente_telefone"] = data.cliente.telefone
        if data.cliente.cnpj is not None:
            update_data["cliente_cnpj"] = data.cliente.cnpj
        if data.cliente.endereco is not None:
            update_data["cliente_endereco"] = data.cliente.endereco
        if data.cliente.cidade is not None:
            update_data["cliente_cidade"] = data.cliente.cidade
        update_data["cliente_estado"] = data.cliente.estado

    if data.tipo_venda is not None:
        update_data["tipo_venda"] = data.tipo_venda
    if data.ipi_rate is not None:
        update_data["ipi_rate"] = data.ipi_rate
    if data.taxa_comissao is not None:
        update_data["taxa_comissao"] = data.taxa_comissao
    if data.condicao_pagamento is not None:
        update_data["condicao_pagamento"] = data.condicao_pagamento
    if data.prazo_entrega is not None:
        update_data["prazo_entrega"] = data.prazo_entrega
    if data.frete is not None:
        update_data["frete"] = data.frete
    if data.validade is not None:
        update_data["validade"] = data.validade
    if data.numero and data.numero.strip():
        update_data["numero"] = data.numero.strip()
    if data.observacoes is not None:
        update_data["observacoes"] = data.observacoes

    # Recalcular se itens mudaram
    if data.itens is not None:
        # Buscar estado do cliente
        orc_current = (
            supabase.table("orcamentos")
            .select("cliente_estado, tipo_venda, ipi_rate, taxa_comissao")
            .eq("id", orcamento_id)
            .single()
            .execute()
        )
        orc_info = orc_current.data

        estado = (
            data.cliente.estado
            if data.cliente
            else orc_info.get("cliente_estado", "SP")
        )
        tipo_venda = data.tipo_venda or orc_info.get("tipo_venda", "pecas")
        ipi_rate = (
            data.ipi_rate if data.ipi_rate is not None else orc_info.get("ipi_rate", 0.05)
        )
        taxa_comissao = (
            data.taxa_comissao
            if data.taxa_comissao is not None
            else orc_info.get("taxa_comissao", 0.03)
        )

        # Carregar custos de operação cadastrados no banco
        custos_res = supabase.table("custos_operacao").select("operacao, custo_hora").execute()
        custos_op = {c["operacao"]: float(c["custo_hora"]) for c in custos_res.data} if custos_res.data else {}

        config = {
            "estado": estado,
            "tipo_venda": tipo_venda,
            "ipi_rate": ipi_rate,
            "custos_operacao": custos_op,
        }

        items_dicts = [_item_create_to_dict(item, taxa_comissao) for item in data.itens]
        resultado = engine.calcular_orcamento(items_dicts, config)

        update_data.update(
            {
                "total_preco": resultado["total_preco"],
                "total_nf": resultado["total_nf"],
                "total_tributos": resultado["total_tributos"],
                "total_comissao": resultado["total_comissao"],
                "total_peso": resultado["total_peso"],
                "total_custo_mp": resultado["total_custo_mp"],
                "total_fabricacao": resultado["total_fabricacao"],
            }
        )

        # Remover itens antigos e inserir novos
        supabase.table("orcamento_itens").delete().eq(
            "orcamento_id", orcamento_id
        ).execute()

        for i, item_input in enumerate(items_dicts):
            calc = resultado["items_calculados"][i]
            operacoes_list = item_input.get("operacoes", [])
            operacoes_json = [
                op.model_dump() if hasattr(op, "model_dump") else op
                for op in operacoes_list
            ]

            item_db = {
                "orcamento_id": orcamento_id,
                "descricao": item_input.get("descricao", ""),
                "material": item_input.get("material", ""),
                "tipo_material": item_input.get("tipo_material"),
                "espessura": item_input.get("espessura", 0),
                "largura": item_input.get("largura", 0),
                "comprimento": item_input.get("comprimento", 0),
                "perimetro": item_input.get("perimetro", 0),
                "num_entradas": item_input.get("num_entradas", 1),
                "quantidade": item_input.get("quantidade", 1),
                "chapa_l": item_input.get("chapa_l", 1200),
                "chapa_c": item_input.get("chapa_c", 2400),
                "preco_kg": item_input.get("preco_kg", 0),
                "margem_lucro": item_input.get("margem_lucro", 0.30),
                "beneficiamento": item_input.get("beneficiamento", False),
                "origem_material": item_input.get("origem_material", "chapa_inteira"),
                "custo_extra": item_input.get("custo_extra", 0.0),
                "tempo_corte": item_input.get("tempo_corte", 0.0),
                "vetor_svg": item_input.get("vetor_svg"),
                "velocidade": calc.get("velocidade", 0),
                "peck": calc.get("peck", 0),
                "tempo_corte_laser": calc.get("tempo_corte_laser", 0),
                "area": calc.get("area", 0),
                "peso_unitario": calc.get("peso_unitario", 0),
                "peso_chapa": calc.get("peso_chapa", 0),
                "pecas_por_chapa": calc.get("pecas_por_chapa", 0),
                "qtd_chapas": calc.get("qtd_chapas", 0),
                "sobra": calc.get("sobra", 0),
                "retalho": calc.get("retalho", 0),
                "peso_total": calc.get("peso_total", 0),
                "custo_mp": calc.get("custo_mp", 0),
                "total_fabricacao": calc.get("total_fabricacao", 0),
                "custo_basico": calc.get("custo_basico", 0),
                "valor_venda_sem_imp": calc.get("valor_venda_sem_imp", 0),
                "preco_unitario_com_imp": calc.get("preco_unitario_com_imp", 0),
                "preco_total": calc.get("preco_total", 0),
                "icms_valor": calc.get("icms", 0),
                "ipi_valor": calc.get("ipi", 0),
                "pis_valor": calc.get("pis", 0),
                "cofins_valor": calc.get("cofins", 0),
                "total_tributos": calc.get("total_tributos", 0),
                "total_nf": calc.get("total_nf", 0),
                "comissao": calc.get("comissao", 0),
                "observacoes": item_input.get("observacoes", ""),
                "operacoes": json.dumps(operacoes_json),
            }
            supabase.table("orcamento_itens").insert(item_db).execute()

    if update_data:
        supabase.table("orcamentos").update(update_data).eq(
            "id", orcamento_id
        ).execute()

    return await get_orcamento(orcamento_id, user_id)


async def update_status(
    orcamento_id: str,
    status: str,
    user_id: str,
) -> OrcamentoResponse:
    """Atualiza apenas o status do orçamento, processando estoque se aprovado."""
    supabase = get_supabase_service_client()

    # Buscar status atual do orçamento
    orc_res = (
        supabase.table("orcamentos")
        .select("status")
        .eq("id", orcamento_id)
        .eq("created_by", user_id)
        .single()
        .execute()
    )
    
    if not orc_res.data:
        raise ValueError("Orçamento não encontrado ou acesso negado.")
        
    old_status = orc_res.data["status"]

    # Atualizar o status
    supabase.table("orcamentos").update({"status": status}).eq(
        "id", orcamento_id
    ).eq("created_by", user_id).execute()

    # Lógica de estoque ao aprovar o orçamento
    if old_status != "aprovado" and status == "aprovado":
        # Buscar itens do orçamento
        items_res = (
            supabase.table("orcamento_itens")
            .select("*")
            .eq("orcamento_id", orcamento_id)
            .execute()
        )
        items = items_res.data or []

        from app.engenharia.nesting import NestingEngine

        for item in items:
            origem = item.get("origem_material", "chapa_inteira")
            
            if origem == "cliente":
                # Material do cliente: não altera o estoque
                continue

            elif origem == "chapa_inteira":
                # 1. Subtrair chapas inteiras do estoque
                qtd_chapas_necessarias = int(item.get("qtd_chapas", 0))
                if qtd_chapas_necessarias > 0:
                    full_sheets = (
                        supabase.table("estoque_chapas")
                        .select("*")
                        .eq("material", item["material"])
                        .eq("espessura", item["espessura"])
                        .eq("tipo_registro", "inteira")
                        .eq("created_by", user_id)
                        .gt("quantidade", 0)
                        .execute()
                    )
                    
                    qtd_restante = qtd_chapas_necessarias
                    for sheet in (full_sheets.data or []):
                        if qtd_restante <= 0:
                            break
                        deduct = min(qtd_restante, sheet["quantidade"])
                        new_qty = sheet["quantidade"] - deduct
                        supabase.table("estoque_chapas").update({"quantidade": new_qty}).eq("id", sheet["id"]).execute()
                        qtd_restante -= deduct

                # 2. Calcular e gerar retalho se houver sobra útil
                try:
                    itens_nesting = [{
                        "id": str(item["id"]),
                        "largura": float(item["largura"]),
                        "comprimento": float(item["comprimento"]),
                        "quantidade": int(item["quantidade"])
                    }]
                    chapa_l = float(item.get("chapa_l", 1200))
                    chapa_c = float(item.get("chapa_c", 2400))
                    
                    result_nesting = NestingEngine.nested_rectangles(
                        itens=itens_nesting,
                        chapa_l=chapa_l,
                        chapa_c=chapa_c,
                        gap=5.0
                    )
                    
                    for ch in result_nesting.get("chapas", []):
                        pecas_chapa = ch.get("pecas", [])
                        if not pecas_chapa:
                            continue
                        
                        max_y = max(p["y"] + p["h"] for p in pecas_chapa)
                        comprimento_sobra = chapa_c - max_y
                        
                        if comprimento_sobra >= 200.0:
                            db_retalho = {
                                "material": item["material"],
                                "tipo_material": item.get("tipo_material"),
                                "espessura": item["espessura"],
                                "largura": chapa_l,
                                "comprimento": comprimento_sobra,
                                "quantidade": 1,
                                "tipo_registro": "retalho",
                                "created_by": user_id,
                            }
                            supabase.table("estoque_chapas").insert(db_retalho).execute()
                except Exception as e:
                    # Log ou print do erro de nesting/retalho, sem travar aprovação
                    print(f"Erro ao processar retalho para item {item['id']}: {e}")

            elif origem.startswith("retalho_"):
                # Subtrair/consumir o retalho específico do estoque
                remnant_id = origem.replace("retalho_", "")
                rem_res = (
                    supabase.table("estoque_chapas")
                    .select("*")
                    .eq("id", remnant_id)
                    .eq("created_by", user_id)
                    .execute()
                )
                
                if rem_res.data:
                    rem = rem_res.data[0]
                    new_qty = max(0, rem["quantidade"] - 1)
                    if new_qty == 0:
                        supabase.table("estoque_chapas").delete().eq("id", remnant_id).execute()
                    else:
                        supabase.table("estoque_chapas").update({"quantidade": new_qty}).eq("id", remnant_id).execute()

    return await get_orcamento(orcamento_id, user_id)


async def delete_orcamento(orcamento_id: str, user_id: str) -> bool:
    """Exclui um orçamento e seus itens (cascade)."""
    supabase = get_supabase_service_client()

    # Itens são excluídos automaticamente via ON DELETE CASCADE
    result = (
        supabase.table("orcamentos")
        .delete()
        .eq("id", orcamento_id)
        .eq("created_by", user_id)
        .execute()
    )

    return bool(result.data)


async def get_itens_para_nesting(
    user_id: str,
    status_filter: Optional[str] = None,
    orcamento_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Busca itens de múltiplos orçamentos para otimização de aproveitamento/nesting."""
    supabase = get_supabase_service_client()

    query = supabase.table("orcamentos").select("id, numero, cliente_nome").eq("created_by", user_id)
    if status_filter:
        query = query.eq("status", status_filter)
    if orcamento_ids:
        query = query.in_("id", orcamento_ids)

    orc_res = query.execute()
    orcamentos = {orc["id"]: orc for orc in orc_res.data}

    if not orcamentos:
        return []

    ids = list(orcamentos.keys())

    # Busca itens desses orçamentos
    items_res = (
        supabase.table("orcamento_itens")
        .select("id, orcamento_id, descricao, material, espessura, largura, comprimento, quantidade, chapa_l, chapa_c, vetor_svg")
        .in_("orcamento_id", ids)
        .execute()
    )

    result = []
    for item in items_res.data:
        orc = orcamentos.get(item["orcamento_id"], {})
        result.append({
            "id": item["id"],
            "orcamento_id": item["orcamento_id"],
            "orcamento_numero": orc.get("numero", ""),
            "cliente_nome": orc.get("cliente_nome", ""),
            "descricao": item["descricao"],
            "material": item["material"],
            "espessura": float(item["espessura"]),
            "largura": float(item["largura"]),
            "comprimento": float(item["comprimento"]),
            "quantidade": int(item["quantidade"]),
            "chapa_l": float(item["chapa_l"]),
            "chapa_c": float(item["chapa_c"]),
            "vetor_svg": item.get("vetor_svg"),
        })

    return result

