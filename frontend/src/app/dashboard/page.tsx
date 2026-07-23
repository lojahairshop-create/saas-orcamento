"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import KPICard from "@/components/dashboard/KPICard";
import FaturamentoChart from "@/components/dashboard/FaturamentoChart";
import AprovacaoChart from "@/components/dashboard/AprovacaoChart";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { DashboardResumo } from "@/types";
import {
  TrendingUp,
  Percent,
  Clock,
  AlertOctagon,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResumo | null>(null);
  const [recentOrcamentos, setRecentOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const resumo = await api.getDashboardResumo();
        setData(resumo);
        
        const list = await api.getOrcamentos(undefined, 1, 5);
        setRecentOrcamentos(list.items || []);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Painel de Resumo</h1>
            <p className="text-xs text-slate-600 mt-1">Acompanhe seus orçamentos e conversão comercial</p>
          </div>
          <Link href="/orcamentos/novo">
            <Button size="sm">Novo Orçamento</Button>
          </Link>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            label="Faturamento Cotado"
            value={formatCurrency(data?.faturamento_cotado || 0)}
            icon={TrendingUp}
            color="blue"
            trend="Total orçado no sistema"
            trendDirection="up"
          />
          <KPICard
            label="Taxa de Aprovação"
            value={`${data?.taxa_aprovacao || 0}%`}
            icon={Percent}
            color="emerald"
            trend="Orçamentos fechados / totais"
            trendDirection="up"
          />
          <KPICard
            label="Orçamentos Pendentes"
            value={data?.total_pendentes || 0}
            icon={Clock}
            color="amber"
            trend="Aguardando aprovação do cliente"
            trendDirection="up"
          />
          <KPICard
            label="Orçamentos Reprovados"
            value={data?.total_reprovados || 0}
            icon={AlertOctagon}
            color="red"
            trend="Não convertidos comercialmente"
            trendDirection="down"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" header="Faturamento Mensal (Cotado vs Aprovado)">
            {data?.faturamento_por_mes && data.faturamento_por_mes.length > 0 ? (
              <FaturamentoChart data={data.faturamento_por_mes} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                Sem histórico de faturamento
              </div>
            )}
          </Card>

          <Card header="Status dos Orçamentos">
            <AprovacaoChart
              aprovados={data?.total_aprovados || 0}
              pendentes={data?.total_pendentes || 0}
              reprovados={data?.total_reprovados || 0}
            />
          </Card>
        </div>

        {/* Recent Quotations Table */}
        <Card
          header={
            <div className="flex justify-between items-center w-full">
              <span>Orçamentos Recentes</span>
              <Link href="/orcamentos" className="text-xs text-teal-500 hover:underline flex items-center gap-1 font-semibold">
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          }
        >
          {recentOrcamentos.length > 0 ? (
            <Table headers={["Nº Orçamento", "Cliente", "Data de Criação", "Valor Total", "Status", "Ações"]}>
              {recentOrcamentos.map((orc) => (
                <TableRow key={orc.id}>
                  <TableCell className="font-bold text-slate-800">{orc.numero}</TableCell>
                  <TableCell>{orc.cliente_nome}</TableCell>
                  <TableCell>{new Date(orc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{formatCurrency(orc.total_preco)}</TableCell>
                  <TableCell>
                    <Badge status={orc.status} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/orcamentos/${orc.id}`}>
                      <Button size="sm" variant="ghost" className="text-xs">
                        Detalhes
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
              <ClipboardList className="h-10 w-10 text-slate-600" />
              <span className="text-sm">Nenhum orçamento cadastrado ainda.</span>
              <Link href="/orcamentos/novo">
                <Button size="sm" variant="secondary" className="mt-1">
                  Criar Primeiro Orçamento
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
