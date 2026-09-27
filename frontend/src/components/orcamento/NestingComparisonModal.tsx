import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SimulacaoComparacaoResponse } from "@/types";
import { Layers, Sparkles, AlertCircle } from "lucide-react";

interface NestingComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  onCompare: () => void;
  result: SimulacaoComparacaoResponse | null;
  onSelectScenario: (cenario: "classico" | "nesting") => void;
  onPreviewNesting: (nestingJson: any[]) => void;
}


const formatCurrency = (val: number | undefined | null) => {
  if (val === undefined || val === null || isNaN(val)) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
export default function NestingComparisonModal({
  isOpen,
  onClose,
  loading,
  onCompare,
  result,
  onSelectScenario,
  onPreviewNesting,
}: NestingComparisonModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comparação de Arranjo de Chapas (Simulação Comercial)" size="lg">
      <div className="p-6">
        {!result && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Layers className="h-16 w-16 mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700">Pronto para simular</h3>
            <p className="text-sm mt-2 text-center max-w-md">
              Esta simulação irá executar o motor de cálculo avançado para comparar o preço do orçamento
              sem arranjo (cálculo de área retangular) contra o cálculo usando o algoritmo de Nesting 2D.
            </p>
            <Button onClick={onCompare} className="mt-6" size="lg">
              Executar Simulação
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
            <p>Calculando otimização geométrica e custos...</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-6">
            {/* Cabeçalho da Comparação */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-lg">Resultado da Simulação</h4>
                {result.comparacao.economia_total > 0 ? (
                  <p className="text-teal-600 font-semibold flex items-center gap-1">
                    <Sparkles className="h-4 w-4" /> Economia total de {formatCurrency(result.comparacao.economia_total)} ({result.comparacao.percentual_economia_total}%) com o Nesting
                  </p>
                ) : result.comparacao.economia_total < 0 ? (
                  <p className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Custo adicional de {formatCurrency(Math.abs(result.comparacao.economia_total))} com o Nesting
                  </p>
                ) : (
                  <p className="text-slate-600 font-semibold">
                    Mesmo valor em ambos os cenários.
                  </p>
                )}
              </div>
            </div>

            {/* Alerta de Peças não suportadas */}
            {result.nesting.total_bins === 0 && result.nesting.total_custo_mp === 0 && result.classico.total_custo_mp > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                <p className="text-red-700 font-bold">Atenção: Nenhuma peça pôde ser posicionada no arranjo.</p>
                <p className="text-red-600 text-sm mt-1">Verifique se as dimensões das peças excedem o tamanho da chapa padrão.</p>
              </div>
            )}

            {/* Cards lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Clássico */}
              <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-slate-100 p-4 border-b border-slate-200 text-center">
                  <h3 className="font-bold text-slate-700 text-lg">SEM ARRANJO</h3>
                  <p className="text-xs text-slate-500 mt-1">Cálculo convencional (área retangular)</p>
                </div>
                <div className="p-6 flex-grow flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-slate-500 text-sm">Custo Matéria-Prima</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(result.classico.total_custo_mp)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-slate-500 text-sm">Custo Fabricação</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(result.classico.total_fabricacao)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-slate-500 text-sm">Total NF</span>
                    <span className="font-bold text-lg text-slate-900">{formatCurrency(result.classico.total_preco)}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <Button variant="outline" className="w-full justify-center" onClick={() => onSelectScenario("classico")}>
                    Usar sem arranjo
                  </Button>
                </div>
              </div>

              {/* Nesting */}
              <div className={`bg-white border-2 ${result.nesting.completo ? 'border-teal-500' : 'border-red-400 opacity-90'} rounded-xl overflow-hidden flex flex-col shadow-sm relative`}>
                <div className={`absolute top-0 right-0 ${result.nesting.completo ? 'bg-teal-500' : 'bg-red-500'} text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider`}>
                  {result.nesting.completo ? 'Otimizado' : 'Incompleto'}
                </div>
                <div className={`${result.nesting.completo ? 'bg-teal-50' : 'bg-red-50'} p-4 border-b ${result.nesting.completo ? 'border-teal-100' : 'border-red-100'} text-center`}>
                  <h3 className={`font-bold ${result.nesting.completo ? 'text-teal-800' : 'text-red-800'} text-lg`}>COM ARRANJO</h3>
                  <p className={`text-xs ${result.nesting.completo ? 'text-teal-600' : 'text-red-600'} mt-1`}>Cálculo usando Nesting 2D</p>
                  {!result.nesting.completo && (
                    <div className="mt-2 text-xs font-bold text-red-600 bg-red-100 p-2 rounded border border-red-200">
                      Arranjo incompleto — não pode ser utilizado no orçamento.<br/>
                      Faltam {result.nesting.total_pecas_nao_suportadas} unidades.
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-3 border-b border-teal-100/50">
                    <span className="text-slate-500 text-sm">Custo Matéria-Prima</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(result.nesting.total_custo_mp)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-teal-100/50">
                    <span className="text-slate-500 text-sm">Custo Fabricação</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(result.nesting.total_fabricacao)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-teal-100/50">
                    <span className="text-slate-500 text-sm">Total NF</span>
                    <span className="font-bold text-lg text-teal-700">{formatCurrency(result.nesting.total_preco)}</span>
                  </div>
                  
                  {/* Métricas exclusivas */}
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Métricas do Arranjo</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-slate-50 p-2 rounded flex flex-col">
                        <span className="text-slate-500 text-xs">Chapas Novas</span>
                        <span className="font-semibold">{result.nesting.chapas_novas}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded flex flex-col">
                        <span className="text-slate-500 text-xs">Retalhos Usados</span>
                        <span className="font-semibold">{result.nesting.retalhos_utilizados}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded flex flex-col col-span-2">
                        <span className="text-slate-500 text-xs">Aproveitamento Médio</span>
                        <span className="font-semibold">{result.nesting.aproveitamento_medio}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 border-t border-teal-100 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-white border-teal-200 text-teal-700 hover:bg-teal-100 justify-center" 
                    onClick={() => {
                      if (result.nesting.nesting_json) {
                        onPreviewNesting(result.nesting.nesting_json);
                      }
                    }}
                    disabled={!result.nesting.nesting_json || result.nesting.nesting_json.length === 0}
                  >
                    Visualizar Arranjo
                  </Button>
                  <Button 
                    className="flex-1 bg-teal-600 hover:bg-teal-700 justify-center" 
                    onClick={() => onSelectScenario("nesting")}
                    disabled={!result.nesting.completo}
                  >
                    Usar com arranjo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
