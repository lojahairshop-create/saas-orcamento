/**
 * Funções de cálculo client-side para pré-visualização instantânea no painel.
 * Replicação exata da lógica do backend.
 */

export function calcularArea(larguraMm: number, comprimentoMm: number): number {
  return (larguraMm / 1000.0) * (comprimentoMm / 1000.0);
}

export function calcularPesoUnitario(
  areaM2: number,
  espessuraMm: number,
  densidade = 7.86
): number {
  return areaM2 * espessuraMm * densidade;
}

export function calcularPesoChapa(
  chapaL: number,
  chapaC: number,
  espessuraMm: number,
  densidade = 7.86
): number {
  return (chapaL / 1000.0) * (chapaC / 1000.0) * espessuraMm * densidade;
}

export function calcularPecasPorChapa(
  chapaL: number,
  chapaC: number,
  pecaL: number,
  pecaC: number,
  gap = 5.0
): number {
  const nx1 = Math.floor(chapaL / (pecaL + gap));
  const ny1 = Math.floor(chapaC / (pecaC + gap));
  const total1 = nx1 * ny1;

  const nx2 = Math.floor(chapaL / (pecaC + gap));
  const ny2 = Math.floor(chapaC / (pecaL + gap));
  const total2 = nx2 * ny2;

  return Math.max(total1, total2);
}

export function calcularQtdChapas(quantidade: number, pecasPorChapa: number): number {
  if (pecasPorChapa <= 0) return 0;
  return Math.ceil(quantidade / pecasPorChapa);
}

export function calcularSobra(
  pecasPorChapa: number,
  qtdChapas: number,
  quantidade: number
): number {
  return pecasPorChapa * qtdChapas - quantidade;
}

export function calcularRetalho(sobra: number, pesoUnitario: number): number {
  return sobra * pesoUnitario;
}

export function calcularCustoMP(pesoTotal: number, precoKg: number): number {
  return pesoTotal * precoKg;
}

export function calcularTempoCorteLaser(
  perimetro: number,
  velocidade: number,
  numEntradas: number,
  peck: number
): number {
  if (velocidade <= 0) return 0;
  return perimetro / velocidade + (numEntradas * peck) / 60.0;
}

export function calcularTotalFabricacao(
  operacoes: Array<{ tempo_min: number; custo_hora: number }>
): number {
  return operacoes.reduce((acc, op) => acc + (op.tempo_min * op.custo_hora) / 60.0, 0);
}

export function calcularCustoBasico(totalFabricacao: number, custoMp: number): number {
  return totalFabricacao + custoMp;
}

export function calcularValorVendaSemImp(custoBasico: number, margem: number): number {
  return custoBasico * (1.0 + margem);
}

export function calcularPrecoComImpostos(valorSemImp: number, totalImpostos: number): number {
  const divisor = 1.0 - totalImpostos;
  if (divisor <= 0) return valorSemImp;
  return valorSemImp / divisor; // Margem por dentro
}
