"""
Testes unitários para validação da opção de cálculo com Chapa Arranjada vs Somente Retangular.
"""

import pytest
from app.calculo.engine import CalculoEngine


def test_calculo_chapa_arranjada_vs_retangular():
    engine = CalculoEngine()

    item_base = {
        "descricao": "Peça Teste 100x1500",
        "material": "AÇO CARBONO",
        "espessura": 1.0,
        "largura": 100.0,
        "comprimento": 1500.0,
        "perimetro": 3200.0,
        "num_entradas": 4,
        "quantidade": 1,
        "chapa_l": 1200.0,
        "chapa_c": 2400.0,
        "preco_kg": 10.00,
        "margem_lucro": 0.30,
        "taxa_comissao": 0.03,
    }

    config = {
        "estado": "SP",
        "tipo_venda": "pecas",
        "ipi_rate": 0.05,
    }

    # 1. Modo Retangular (padrão)
    item_retangular = {**item_base, "chapa_arranjada": False}
    res_retangular = engine.calcular_item(item_retangular, config)

    # Área no modo retangular: ((100 + 20)/1000) * ((1500 + 20)/1000) = 0.12 * 1.52 = 0.1824 m²
    assert res_retangular["area"] == pytest.approx(0.1824, abs=1e-4)
    assert res_retangular["chapa_arranjada"] is False

    # 2. Modo Chapa Arranjada
    item_arranjado = {**item_base, "chapa_arranjada": True}
    res_arranjado = engine.calcular_item(item_arranjado, config)

    # Área no modo arranjado: (1200/1000) * ((1500 + 20)/1000) = 1.2 * 1.52 = 1.824 m²
    assert res_arranjado["area"] == pytest.approx(1.824, abs=1e-4)

    # Peso unitário / total no modo arranjado:
    # 1.0mm * 1200mm * 1520mm * 7.86 / 1000000 = 14.33664 kg
    assert res_arranjado["peso_total"] == pytest.approx(14.33664, abs=1e-4)
    assert res_arranjado["chapa_arranjada"] is True

    # Custo de matéria prima deve ser maior no modo arranjado
    assert res_arranjado["custo_mp"] > res_retangular["custo_mp"]


def test_calculo_chapa_arranjada_quantidade_multipla():
    engine = CalculoEngine()

    item_base = {
        "descricao": "Peça Teste 100x1500 - Qtd 5",
        "material": "AÇO CARBONO",
        "espessura": 1.0,
        "largura": 100.0,
        "comprimento": 1500.0,
        "perimetro": 3200.0,
        "num_entradas": 4,
        "quantidade": 5,
        "chapa_l": 1200.0,
        "chapa_c": 2400.0,
        "preco_kg": 10.00,
        "margem_lucro": 0.30,
        "taxa_comissao": 0.03,
        "chapa_arranjada": True,
    }

    config = {
        "estado": "SP",
        "tipo_venda": "pecas",
        "ipi_rate": 0.05,
    }

    res_1 = engine.calcular_item({**item_base, "quantidade": 1}, config)
    res_5 = engine.calcular_item(item_base, config)

    # Peso total para Qtd = 5 deve ser exatamente 5x o peso unitário do arranjo (5 * 14.33664 = 71.6832 kg)
    assert res_5["peso_total"] == pytest.approx(res_1["peso_total"] * 5, abs=1e-4)
    assert res_5["peso_total"] == pytest.approx(71.6832, abs=1e-4)

    # Custo MP para Qtd = 5 deve ser exatamente 5x o custo MP de 1 unidade
    assert res_5["custo_mp"] == pytest.approx(res_1["custo_mp"] * 5, abs=1e-4)

