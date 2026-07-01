/**
 * Funções de cálculo client-side para pré-visualização instantânea no painel.
 * Replicação exata da lógica do backend.
 */

export function calcularArea(larguraMm: number, comprimentoMm: number): number {
  return ((larguraMm + 20.0) / 1000.0) * ((comprimentoMm + 20.0) / 1000.0);
}

export function calcularPesoUnitario(
  larguraMm: number,
  comprimentoMm: number,
  espessuraMm: number
): number {
  return espessuraMm * (larguraMm + espessuraMm) * (comprimentoMm + espessuraMm) * 7.86 / 1000000.0;
}

export function calcularPesoChapa(
  chapaL: number,
  chapaC: number,
  espessuraMm: number
): number {
  return chapaL * chapaC * espessuraMm * 7.86 / 1000000.0;
}

export function calcularPecasPorChapa(
  chapaL: number,
  chapaC: number,
  pecaL: number,
  pecaC: number,
  espessura: number
): number {
  const nx1 = Math.floor((chapaL - 10.0) / (pecaL + espessura));
  const ny1 = Math.floor((chapaC - 10.0) / (pecaC + espessura));
  const total1 = Math.max(0, nx1) * Math.max(0, ny1);

  const nx2 = Math.floor((chapaL - 10.0) / (pecaC + espessura));
  const ny2 = Math.floor((chapaC - 10.0) / (pecaL + espessura));
  const total2 = Math.max(0, nx2) * Math.max(0, ny2);

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

export function calcularCustoMP(pesoTotal: number, precoKg: number, ipiRate = 0.05): number {
  return pesoTotal * precoKg * (1.0 + ipiRate);
}

export function calcularTempoCorteLaser(
  perimetro: number,
  velocidade: number,
  numEntradas: number,
  peck: number,
  quantidade = 1
): number {
  if (velocidade <= 0) return 0;
  const totalSec = ((perimetro / velocidade * 60.0) + (numEntradas * peck)) * quantidade;
  return Math.ceil(totalSec / 60.0);
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
