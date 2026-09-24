import pytest
from app.calculo.arranjo_engine import ArranjoEngine
from app.calculo.engine import CalculoEngine

def test_calcular_bounding_box_and_margins():
    """Testa se o bounding box encontra a maior cota do nesting_json e adiciona 20mm de margem."""
    nesting_json = {
        "placed_items": [
            {"id": "p1", "x": 0.0, "y": 0.0, "width": 100.0, "height": 100.0},
            {"id": "p2", "x": 100.0, "y": 0.0, "width": 50.0, "height": 200.0},
            {"id": "p3", "x": 0.0, "y": 200.0, "width": 150.0, "height": 50.0},
        ]
    }
    
    arranjo_dados = {
        "material": "Aço Carbono",
        "espessura": 2.0,
        "largura_usada": 1500.0,
        "modo_cobranca": "chapa_arranjada",
        "nesting_json": nesting_json
    }
    
    itens_vazios = []
    custos_vazios = {}
    
    res = ArranjoEngine.calcular_faturamento_arranjo(arranjo_dados, itens_vazios, custos_vazios)
    
    # max_x deve ser 150 (p2: 100+50 ou p3: 0+150)
    assert res["bounding_width"] == 150.0
    # max_y deve ser 250 (p3: 200+50)
    assert res["bounding_length"] == 250.0
    
    # Comprimento cobrado é max_y + 20mm
    assert res["comprimento_cobrado"] == 270.0
    assert res["largura_cobrada"] == 1500.0

def test_faturamento_chapa_arranjada_vs_individual():
    """
    Testa se o modo 'individual' soma os cálculos individuais e
    o modo 'chapa_arranjada' calcula apenas pelo blocão (largura_usada x comprimento_cobrado).
    """
    engine = CalculoEngine()
    
    # Dados reais para bater com o baseline
    # 2 peças de 1000x500mm
    item1 = {
        "material": "Aço Inox",
        "espessura": 1.5,
        "largura": 500,
        "comprimento": 1000,
        "quantidade": 1,
        "preco_kg": 10.0
    }
    item2 = {
        "material": "Aço Inox",
        "espessura": 1.5,
        "largura": 500,
        "comprimento": 1000,
        "quantidade": 1,
        "preco_kg": 10.0
    }
    itens = [item1, item2]
    
    # Se colocadas empilhadas no Y, teremos Y=2000.
    nesting_json = {
        "placed_items": [
            {"x": 0, "y": 0, "width": 500, "height": 1000},
            {"x": 0, "y": 1000, "width": 500, "height": 1000},
        ]
    }
    
    arranjo_dados_individual = {
        "material": "Aço Inox",
        "espessura": 1.5,
        "largura_usada": 1200.0,
        "modo_cobranca": "individual",
        "nesting_json": nesting_json
    }
    
    res_indiv = ArranjoEngine.calcular_faturamento_arranjo(arranjo_dados_individual, itens, {})
    
    # Bounding de Y=2000
    assert res_indiv["bounding_length"] == 2000.0
    
    # Cálculos manuais usando o baseline
    c1 = engine.calcular_item(item1, {})
    c2 = engine.calcular_item(item2, {})
    custo_esperado_individual = c1["custo_mp"] + c2["custo_mp"]
    
    assert res_indiv["custo_material"] == round(custo_esperado_individual, 2)
    
    # Agora modo chapa_arranjada
    arranjo_dados_bloco = arranjo_dados_individual.copy()
    arranjo_dados_bloco["modo_cobranca"] = "chapa_arranjada"
    
    res_bloco = ArranjoEngine.calcular_faturamento_arranjo(arranjo_dados_bloco, itens, {})
    
    # O bloco calcula sobre: 1200 x 2020 (bounding length 2000 + 20)
    item_bloco = {
        "material": "Aço Inox",
        "espessura": 1.5,
        "largura": 1200.0,
        "comprimento": 2020.0,
        "quantidade": 1,
        "preco_kg": 10.0
    }
    c_bloco = engine.calcular_item(item_bloco, {})
    
    assert res_bloco["custo_material"] == round(c_bloco["custo_mp"], 2)
    
    # E o custo_bloco será naturalmente diferente do individual
    assert res_indiv["custo_material"] != res_bloco["custo_material"]
