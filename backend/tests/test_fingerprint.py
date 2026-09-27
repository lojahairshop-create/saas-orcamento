import pytest
from app.orcamentos.service import generate_simulation_fingerprint
from fastapi import HTTPException
import uuid
import copy

def mock_resultado():
    return {
        "total_preco": 1500.55,
        "total_custo_mp": 800.0,
        "total_peso": 50.0,
        "bins_utilizados": [
            {"id": "chapa_nova", "tipo": "chapa_nova", "material": "Aço", "espessura": 2.0},
            {"id": "retalho_123", "tipo": "retalho", "material": "Aço", "espessura": 2.0}
        ]
    }

def mock_items():
    return [
        {"quantidade": 2, "material": "Aço", "espessura": 2.0, "largura": 100, "comprimento": 200, "margem_lucro": 0.3, "taxa_comissao": 0.05, "operacoes": [{"operacao": "Corte", "tempo_min": 10.0}]},
        {"quantidade": 1, "material": "Aço", "espessura": 2.0, "largura": 50, "comprimento": 50, "margem_lucro": 0.3, "taxa_comissao": 0.05, "operacoes": []}
    ]

def mock_config():
    return {
        "ipi_rate": 0.1,
        "tipo_venda": "venda_normal"
    }

def test_determinismo():
    res1 = mock_resultado()
    items1 = mock_items()
    conf = mock_config()
    f1 = generate_simulation_fingerprint(res1, True, items1, conf)
    
    res2 = mock_resultado()
    items2 = mock_items()
    items2.reverse() # Mudança incidental na ordem
    res2["bins_utilizados"].reverse() # Mudança incidental na ordem dos bins
    f2 = generate_simulation_fingerprint(res2, True, items2, conf)
    
    assert f1 == f2

def test_mudanca_quantidade():
    f1 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), mock_config())
    items2 = mock_items()
    items2[0]["quantidade"] = 3
    f2 = generate_simulation_fingerprint(mock_resultado(), True, items2, mock_config())
    assert f1 != f2

def test_mudanca_material():
    f1 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), mock_config())
    items2 = mock_items()
    items2[0]["material"] = "Alumínio"
    f2 = generate_simulation_fingerprint(mock_resultado(), True, items2, mock_config())
    assert f1 != f2

def test_mesmo_preco_composicao_diferente():
    f1 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), mock_config())
    res2 = mock_resultado()
    res2["bins_utilizados"][1]["id"] = "retalho_999"
    f2 = generate_simulation_fingerprint(res2, True, mock_items(), mock_config())
    assert f1 != f2

def test_diferenca_classico_nesting():
    f1 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), mock_config())
    f2 = generate_simulation_fingerprint(mock_resultado(), False, mock_items(), mock_config())
    assert f1 != f2

def test_mudanca_processo():
    f1 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), mock_config())
    items2 = mock_items()
    items2[0]["operacoes"][0]["tempo_min"] = 15.0
    f2 = generate_simulation_fingerprint(mock_resultado(), True, items2, mock_config())
    assert f1 != f2

def test_mudanca_margem():
    f1 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), mock_config())
    items2 = mock_items()
    items2[0]["margem_lucro"] = 0.5
    f2 = generate_simulation_fingerprint(mock_resultado(), True, items2, mock_config())
    assert f1 != f2

def test_mudanca_imposto():
    f1 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), mock_config())
    conf = mock_config()
    conf["ipi_rate"] = 0.2
    f2 = generate_simulation_fingerprint(mock_resultado(), True, mock_items(), conf)
    assert f1 != f2
