"""
Testes unitários das fórmulas de cálculo – validando a Peça 01 da Planilha Geral (Linha 10)
"""

import pytest
import math
from app.calculo.formulas import (
    calcular_area,
    calcular_peso_unitario,
    calcular_peso_chapa,
    calcular_pecas_por_chapa,
    calcular_qtd_chapas,
    calcular_sobra,
    calcular_retalho,
    calcular_custo_mp,
    calcular_tempo_corte_laser,
    calcular_total_fabricacao,
    calcular_custo_basico,
    calcular_valor_venda_sem_imp,
    calcular_preco_com_impostos,
    calcular_impostos_individuais,
    calcular_total_nf,
    calcular_comissao,
)


def test_peca_01_spreadsheet_formulas():
    # Parâmetros de Entrada da Peça 01 da Planilha Geral (Linha 10)
    quantidade = 1
    largura = 122.0  # mm
    comprimento = 111.0  # mm
    espessura = 3.18  # mm
    material_preco_kg = 2.00  # R$ / Kg
    margem = 0.30  # 30%
    comissao_taxa = 0.03  # 3%
    
    # Corte Laser
    perimetro = 122.0  # mm
    num_entradas = 4
    velocidade = 3528.0  # mm/min
    peck = 1.0  # seg

    # Tempos de Outras Operações (em minutos)
    tempos_min = {
        "CORTE LASER": 1.0,  # arredondado para cima: ((122/3528*60) + 4) * 1 / 60 = 0.101 min -> 1.0 min
        "SET-UP": 2.0,       # 2.0 min * 1 qty = 2.0 min
        "DOBRA": 4.0,        # 4.0 min * 1 qty = 4.0 min
        "CALDEIRARIA": 2.0,  # 2.0 min * 1 qty = 2.0 min
        "SOLDA": 1.0,        # 1.0 min * 1 qty = 1.0 min
        "GUILHOTINA": 4.0,   # 4.0 min * 1 qty = 4.0 min
        "USINAGEM INTERNA": 5.0, # 5.0 min * 1 qty = 5.0 min
        "MONTAGEM": 0.0,
    }
    custos_hora = {
        "CORTE LASER": 450.00,
        "SET-UP": 60.00,
        "DOBRA": 100.00,
        "CALDEIRARIA": 100.00,
        "SOLDA": 100.00,
        "GUILHOTINA": 68.00,
        "USINAGEM INTERNA": 80.00,
        "MONTAGEM": 80.00,
    }

    # Chapa comercial
    chapa_l = 1200.0 # mm
    chapa_c = 2400.0 # mm

    # -----------------------------------------------------------------------
    # Execução das Fórmulas Unitárias
    # -----------------------------------------------------------------------
    
    # 1. Área m²
    area = calcular_area(largura, comprimento)
    assert area == pytest.approx(0.018602, abs=1e-6)

    # 2. Peso unitário da peça
    peso_unit = calcular_peso_unitario(largura, comprimento, espessura)
    assert peso_unit == pytest.approx(0.35725198612752, abs=1e-6)

    # 3. Peso da chapa inteira
    peso_chapa = calcular_peso_chapa(chapa_l, chapa_c, espessura)
    assert peso_chapa == pytest.approx(71.985024, abs=1e-5)

    # 4. Peças por chapa (com rotação dá 10 * 19 = 190)
    pecas_chapa = calcular_pecas_por_chapa(chapa_l, chapa_c, largura, comprimento, espessura)
    assert pecas_chapa == 190

    # 5. Qtd chapas necessárias
    qtd_chapas = calcular_qtd_chapas(quantidade, pecas_chapa)
    assert qtd_chapas == 1

    # 6. Sobra de peças na chapa
    sobra = calcular_sobra(pecas_chapa, qtd_chapas, quantidade)
    assert sobra == 189

    # 7. Peso de retalho/sobra
    retalho = calcular_retalho(sobra, peso_unit)
    assert retalho == pytest.approx(67.520625, abs=1e-4)

    # 8. Custo de Matéria-Prima (com IPI = 0.05)
    # Peso total com margem de max(espessura, 5) = 5
    pad = 5.0
    peso_total = quantidade * (espessura * (largura + pad) * (comprimento + pad) * 7.86 / 1000000.0)
    assert peso_total == pytest.approx(0.3682233936, abs=1e-6)
    
    custo_mp = calcular_custo_mp(peso_total, material_preco_kg, ipi_rate=0.05)
    assert custo_mp == pytest.approx(0.77326912656, abs=1e-6)

    # 9. Tempo corte laser
    tempo_laser = calcular_tempo_corte_laser(perimetro, velocidade, num_entradas, peck, quantidade)
    assert tempo_laser == 1.0

    # 10. Total Fabricação
    total_fab = calcular_total_fabricacao(tempos_min, custos_hora)
    assert total_fab == pytest.approx(32.3666667, abs=1e-4)

    # 11. Custo Básico
    custo_basico = calcular_custo_basico(total_fab, custo_mp)
    assert custo_basico == pytest.approx(33.13993579, abs=1e-4)


def test_taxas_e_precos():
    # Margem por Dentro
    valor_sem_imp = 43.08191653119467
    total_impostos = 0.2393  # ICMS + PIS + COFINS + CSLL + IRPJ
    
    preco_com_imp = calcular_preco_com_impostos(valor_sem_imp, total_impostos)
    assert preco_com_imp == pytest.approx(56.6345688, abs=1e-4)

    # Comissão
    comissao = calcular_comissao(0.03, valor_sem_imp)
    assert comissao == pytest.approx(1.292457, abs=1e-5)


def test_calculo_engine_operacoes():
    from app.calculo.engine import CalculoEngine
    engine = CalculoEngine()
    
    # Item com quantidade 10, tempo de set-up 6 min (fixo), tempo de dobra 2 min (unitário)
    item_data = {
        "material": "AÇO CARBONO",
        "espessura": 3.18,
        "largura": 100.0,
        "comprimento": 100.0,
        "perimetro": 400.0,
        "num_entradas": 1,
        "quantidade": 10,
        "chapa_l": 1200,
        "chapa_c": 2400,
        "preco_kg": 2.00,
        "margem_lucro": 0.30,
        "taxa_comissao": 0.03,
        "operacoes": [
            {"nome": "SET-UP", "tempo_min": 6.0, "custo_hora": 20.00},
            {"nome": "DOBRA", "tempo_min": 2.0, "custo_hora": 15.00},
        ]
    }
    
    config = {
        "estado": "SP",
        "tipo_venda": "pecas",
        "ipi_rate": 0.05,
        "custos_operacao": {
            "CORTE LASER": 30.00,
        }
    }
    
    res = engine.calcular_item(item_data, config)
    
    # 1. Verificar corte laser
    # Velocidade para AÇO CARBONO 3.18 é 3528 mm/min, peck é 1.0 s
    # tempo_laser unitário = (400 / 3528) + (1 * 1.0 / 60) = 0.113378 + 0.016667 = 0.130045 min
    # Para 10 unidades, tempo_laser_total = 1.30045 min. Arredondado para cima = 2.0 min.
    # Custo laser = 2.0 * 30.00 / 60 = 1.00 R$
    
    # 2. Verificar SET-UP (multiplica por 10)
    # tempo_setup_total = 6.0 * 10 = 60.0 min
    # Custo setup = 60.0 * 20.00 / 60 = 20.00 R$
    
    # 3. Verificar DOBRA (multiplica por 10)
    # tempo_dobra_total = 2.0 * 10 = 20.0 min
    # Custo dobra = 20.0 * 15.00 / 60 = 5.00 R$
    
    # Total fabricação esperado = 1.00 + 20.00 + 5.00 = 26.00 R$
    assert res["total_fabricacao"] == pytest.approx(26.00, abs=1e-4)
