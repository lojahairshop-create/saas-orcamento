export enum OrcamentoStatus {
  RASCUNHO = "rascunho",
  PENDENTE = "pendente",
  APROVADO = "aprovado",
  REPROVADO = "reprovado",
  CANCELADO = "cancelado",
}

export enum TipoVenda {
  PECAS = "pecas",
  EQUIPAMENTO = "equipamento",
}

export interface User {
  id: string;
  email: string;
  nome: string;
}

export interface OperacaoItem {
  nome: string;
  tempo_min: number;
  custo_hora: number;
}

export interface OrcamentoItem {
  descricao: string;
  material: string;
  tipo_material?: string | null;
  espessura: number;
  largura: number;
  comprimento: number;
  perimetro: number;
  num_entradas: number;
  quantidade: number;
  chapa_l: number;
  chapa_c: number;
  preco_kg: number;
  margem_lucro: number;
  beneficiamento?: boolean;
  operacoes: OperacaoItem[];
  observacoes?: string | null;

  // Calculados
  velocidade?: number;
  peck?: number;
  tempo_corte_laser?: number;
  area?: number;
  peso_unitario?: number;
  peso_chapa?: number;
  pecas_por_chapa?: number;
  qtd_chapas?: number;
  sobra?: number;
  retalho?: number;
  peso_total?: number;
  custo_mp?: number;
  total_fabricacao?: number;
  custo_basico?: number;
  valor_venda_sem_imp?: number;
  preco_unitario_com_imp?: number;
  preco_total?: number;
  icms?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  total_tributos?: number;
  total_nf?: number;
  comissao?: number;
}

export interface ClienteInfo {
  nome: string;
  email?: string;
  telefone?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado: string;
}

export interface Orcamento {
  id: string;
  numero: string;
  status: OrcamentoStatus;
  cliente: ClienteInfo;
  itens: OrcamentoItem[];
  tipo_venda: TipoVenda;
  ipi_rate: number;
  taxa_comissao: number;
  condicao_pagamento?: string;
  prazo_entrega?: string;
  validade: number;
  observacoes?: string;
  
  // Totais
  total_preco: number;
  total_nf: number;
  total_tributos: number;
  total_comissao: number;
  total_peso: number;
  total_custo_mp: number;
  total_fabricacao: number;

  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface ConfigGlobais {
  id?: string;
  icms_padrao: number;
  ipi_padrao: number;
  pis_padrao: number;
  cofins_padrao: number;
  csll_padrao: number;
  irpj_padrao: number;
  comissao_padrao: number;
  base_calculo_padrao: number;
  empresa_nome?: string;
  empresa_cnpj?: string;
  empresa_endereco?: string;
  empresa_telefone?: string;
  empresa_email?: string;
  logo_base64?: string;
}

export interface ImpostoEstado {
  id?: string;
  uf: string;
  nome: string;
  icms_equipamento: number;
  base_calc_equipamento: number;
  icms_pecas: number;
  base_calc_pecas: number;
  ipi_padrao: number;
  csll: number;
}

export interface Material {
  id: string;
  nome: string;
  tipo: string;
  preco_kg: number;
  densidade: number;
}

export interface ParametroLaser {
  id: string;
  material: string;
  espessura: number;
  avanco: number;
  peck: number;
}

export interface CustoOperacao {
  id: string;
  operacao: string;
  custo_hora: number;
}

export interface MedidaChapa {
  id: string;
  descricao: string;
  largura: number;
  comprimento: number;
}

export interface DashboardResumo {
  faturamento_cotado: number;
  faturamento_aprovado: number;
  taxa_aprovacao: number;
  total_orcamentos: number;
  total_aprovados: number;
  total_reprovados: number;
  total_pendentes: number;
  faturamento_por_mes: Array<{
    mes: string;
    cotado: number;
    aprovado: number;
  }>;
}

export interface DXFResult {
  perimetro: number;
  num_entradas: number;
  largura: number;
  comprimento: number;
  area: number;
  furos: number;
  filename?: string;
}

export interface NestingPecaPosicionada {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotacionado: boolean;
}

export interface NestingChapaResult {
  pecas: NestingPecaPosicionada[];
  aproveitamento: number;
}

export interface NestingResult {
  chapas: NestingChapaResult[];
  total_chapas: number;
  aproveitamento_medio: number;
}
