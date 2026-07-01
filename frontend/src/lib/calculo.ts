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

export const PARAMETROS_LASER: Record<string, Record<number, [number, number]>> = {
  "INOX": {
    1.0:  [7800, 1.0],
    1.5:  [6300, 1.1],
    2.0:  [5300, 1.1],
    2.5:  [4500, 1.2],
    3.0:  [3800, 1.2],
    3.18: [3528, 1.3],
    4.0:  [2450, 1.4],
    4.75: [2000, 1.5],
    5.0:  [1600, 1.8],
    6.35: [1200, 2.0],
    8.0:  [500,  2.5],
    10.0: [350,  3.0],
    12.7: [225,  4.0],
    15.87: [0,   0],
    19.0:  [0,   0],
  },
  "AÇO CARBONO": {
    1.0:  [6500, 1.0],
    1.5:  [5800, 1.0],
    2.0:  [4900, 1.0],
    2.5:  [3724, 1.0],
    3.0:  [3600, 1.0],
    3.18: [3528, 1.0],
    4.0:  [2646, 1.0],
    4.75: [2352, 1.5],
    6.35: [2058, 2.0],
    8.0:  [1666, 2.5],
    10.0: [1200, 3.0],
    12.7: [1078, 3.0],
    15.87: [780, 6.0],
    19.0:  [600, 10.0],
  },
  "ALUMÍNIO": {
    1.0:  [8750, 1.0],
    1.5:  [6600, 1.0],
    2.0:  [5390, 1.0],
    2.5:  [3724, 1.0],
    3.18: [2450, 1.0],
    4.0:  [1764, 1.2],
    4.75: [1274, 1.2],
    6.35: [882,  1.5],
    8.0:  [300,  1.5],
    10.0: [0,    0],
    12.7: [0,    0],
    15.87: [0,   0],
    19.0:  [0,   0],
  },
};

export function obterParametrosLaser(material: string, espessura: number): { velocidade: number; peck: number } {
  let matKey = material.toUpperCase().trim();
  const aliases: Record<string, string> = {
    "AÇO CARB.": "AÇO CARBONO",
    "ACO CARBONO": "AÇO CARBONO",
    "ACO CARB.": "AÇO CARBONO",
    "ALUMINUM": "ALUMÍNIO",
    "ALUMINIO": "ALUMÍNIO",
  };
  matKey = aliases[matKey] || matKey;

  const matParams = PARAMETROS_LASER[matKey];
  if (!matParams) {
    return { velocidade: 0, peck: 0 };
  }

  // Busca exata
  if (matParams[espessura]) {
    const [vel, peck] = matParams[espessura];
    return { velocidade: vel, peck };
  }

  // Busca aproximada pela espessura mais próxima
  const espessuras = Object.keys(matParams).map(Number).sort((a, b) => a - b);
  if (espessuras.length === 0) {
    return { velocidade: 0, peck: 0 };
  }

  const closest = espessuras.reduce((prev, curr) => 
    Math.abs(curr - espessura) < Math.abs(prev - espessura) ? curr : prev
  );

  const [vel, peck] = matParams[closest];
  return { velocidade: vel, peck };
}
