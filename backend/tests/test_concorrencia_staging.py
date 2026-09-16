import asyncio
import uuid
import sys
import os

# Adiciona o backend ao path para podermos importar a aplicação
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_supabase_service_client
from app.orcamentos.schemas import OrcamentoCreate, ClienteInfo, ItemCreate
from app.orcamentos.service import create_orcamento

async def run_concurrency_test(iteration: int):
    supabase = get_supabase_service_client()
    user_id = str(uuid.uuid4()) # ID mock para a sessão do teste
    
    # ---------------------------------------------------------
    # SETUP DETERMINÍSTICO
    # 1. Limpar todos os retalhos de um material fantasma
    # 2. Inserir exatamente UM retalho que serve perfeitamente
    # ---------------------------------------------------------
    material_teste = 'TESTE_CONCORRENCIA'
    espessura_teste = 2.0
    
    # Limpa lixo de testes anteriores
    supabase.table("estoque_chapas").delete().eq("material", material_teste).execute()
    
    # Insere O retalho alvo
    retalho_alvo_id = str(uuid.uuid4())
    supabase.table("estoque_chapas").insert({
        "id": retalho_alvo_id,
        "material": material_teste,
        "espessura": espessura_teste,
        "largura": 500,
        "comprimento": 500,
        "quantidade": 1,
        "tipo_registro": "retalho",
        "status": "disponivel",
        "valor_contabil": 100,
        "created_by": None
    }).execute()
    
    print(f"\n--- Iniciando Rodada {iteration+1}/10 ---")
    print(f"Retalho único de 500x500 criado (ID: {retalho_alvo_id[:8]}...)")
    
    # Configurar payload dos orçamentos (ambos pedirão 400x400, precisando do mesmo retalho)
    def criar_payload(numero: str) -> OrcamentoCreate:
        return OrcamentoCreate(
            numero=numero,
            cliente=ClienteInfo(nome="Cliente Teste", estado="SP"),
            tipo_venda="pecas",
            ipi_rate=0.0,
            taxa_comissao=0.0,
            itens=[
                ItemCreate(
                    descricao="Peca Disputada",
                    material=material_teste,
                    espessura=espessura_teste,
                    largura=400,
                    comprimento=400,
                    quantidade=1,
                    chapa_arranjada=True
                )
            ]
        )

    req1 = criar_payload(f"TESTE-{iteration}-A")
    req2 = criar_payload(f"TESTE-{iteration}-B")

    # Funções de chamada que vão engolir a Exceção para podermos analisar
    async def call_a():
        try:
            return await create_orcamento(req1, user_id)
        except Exception as e:
            return e
            
    async def call_b():
        try:
            return await create_orcamento(req2, user_id)
        except Exception as e:
            return e

    # Disparar simultaneamente (Janela de Race Condition)
    print("Disparando orçamentos simultâneos na RPC...")
    results = await asyncio.gather(call_a(), call_b())
    
    res_a, res_b = results
    
    # ---------------------------------------------------------
    # VERIFICAÇÃO PÓS-TESTE
    # Avaliar quem ganhou a corrida e como o banco ficou.
    # ---------------------------------------------------------
    final_db = supabase.table("estoque_chapas").select("*").eq("id", retalho_alvo_id).single().execute()
    estado_final = final_db.data
    
    sucessos = 0
    falhas = 0
    orc_ganhador_id = None
    
    if isinstance(res_a, Exception):
        falhas += 1
        print(f"[Operador A] ❌ Falhou com rollback automático: {res_a}")
    else:
        sucessos += 1
        orc_ganhador_id = res_a.id
        print(f"[Operador A] ✅ Venceu a corrida. Orçamento: {res_a.id[:8]}")
        
    if isinstance(res_b, Exception):
        falhas += 1
        print(f"[Operador B] ❌ Falhou com rollback automático: {res_b}")
    else:
        sucessos += 1
        orc_ganhador_id = res_b.id
        print(f"[Operador B] ✅ Venceu a corrida. Orçamento: {res_b.id[:8]}")
        
    print("\n[Verificação de Integridade do Banco]")
    print(f"Status Final do Retalho: '{estado_final.get('status')}'")
    print(f"Amarrado ao Orçamento: {estado_final.get('orcamento_id')}")
    
    if estado_final.get('status') == 'reservado' and estado_final.get('orcamento_id') == orc_ganhador_id:
        print("VEREDITO: ÍNTEGRO! O banco cravou a reserva perfeitamente no vencedor.")
    else:
        print("VEREDITO: QUEBRADO! A transação falhou em proteger o estado.")
        
    if sucessos > 1:
        print("ERRO CRÍTICO: FALSO SUCESSO DUPLO! A contenção falhou.")
        
    return sucessos, falhas

async def main():
    print("=====================================================")
    print(" INICIANDO TESTE DE STRESS DE CONCORRÊNCIA RPC       ")
    print(" (Rodando 10 iterações determinísticas)              ")
    print("=====================================================")
    
    sucessos_totais = 0
    falhas_totais = 0
    
    for i in range(10):
        s, f = await run_concurrency_test(i)
        sucessos_totais += s
        falhas_totais += f
        await asyncio.sleep(0.5)
        
    print("\n=====================================================")
    print(" RESUMO DA CONCORRÊNCIA ")
    print("=====================================================")
    print(f"Requisições que Venceram a Corrida: {sucessos_totais}")
    print(f"Requisições Barradas pela RPC: {falhas_totais}")
    
    if sucessos_totais == 10 and falhas_totais == 10:
        print("\nSUCESSO: A transação atômica funcionou 100% das vezes.")
    else:
        print("\nALERTA: Algo saiu do controle na proporção de ganhadores/perdedores.")

if __name__ == "__main__":
    asyncio.run(main())
