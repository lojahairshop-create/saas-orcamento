"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api";
import {
  Search,
  Plus,
  Eye,
  Trash2,
  FileDown,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";

export default function OrcamentosListPage() {
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  async function loadOrcamentos() {
    setLoading(true);
    try {
      const data = await api.getOrcamentos(
        statusFilter || undefined,
        page,
        perPage
      );
      setOrcamentos(data.items || []);
      setTotalPages(Math.ceil(data.total / perPage) || 1);
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrcamentos();
  }, [statusFilter, page]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este orçamento? Esta ação não pode ser desfeita.")) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteOrcamento(id);
      loadOrcamentos();
    } catch (err) {
      alert("Erro ao excluir orçamento");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = (id: string, numero: string) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("token") || "";
    const printUrl = `${apiBaseUrl}/orcamentos/${id}/html?token=${encodeURIComponent(token)}`;
    window.open(printUrl, "_blank");
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Filtragem local por cliente (caso o termo de pesquisa seja digitado)
  const filteredOrcamentos = orcamentos.filter((orc) =>
    orc.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    orc.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Gestão de Orçamentos</h1>
            <p className="text-xs text-slate-500 mt-1">
              Visualize, edite, exporte em PDF ou gerencie o status de suas propostas
            </p>
          </div>
          <Link href="/orcamentos/novo">
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Orçamento
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input
              label="Buscar Orçamento"
              placeholder="Digite o número ou nome do cliente..."
              icon={<Search className="h-4 w-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select
              label="Filtrar por Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1); // Reseta para primeira página
              }}
              options={[
                { value: "", label: "Todos os status" },
                { value: "rascunho", label: "Rascunho" },
                { value: "pendente", label: "Pendente" },
                { value: "aprovado", label: "Aprovado" },
                { value: "reprovado", label: "Reprovado" },
                { value: "cancelado", label: "Cancelado" },
              ]}
            />

            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2 h-10"
              onClick={loadOrcamentos}
            >
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
          </div>
        </Card>

        {/* List Content */}
        <Card>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : filteredOrcamentos.length > 0 ? (
            <div className="flex flex-col gap-4">
              <Table headers={["Nº Orçamento", "Cliente", "Estado", "Data Criação", "Valor Total", "Status", "Ações"]}>
                {filteredOrcamentos.map((orc) => (
                  <TableRow key={orc.id}>
                    <TableCell className="font-bold text-slate-800">{orc.numero}</TableCell>
                    <TableCell>{orc.cliente_nome}</TableCell>
                    <TableCell className="text-center">{orc.cliente_estado}</TableCell>
                    <TableCell>{new Date(orc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{formatCurrency(orc.total_preco)}</TableCell>
                    <TableCell>
                      <Badge status={orc.status} />
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Link href={`/orcamentos/${orc.id}`}>
                        <Button size="sm" variant="ghost" className="p-2" title="Visualizar">
                          <Eye className="h-4 w-4 text-slate-400 hover:text-slate-800" />
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-2"
                        title="Baixar PDF"
                        onClick={() => handleDownloadPdf(orc.id, orc.numero)}
                      >
                        <FileDown className="h-4 w-4 text-teal-600 hover:text-blue-200" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-2"
                        title="Excluir"
                        loading={deletingId === orc.id}
                        onClick={() => handleDelete(orc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 border-t border-gray-200 pt-4">
                  <span className="text-xs text-slate-500 font-semibold">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <FolderOpen className="h-12 w-12 text-slate-700" />
              <span className="text-sm">Nenhum orçamento encontrado.</span>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
