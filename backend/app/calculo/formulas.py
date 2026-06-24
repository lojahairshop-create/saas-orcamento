"""
Funções puras de cálculo – replicam exatamente a planilha de orçamentos.

Cada função recebe valores primitivos e retorna um resultado numérico,
sem efeitos colaterais. A orquestração é feita pelo CalculoEngine.
"""

import math
from typing import Dict


# ---------------------------------------------------------------------------
# Geometria / Peso
# ---------------------------------------------------------------------------

def calcular_area(largura_mm: float, comprimento_mm: float) -> float:
    """Calcula área em m². Converte mm → m."""
    return (largura_mm / 1000.0) * (comprimento_mm / 1000.0)


def calcular_peso_unitario(
    area_m2: float, espessura_mm: float, densidade: float = 7.86
) -> float:
    """Peso unitário da peça em kg = área(m²) × espessura(mm) × densidade."""
    return area_m2 * espessura_mm * densidade


def calcular_peso_chapa(
    chapa_l_mm: float,
    chapa_c_mm: float,
    espessura_mm: float,
    densidade: float = 7.86,
) -> float:
    """Peso da chapa inteira em kg = L(m) × C(m) × espessura(mm) × densidade."""
    return (chapa_l_mm / 1000.0) * (chapa_c_mm / 1000.0) * espessura_mm * densidade


# ---------------------------------------------------------------------------
# Nesting simplificado (fórmula da planilha)
# ---------------------------------------------------------------------------

def calcular_pecas_por_chapa(
    chapa_l: float,
    chapa_c: float,
    peca_l: float,
    peca_c: float,
    gap: float = 5.0,
) -> int:
    """
    Máx. peças por chapa testando as 2 orientações.
    Todas as dimensões em mm.
    """
    # Orientação 1
    nx1 = math.floor(chapa_l / (peca_l + gap))
    ny1 = math.floor(chapa_c / (peca_c + gap))
    total1 = nx1 * ny1

    # Orientação 2 (peça rotacionada 90°)
    nx2 = math.floor(chapa_l / (peca_c + gap))
    ny2 = math.floor(chapa_c / (peca_l + gap))
    total2 = nx2 * ny2

    return max(total1, total2)


def calcular_qtd_chapas(quantidade: int, pecas_por_chapa: int) -> int:
    """Quantidade de chapas necessárias = ceil(quantidade / peças_por_chapa)."""
    if pecas_por_chapa <= 0:
        return 0
    return math.ceil(quantidade / pecas_por_chapa)


def calcular_sobra(pecas_por_chapa: int, qtd_chapas: int, quantidade: int) -> int:
    """Sobra de peças = peças_por_chapa × qtd_chapas − quantidade."""
    return pecas_por_chapa * qtd_chapas - quantidade


def calcular_retalho(sobra: int, peso_unitario: float) -> float:
    """Peso do retalho em kg = sobra × peso_unitário."""
    return sobra * peso_unitario


# ---------------------------------------------------------------------------
# Custo de matéria-prima
# ---------------------------------------------------------------------------

def calcular_custo_mp(peso_total: float, preco_kg: float) -> float:
    """Custo de matéria-prima = peso_total × preço/kg."""
    return peso_total * preco_kg


# ---------------------------------------------------------------------------
# Corte laser
# ---------------------------------------------------------------------------

def calcular_tempo_corte_laser(
    perimetro_mm: float,
    velocidade_mm_min: float,
    num_entradas: int,
    peck_s: float,
) -> float:
    """
    Tempo de corte laser em minutos.
    = (perímetro / velocidade) + (num_entradas × peck / 60)
    """
    if velocidade_mm_min <= 0:
        return 0.0
    return (perimetro_mm / velocidade_mm_min) + (num_entradas * peck_s / 60.0)


# ---------------------------------------------------------------------------
# Fabricação
# ---------------------------------------------------------------------------

def calcular_total_fabricacao(
    tempos_min: Dict[str, float],
    custos_hora: Dict[str, float],
) -> float:
    """
    Total fabricação = Σ(tempo_min × custo_hora / 60) para cada operação.
    """
    total = 0.0
    for operacao, tempo in tempos_min.items():
        custo_h = custos_hora.get(operacao, 0.0)
        total += tempo * custo_h / 60.0
    return total


def calcular_custo_basico(total_fabricacao: float, custo_mp: float) -> float:
    """Custo básico = total_fabricação + custo_MP."""
    return total_fabricacao + custo_mp


# ---------------------------------------------------------------------------
# Preço de venda
# ---------------------------------------------------------------------------

def calcular_valor_venda_sem_imp(custo_basico: float, margem: float) -> float:
    """Valor de venda sem impostos = custo_básico × (1 + margem)."""
    return custo_basico * (1.0 + margem)


def calcular_preco_com_impostos(
    valor_sem_imp: float, total_impostos: float
) -> float:
    """
    ★ MARGEM POR DENTRO ★
    preço = valor_sem_imp / (1 − total_impostos)
    """
    if total_impostos >= 1.0:
        raise ValueError("Total de impostos não pode ser >= 100%")
    return valor_sem_imp / (1.0 - total_impostos)


# ---------------------------------------------------------------------------
# Impostos individuais
# ---------------------------------------------------------------------------

def calcular_impostos_individuais(
    preco_total: float,
    icms: float = 0.18,
    ipi: float = 0.05,
    pis: float = 0.0065,
    cofins: float = 0.03,
) -> Dict[str, float]:
    """Calcula cada imposto individual sobre o preço total."""
    return {
        "icms": preco_total * icms,
        "ipi": preco_total * ipi,
        "pis": preco_total * pis,
        "cofins": preco_total * cofins,
        "total_tributos": preco_total * (icms + ipi + pis + cofins),
    }


# ---------------------------------------------------------------------------
# Nota Fiscal / Comissão
# ---------------------------------------------------------------------------

def calcular_total_nf(preco_total: float, valor_ipi: float) -> float:
    """Total da Nota Fiscal = preço_total + IPI."""
    return preco_total + valor_ipi


def calcular_comissao(taxa: float, valor_venda_sem_imp: float) -> float:
    """Comissão = taxa × valor_venda_sem_imp."""
    return taxa * valor_venda_sem_imp
