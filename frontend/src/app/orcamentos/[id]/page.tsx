"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { Orcamento, OrcamentoStatus } from "@/types";
import {
  FileDown,
  Check,
  X,
  Calendar,
  User as UserIcon,
  Percent,
  Weight,
  Layers,
  ArrowLeft,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function OrcamentoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orcamentoId = params.id as string;

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"resumo" | "nesting">("resumo");
  const [nestingResults, setNestingResults] = useState<any[]>([]);
  const [nestingLoading, setNestingLoading] = useState(false);

  async function loadOrcamento() {
    try {
      const data = await api.getOrcamento(orcamentoId);
      setOrcamento(data);
    } catch (err) {
      console.error("Erro ao carregar orçamento:", err);
      alert("Orçamento não encontrado ou acesso negado.");
      router.push("/orcamentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orcamentoId) {
      loadOrcamento();
    }
  }, [orcamentoId]);

  const handleUpdateStatus = async (newStatus: OrcamentoStatus) => {
    setStatusLoading(true);
    try {
      await api.updateStatus(orcamentoId, newStatus);
      loadOrcamento();
    } catch (err) {
      alert("Erro ao atualizar status");
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!orcamento) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("token") || "";
    const printUrl = `${apiBaseUrl}/orcamentos/${orcamento.id}/html?token=${encodeURIComponent(token)}`;
    window.open(printUrl, "_blank");
  };

  const runNestingAnalysis = async () => {
    if (!orcamento || orcamento.itens.length === 0) return;
    setNestingLoading(true);
    try {
      // Agrupar itens por material e espessura
      const groups: { [key: string]: typeof orcamento.itens } = {};
      orcamento.itens.forEach((item) => {
        const key = `${item.material} - ${item.espessura}mm`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      // Executar nesting para cada grupo
      const results = [];
      for (const [key, items] of Object.entries(groups)) {
        const chapa_l = items[0].chapa_l || 1200;
        const chapa_c = items[0].chapa_c || 2400;

        // Filtrar apenas peças com dimensões maiores que 0
        const validItems = items.filter((it) => it.largura > 0 && it.comprimento > 0);
        if (validItems.length === 0) continue;

        const payload = {
          itens: validItems.map((it, idx) => ({
            id: it.descricao || `P${idx + 1}`,
            largura: it.largura,
            comprimento: it.comprimento,
            quantidade: it.quantidade,
          })),
          chapa_l: chapa_l,
          chapa_c: chapa_c,
          gap: 5.0,
        };

        const res = await api.calcularNesting(payload);
        results.push({
          key,
          chapa_l,
          chapa_c,
          ...res,
        });
      }

      setNestingResults(results);
    } catch (err) {
      console.error("Erro ao calcular nesting:", err);
      alert("Erro ao calcular arranjo de chapas.");
    } finally {
      setNestingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "nesting" && orcamento && nestingResults.length === 0) {
      runNestingAnalysis();
    }
  }, [activeTab, orcamento]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!orcamento) return null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header Navigation */}
        <div className="flex justify-between items-center">
          <Link href="/orcamentos" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 font-semibold transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar para lista
          </Link>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/orcamentos/novo?id=${orcamento.id}`)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-none"
            >
              <Edit className="h-4 w-4" /> Editar Orçamento
            </Button>

            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5"
            >
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            
            {(orcamento.status === OrcamentoStatus.PENDENTE || orcamento.status === OrcamentoStatus.RASCUNHO) && (
              <React.Fragment>
                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus(OrcamentoStatus.APROVADO)}
                  className="flex items-center gap-1.5"
                  loading={statusLoading}
                >
                  <Check className="h-4 w-4" /> Aprovar Orçamento
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleUpdateStatus(OrcamentoStatus.REPROVADO)}
                  className="flex items-center gap-1.5"
                  loading={statusLoading}
                >
                  <X className="h-4 w-4" /> Reprovar
                </Button>
              </React.Fragment>
            )}
          </div>
        </div>

        {/* Title Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-100">{orcamento.numero}</h1>
              <Badge status={orcamento.status} />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Orçamento de {orcamento.tipo_venda === "pecas" ? "Peças Industriais" : "Equipamentos"}
            </span>
          </div>

          <div className="flex gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Criação</span>
                <span className="font-semibold text-slate-200">
                  {new Date(orcamento.created_at || "").toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Vendedor</span>
                <span className="font-semibold text-slate-200">MetalCut Pro Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 gap-1 bg-white/[0.01] rounded-xl p-1 max-w-sm">
          <button
            onClick={() => setActiveTab("resumo")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "resumo"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Resumo Comercial
          </button>
          <button
            onClick={() => setActiveTab("nesting")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "nesting"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Arranjo de Chapas (Nesting)
          </button>
        </div>

        {/* Tab 1: Resumo Comercial */}
        {activeTab === "resumo" && (
          <>
            {/* Client & Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card header="Identificação do Cliente" className="md:col-span-2">
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Nome/Empresa</span>
                    <span className="font-bold text-slate-200">{orcamento.cliente.nome}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">CNPJ / CPF</span>
                    <span>{orcamento.cliente.cnpj || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">E-mail Comercial</span>
                    <span>{orcamento.cliente.email || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Telefone Contato</span>
                    <span>{orcamento.cliente.telefone || "Não informado"}</span>
                  </div>
                  <div className="col-span-2 border-t border-white/5 pt-3">
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Endereço Completo</span>
                    <span>
                      {orcamento.cliente.endereco || "Não informado"} - {orcamento.cliente.cidade || ""} ({orcamento.cliente.estado})
                    </span>
                  </div>
                </div>
              </Card>

              <Card header="Condições de Venda">
                <div className="flex flex-col gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Pagamento</span>
                    <span className="font-medium text-slate-200">{orcamento.condicao_pagamento || "A combinar"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Prazo de Entrega</span>
                    <span className="font-medium text-slate-200">{orcamento.prazo_entrega || "A combinar"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Validade da Proposta</span>
                    <span className="font-medium text-slate-200">{orcamento.validade} dias corridos</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed Items Table */}
            <Card header="Itens e Memória de Cálculo">
              <Table headers={["Item", "Descrição da Peça", "Material", "Espessura", "Qtd", "Peso Total", "Unitário c/ Imp", "Total c/ Imp"]}>
                {orcamento.itens.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-slate-100">{item.descricao}</span>
                        {item.observacoes && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">Obs: {item.observacoes}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell>{item.espessura} mm</TableCell>
                    <TableCell className="text-center">{item.quantidade}</TableCell>
                    <TableCell>{item.peso_total?.toFixed(2)} kg</TableCell>
                    <TableCell>{formatCurrency(item.preco_unitario_com_imp || 0)}</TableCell>
                    <TableCell className="font-bold text-slate-100">{formatCurrency(item.preco_total || 0)}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 flex flex-col gap-6">
                {orcamento.observacoes && (
                  <Card header="Observações Gerais">
                    <p className="text-sm text-slate-400 leading-relaxed">{orcamento.observacoes}</p>
                  </Card>
                )}
              </div>

              <Card
                header={
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <Layers className="h-4.5 w-4.5" />
                    <span>Resumo Tributário & Custos</span>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-semibold">Custo Matéria-Prima:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(orcamento.total_custo_mp)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-semibold">Custo de Fabricação:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(orcamento.total_fabricacao)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-semibold">Impostos Embutidos (Médio):</span>
                    <span className="font-semibold text-red-400">{formatCurrency(orcamento.total_tributos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-semibold">Comissão Operacional:</span>
                    <span className="font-semibold text-amber-500">{formatCurrency(orcamento.total_comissao)}</span>
                  </div>

                  <div className="border-t border-white/5 my-3" />

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">VALOR PRODUTOS:</span>
                    <span className="text-lg font-extrabold text-blue-400">{formatCurrency(orcamento.total_preco)}</span>
                  </div>

                  {orcamento.ipi_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-semibold">IPI ({orcamento.ipi_rate * 100}% por fora):</span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(orcamento.total_nf - orcamento.total_preco)}
                      </span>
                    </div>
                  )}

                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mt-4 flex flex-col gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      TOTAL NOTA FISCAL (c/ IPI)
                    </span>
                    <span className="text-2xl font-black text-slate-100">
                      {formatCurrency(orcamento.total_nf)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Tab 2: Arranjo de Chapas / Nesting */}
        {activeTab === "nesting" && (
          <div className="flex flex-col gap-6">
            {nestingLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                <span className="text-xs text-slate-500 font-semibold">Calculando otimização de arranjo...</span>
              </div>
            ) : nestingResults.length > 0 ? (
              nestingResults.map((res, gIdx) => (
                <Card
                  key={gIdx}
                  header={
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-slate-200">{res.key}</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        Aproveitamento Médio: {res.aproveitamento_medio}%
                      </span>
                    </div>
                  }
                >
                  <div className="flex flex-col gap-6">
                    {/* Infos chapa */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Medida da Chapa</span>
                        <span className="font-bold text-slate-300">{res.chapa_l} x {res.chapa_c} mm</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Chapas Ocupadas</span>
                        <span className="font-bold text-slate-300">{res.total_chapas} chapa(s)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Espaçamento (Gap)</span>
                        <span className="font-bold text-slate-300">5.0 mm</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Disposição Visual</span>
                        <span className="font-bold text-slate-300">Horizontal (Comprimento X Largura)</span>
                      </div>
                    </div>

                    {/* Chapas individuais */}
                    <div className="flex flex-col gap-6">
                      {res.chapas.map((chapa: any, cIdx: number) => (
                        <div key={cIdx} className="flex flex-col gap-3 bg-white/[0.01] border border-white/5 p-5 rounded-xl">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-300">Layout da Chapa #{cIdx + 1}</span>
                            <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                              Eficiência: {chapa.aproveitamento}%
                            </span>
                          </div>

                          {/* CAD canvas representation */}
                          <div className="relative w-full border border-slate-800 bg-[#07070a] rounded-lg overflow-hidden shadow-inner flex items-center justify-center p-4">
                            <div
                              style={{
                                width: "100%",
                                maxWidth: "700px",
                                aspectRatio: `${res.chapa_c} / ${res.chapa_l}`,
                                position: "relative",
                                border: "1px dashed #334155",
                                backgroundColor: "#020204",
                              }}
                            >
                              {chapa.pecas.map((peca: any, pIdx: number) => (
                                <div
                                  key={pIdx}
                                  style={{
                                    position: "absolute",
                                    left: `${(peca.y / res.chapa_c) * 100}%`,
                                    top: `${(peca.x / res.chapa_l) * 100}%`,
                                    width: `${(peca.h / res.chapa_c) * 100}%`,
                                    height: `${(peca.w / res.chapa_l) * 100}%`,
                                    backgroundColor: peca.rotacionado ? "rgba(245, 158, 11, 0.12)" : "rgba(59, 130, 246, 0.12)",
                                    border: peca.rotacionado ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(59, 130, 246, 0.5)",
                                    borderRadius: "3px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "2px",
                                    boxSizing: "border-box",
                                    overflow: "hidden",
                                    transition: "all 0.2s ease",
                                  }}
                                  title={`${peca.id}: ${Math.round(peca.w)}x${Math.round(peca.h)}mm ${peca.rotacionado ? '(Rotacionado 90°)' : ''}`}
                                >
                                  <div className="flex flex-col items-center justify-center text-center select-none w-full h-full">
                                    <span className="text-[8px] md:text-[9.5px] font-bold text-slate-300 truncate max-w-full leading-none">
                                      {peca.id}
                                    </span>
                                    <span className="text-[7px] md:text-[8px] text-slate-500 font-bold mt-0.5">
                                      {Math.round(peca.w)}x{Math.round(peca.h)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="py-16 text-center text-slate-500 font-semibold bg-white/[0.01] border border-white/5 rounded-xl flex flex-col gap-2 items-center">
                <span>Nenhum arranjo disponível. Certifique-se de que o orçamento possui peças válidas com largura e comprimento cadastrados.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
