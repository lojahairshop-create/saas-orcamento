"""
Serviço para gerenciamento do estoque de chapas.
"""

from typing import List, Dict, Any, Optional
from app.database import get_supabase_service_client
from app.estoque.schemas import EstoqueChapaCreate, EstoqueChapaUpdate


async def list_estoque(user_id: str) -> List[Dict[str, Any]]:
    """Lista todos os itens em estoque criados pelo usuário."""
    supabase = get_supabase_service_client()
    res = supabase.table("estoque_chapas").select("*").eq("created_by", user_id).order("tipo_registro").execute()
    return res.data or []


async def create_estoque(data: EstoqueChapaCreate, user_id: str) -> Dict[str, Any]:
    """Cria um novo registro de chapa/retalho no estoque."""
    supabase = get_supabase_service_client()
    db_data = {
        "material": data.material,
        "tipo_material": data.tipo_material,
        "espessura": data.espessura,
        "largura": data.largura,
        "comprimento": data.comprimento,
        "quantidade": data.quantidade,
        "tipo_registro": data.tipo_registro,
        "created_by": user_id,
    }
    res = supabase.table("estoque_chapas").insert(db_data).execute()
    return res.data[0] if res.data else {}


async def update_estoque(id: str, data: EstoqueChapaUpdate, user_id: str) -> Dict[str, Any]:
    """Atualiza um item do estoque."""
    supabase = get_supabase_service_client()
    
    # Verificar existência e permissão
    existing = supabase.table("estoque_chapas").select("id").eq("id", id).eq("created_by", user_id).single().execute()
    if not existing.data:
        raise ValueError("Item de estoque não encontrado ou acesso negado.")
        
    update_dict = {}
    if data.material is not None: update_dict["material"] = data.material
    if data.tipo_material is not None: update_dict["tipo_material"] = data.tipo_material
    if data.espessura is not None: update_dict["espessura"] = data.espessura
    if data.largura is not None: update_dict["largura"] = data.largura
    if data.comprimento is not None: update_dict["comprimento"] = data.comprimento
    if data.quantidade is not None: update_dict["quantidade"] = data.quantidade
    if data.tipo_registro is not None: update_dict["tipo_registro"] = data.tipo_registro
    
    res = supabase.table("estoque_chapas").update(update_dict).eq("id", id).execute()
    return res.data[0] if res.data else {}


async def delete_estoque(id: str, user_id: str) -> bool:
    """Remove um item do estoque."""
    supabase = get_supabase_service_client()
    existing = supabase.table("estoque_chapas").select("id").eq("id", id).eq("created_by", user_id).single().execute()
    if not existing.data:
        return False
        
    supabase.table("estoque_chapas").delete().eq("id", id).execute()
    return True


async def obter_sugestao_estoque(
    material: str,
    espessura: float,
    largura: float,
    comprimento: float,
    quantidade: int,
    user_id: str
) -> Dict[str, Any]:
    """
    Busca no estoque e sugere a melhor opção de chapa para a peça:
    - Retalhos que caibam a peça (com ou sem rotação)
    - Chapa inteira disponível no estoque
    - Senão, sugere usar material do cliente
    """
    supabase = get_supabase_service_client()
    
    # Buscar todos os itens de estoque para este material/espessura
    res = (
        supabase.table("estoque_chapas")
        .select("*")
        .eq("material", material)
        .eq("espessura", espessura)
        .eq("created_by", user_id)
        .gt("quantidade", 0)
        .execute()
    )
    
    estoque = res.data or []
    
    retalhos = [item for item in estoque if item["tipo_registro"] == "retalho"]
    inteiras = [item for item in estoque if item["tipo_registro"] == "inteira"]
    
    # Filtrar retalhos onde a peça cabe (permitindo rotação de 90 graus)
    retalhos_validos = []
    for ret in retalhos:
        rw, rh = float(ret["largura"]), float(ret["comprimento"])
        # A peça de tamanho (largura, comprimento) cabe neste retalho?
        if (largura <= rw and comprimento <= rh) or (comprimento <= rw and largura <= rh):
            retalhos_validos.append(ret)
            
    # Ordenar retalhos válidos pelo tamanho (área), preferindo o menor retalho que caiba a peça
    retalhos_validos.sort(key=lambda r: float(r["largura"]) * float(r["comprimento"]))
    
    if retalhos_validos:
        melhor_retalho = retalhos_validos[0]
        sugestao = f"Sugerido: Usar retalho de {melhor_retalho['largura']}x{melhor_retalho['comprimento']} mm"
        opcao_sugerida = f"retalho_{melhor_retalho['id']}"
    elif inteiras:
        chapa = inteiras[0]
        sugestao = f"Sugerido: Usar chapa inteira (estoque disponível: {chapa['quantidade']} un)"
        opcao_sugerida = "chapa_inteira"
    else:
        sugestao = "Sugerido: Material do cliente ou comprar chapa (sem estoque)"
        opcao_sugerida = "cliente"
        
    return {
        "sugestao": sugestao,
        "opcao_sugerida": opcao_sugerida,
        "retalhos_disponiveis": [
            {
                "id": r["id"],
                "largura": float(r["largura"]),
                "comprimento": float(r["comprimento"]),
                "quantidade": r["quantidade"]
            }
            for r in retalhos_validos
        ]
    }
