import math
from typing import List, Dict, Any, Tuple
from app.calculo.engine import CalculoEngine

class ArranjoEngine:
    @staticmethod
    def calcular_bounding_box(nesting_json: Dict[str, Any]) -> Tuple[float, float]:
        """
        Calcula o Bounding Box de um arranjo baseado nas posições das peças.
        Retorna (largura_maxima, comprimento_maximo).
        nesting_json deve conter uma lista "placed_items" onde cada item tem "x", "y", "width", "height".
        """
        if not nesting_json or "placed_items" not in nesting_json or not nesting_json["placed_items"]:
            return 0.0, 0.0
            
        max_x = 0.0
        max_y = 0.0
        
        for item in nesting_json["placed_items"]:
            # item j deve ter levado em conta a rotao na sua representacao de width/height no bin
            x_end = item.get("x", 0.0) + item.get("width", 0.0)
            y_end = item.get("y", 0.0) + item.get("height", 0.0)
            
            if x_end > max_x:
                max_x = x_end
            if y_end > max_y:
                max_y = y_end
                
        return max_x, max_y

    @staticmethod
    def calcular_faturamento_arranjo(
        arranjo_dados: Dict[str, Any],
        itens_originais: List[Dict[str, Any]],
        custos_operacionais: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calcula o custo de um arranjo com base no modo_cobranca.
        
        arranjo_dados precisa ter:
        - material (str)
        - espessura (float)
        - largura_usada (float) - largura fixa do material base
        - nesting_json (dict)
        - modo_cobranca (str) - 'chapa_arranjada' ou 'individual'
        """
        material = arranjo_dados.get("material")
        espessura = float(arranjo_dados.get("espessura", 0))
        largura_usada = float(arranjo_dados.get("largura_usada", 0))
        modo_cobranca = arranjo_dados.get("modo_cobranca", "chapa_arranjada")
        nesting_json = arranjo_dados.get("nesting_json", {})
        
        # 1. Bounding Length
        # Por conveno do engine antigo e layout, "width" do bin geralmente  a largura fixa,
        # "height" (y)  o comprimento infinito. Assumimos o y como o eixo de varredura.
        # Caso o x_max exceda a largura_usada (não deveria), max_x seria a largura ocupada.
        max_x, max_y = ArranjoEngine.calcular_bounding_box(nesting_json)
        
        # 2. Comprimento cobrado = bounding length + 20mm (margem)
        # Vamos assumir que a guilhotina corta transversalmente ao eixo Y.
        comprimento_cobrado = max_y + 20.0
        
        custo_material_total = 0.0
        preco_venda_total = 0.0
        peso_total = 0.0
        
        engine = CalculoEngine()
        
        if modo_cobranca == "chapa_arranjada":
            # Pega o preco_kg do primeiro item original
            preco_kg = itens_originais[0].get("preco_kg", 0.0) if itens_originais else 0.0
            
            # 4. Modo chapa arranjada
            # Cria um item "fictcio" que representa o arranjo inteiro
            dummy_item = {
                "material": material,
                "espessura": espessura,
                "largura": largura_usada,
                "comprimento": comprimento_cobrado,
                "quantidade": 1,
                "preco_kg": preco_kg,
                # Pode ter as taxas padroes dos itens normais se precisar, ou assume 0 operaes extras no arranjo puro
            }
            # O clculo clssico ir determinar densidade, peso e custo do chapao
            calc_result = engine.calcular_item(dummy_item, custos_operacionais)
            custo_material_total = calc_result["custo_mp"]
            preco_venda_total = calc_result["preco_total"]
            peso_total = calc_result["peso_unitario"]
            
        elif modo_cobranca == "individual":
            # 5. Modo individual
            # Reutiliza o clculo de cada pea individualmente
            for item in itens_originais:
                calc_result = engine.calcular_item(item, custos_operacionais)
                custo_material_total += calc_result["custo_mp"]
                preco_venda_total += calc_result["preco_total"]
                peso_total += (calc_result["peso_unitario"] * int(item.get("quantidade", 1)))
        
        # O retalho ser apenas calculado conceitualmente aqui, no inserido.
        # Sobra alm do bounding length + buracos internos >= 200mm so retalhos gerveis,
        # mas como isso excede o escopo de faturamento, ser modelado na prxima fase.
        
        return {
            "bounding_width": max_x,
            "bounding_length": max_y,
            "comprimento_cobrado": comprimento_cobrado,
            "largura_cobrada": largura_usada,
            "custo_material": round(custo_material_total, 2),
            "preco_venda": round(preco_venda_total, 2),
            "peso_total": round(peso_total, 3)
        }
