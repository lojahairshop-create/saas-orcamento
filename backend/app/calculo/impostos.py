"""
Configuração de impostos por estado e tipo de venda.
"""

from typing import List
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Agrupamento de estados por alíquota de ICMS
# ---------------------------------------------------------------------------

ESTADOS_7_PORCENTO: List[str] = [
    "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS",
    "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO", "ZFM",
]

ESTADOS_12_PORCENTO: List[str] = ["MG", "PR", "RJ", "RS", "SC"]


# ---------------------------------------------------------------------------
# TaxConfig
# ---------------------------------------------------------------------------

@dataclass
class TaxConfig:
    """Estrutura com todas as alíquotas necessárias para um orçamento."""
    icms: float
    ipi: float
    pis: float
    cofins: float
    csll: float
    irpj: float
    base_calculo: float  # percentual da base de cálculo

    @property
    def total_impostos(self) -> float:
        """ICMS + PIS + COFINS + CSLL + IRPJ (sem IPI, que é por fora)."""
        return self.icms + self.pis + self.cofins + self.csll + self.irpj

    @property
    def fator_calculo(self) -> float:
        """1 − total_impostos (divisor da margem por dentro)."""
        return 1.0 - self.total_impostos


# ---------------------------------------------------------------------------
# Funções auxiliares
# ---------------------------------------------------------------------------

def get_irpj_rate(valor_total: float) -> float:
    """IRPJ: 1,2 % até R$ 10 000; 2 % acima."""
    return 0.012 if valor_total <= 10_000 else 0.02


def get_available_ipi_rates() -> list:
    """Opções de alíquota de IPI disponíveis."""
    return [0.0, 0.05, 0.08, 0.10]


def get_tax_config(
    estado: str = "SP",
    tipo_venda: str = "pecas",
    ipi_rate: float = 0.05,
    valor_total: float = 0.0,
) -> TaxConfig:
    """
    Retorna configuração de impostos com base no estado, tipo de venda e
    faixa de faturamento.
    """
    pis = 0.0065
    cofins = 0.03
    csll = 0.0108
    irpj = get_irpj_rate(valor_total)

    estado_upper = estado.upper().strip()

    if estado_upper in ESTADOS_7_PORCENTO:
        icms = 0.07
        base = 0.7343
    elif estado_upper in ESTADOS_12_PORCENTO:
        icms = 0.12
        base = 0.7333
    elif estado_upper == "SP":
        if tipo_venda == "equipamento":
            icms = 0.12
            base = 0.7333
        else:  # peças
            icms = 0.18
            base = 1.0
    else:
        # Padrão para estados não mapeados
        icms = 0.18
        base = 1.0

    return TaxConfig(
        icms=icms,
        ipi=ipi_rate,
        pis=pis,
        cofins=cofins,
        csll=csll,
        irpj=irpj,
        base_calculo=base,
    )
