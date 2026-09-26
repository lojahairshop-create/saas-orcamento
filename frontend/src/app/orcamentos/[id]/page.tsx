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
import NestingVisualizer from "@/components/orcamento/NestingVisualizer";
import NestingViewerAdapter from "@/components/nesting/NestingViewerAdapter";

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

  const handleDownloadNestingPdf = () => {
    if (!orcamento) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("token") || "";
    const printUrl = `${apiBaseUrl}/orcamentos/${orcamento.id}/nesting-html?token=${encodeURIComponent(token)}`;
    window.open(printUrl, "_blank");
  };

  const handleDownloadRelatorio = () => {
    if (!orcamento) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("token") || "";
    const printUrl = `${apiBaseUrl}/orcamentos/${orcamento.id}/relatorio-html?token=${encodeURIComponent(token)}`;
    window.open(printUrl, "_blank");
  };

  // Removida chamada runNestingAnalysis, pois agora os dados vêm de orcamento.nesting_json

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
          <Link href="/orcamentos" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors">
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

            {activeTab === "nesting" && (
              <Button
                variant="secondary"
                onClick={handleDownloadNestingPdf}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <FileDown className="h-4 w-4" /> PDF do Arranjo
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={handleDownloadRelatorio}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white border-none"
            >
              <FileDown className="h-4 w-4" /> Relatório de Custos
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800">{orcamento.numero}</h1>
              <Badge status={orcamento.status} />
            </div>
            <span className="text-xs text-slate-600 font-semibold">
              Orçamento de {orcamento.tipo_venda === "pecas" ? "Peças Industriais" : "Equipamentos"}
            </span>
          </div>

          <div className="flex gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Criação</span>
                <span className="font-semibold text-slate-800">
                  {new Date(orcamento.created_at || "").toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-teal-600" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Vendedor</span>
                <span className="font-semibold text-slate-800">MetalCut Pro Admin</span>
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
                : "text-slate-600 hover:text-slate-900 hover:bg-white/5"
            }`}
          >
            Resumo Comercial
          </button>
          <button
            onClick={() => setActiveTab("nesting")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "nesting"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/5"
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
                    <span className="font-bold text-slate-800">{orcamento.cliente.nome}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">CNPJ / CPF</span>
                    <span className="text-slate-700 font-medium">{orcamento.cliente.cnpj || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">E-mail Comercial</span>
                    <span className="text-slate-700 font-medium">{orcamento.cliente.email || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Telefone Contato</span>
                    <span className="text-slate-700 font-medium">{orcamento.cliente.telefone || "Não informado"}</span>
                  </div>
                  <div className="col-span-2 border-t border-gray-200 pt-3">
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Endereço Completo</span>
                    <span className="text-slate-700 font-medium">
                      {orcamento.cliente.endereco || "Não informado"} - {orcamento.cliente.cidade || ""} ({orcamento.cliente.estado})
                    </span>
                  </div>
                </div>
              </Card>

              <Card header="Condições de Venda">
                <div className="flex flex-col gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Pagamento</span>
                    <span className="font-medium text-slate-800">{orcamento.condicao_pagamento || "A combinar"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Prazo de Entrega</span>
                    <span className="font-medium text-slate-800">{orcamento.prazo_entrega || "A combinar"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Frete</span>
                    <span className="font-medium text-slate-800">{orcamento.frete || "FOB"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-semibold mb-0.5">Validade da Proposta</span>
                    <span className="font-medium text-slate-800">{orcamento.validade} dias corridos</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed Items Table */}
            <Card header="Itens e Memória de Cálculo">
              <Table headers={["Item", "Descrição da Peça", "Material", "Espessura", "Qtd", "Peso Total", "Unitário c/ Imp", "Total c/ Imp"]}>
                {orcamento.itens.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-slate-800">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-slate-800">{item.descricao}</span>
                        {(item as any).beneficiamento && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block ml-2">
                            Beneficiamento (Material do Cliente)
                          </span>
                        )}
                        {item.observacoes && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">Obs: {item.observacoes}</span>
                        )}
                        {((item as any).tempo_corte > 0 || (item as any).custo_extra > 0) && (
                          <div className="text-[10px] text-teal-600 flex gap-3 mt-0.5">
                            {(item as any).tempo_corte > 0 && <span>Tempo Corte: {(item as any).tempo_corte} min</span>}
                            {(item as any).custo_extra > 0 && <span>Custo Extra: {formatCurrency((item as any).custo_extra)}</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">{item.material}</TableCell>
                    <TableCell className="text-slate-700">{item.espessura} mm</TableCell>
                    <TableCell className="text-center text-slate-700">{item.quantidade}</TableCell>
                    <TableCell className="text-slate-700">{item.peso_total?.toFixed(2)} kg</TableCell>
                    <TableCell className="text-slate-700">{formatCurrency(item.preco_unitario_com_imp || 0)}</TableCell>
                    <TableCell className="font-bold text-slate-800">{formatCurrency(item.preco_total || 0)}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 flex flex-col gap-6">
                {orcamento.observacoes && (
                  <Card header="Condições Gerais de Fornecimento">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{orcamento.observacoes}</p>
                  </Card>
                )}
              </div>

              <Card
                header={
                  <div className="flex items-center gap-1.5 text-teal-600">
                    <Layers className="h-4.5 w-4.5" />
                    <span>Resumo Tributário & Custos</span>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Custo Matéria-Prima:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(orcamento.total_custo_mp)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Custo de Fabricação:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(orcamento.total_fabricacao)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Impostos Embutidos (Médio):</span>
                    <span className="font-semibold text-red-500">{formatCurrency(orcamento.total_tributos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Comissão Operacional:</span>
                    <span className="font-semibold text-amber-600">{formatCurrency(orcamento.total_comissao)}</span>
                  </div>

                  <div className="border-t border-gray-200 my-3" />

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">VALOR PRODUTOS:</span>
                    <span className="text-lg font-extrabold text-teal-600">{formatCurrency(orcamento.total_preco)}</span>
                  </div>

                  {orcamento.ipi_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-semibold">IPI ({orcamento.ipi_rate * 100}% por fora):</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(orcamento.total_nf - orcamento.total_preco)}
                      </span>
                    </div>
                  )}

                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mt-4 flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                      TOTAL NOTA FISCAL (c/ IPI)
                    </span>
                    <span className="text-2xl font-black text-slate-900">
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
          <NestingViewerAdapter nesting={orcamento?.nesting_json || []} itens={orcamento?.itens || []} readOnly={false} />
        )}
      </div>
    </AppLayout>
  );
}
