"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api";
import {
  Database,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  FileSpreadsheet,
  TrendingDown,
  Layers,
} from "lucide-react";

interface EstoqueItem {
  id: string;
  material: string;
  tipo_material?: string;
  espessura: number;
  largura: number;
  comprimento: number;
  quantidade: number;
  tipo_registro: string;
  created_at: string;
}

export default function EstoquePage() {
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    material: "AÇO CARBONO",
    tipo_material: "",
    espessura: "",
    largura: "",
    comprimento: "",
    quantidade: "1",
    tipo_registro: "inteira",
  });

  async function loadEstoque() {
    setLoading(true);
    try {
      const data = await api.getEstoque();
      setEstoque(data || []);
    } catch (err) {
      console.error("Erro ao carregar estoque:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEstoque();
  }, []);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.espessura || !form.largura || !form.comprimento || !form.quantidade) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSaveLoading(true);
    const payload = {
      material: form.material,
      tipo_material: form.tipo_material || null,
      espessura: parseFloat(form.espessura),
      largura: parseFloat(form.largura),
      comprimento: parseFloat(form.comprimento),
      quantidade: parseInt(form.quantidade),
      tipo_registro: form.tipo_registro,
    };

    try {
      if (editingId) {
        await api.updateEstoque(editingId, payload);
        alert("Item atualizado com sucesso!");
      } else {
        await api.createEstoque(payload);
        alert("Item adicionado ao estoque!");
      }
      // Reset form
      setForm({
        material: "AÇO CARBONO",
        tipo_material: "",
        espessura: "",
        largura: "",
        comprimento: "",
        quantidade: "1",
        tipo_registro: "inteira",
      });
      setEditingId(null);
      loadEstoque();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar item no estoque.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = (item: EstoqueItem) => {
    setEditingId(item.id);
    setForm({
      material: item.material,
      tipo_material: item.tipo_material || "",
      espessura: item.espessura.toString(),
      largura: item.largura.toString(),
      comprimento: item.comprimento.toString(),
      quantidade: item.quantidade.toString(),
      tipo_registro: item.tipo_registro,
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este item do estoque?")) {
      return;
    }
    try {
      await api.deleteEstoque(id);
      loadEstoque();
    } catch (err: any) {
      alert(err.message || "Erro ao deletar item.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      material: "AÇO CARBONO",
      tipo_material: "",
      espessura: "",
      largura: "",
      comprimento: "",
      quantidade: "1",
      tipo_registro: "inteira",
    });
  };

  // Calcular métricas rápidas
  const totalInteiras = estoque
    .filter((i) => i.tipo_registro === "inteira")
    .reduce((acc, i) => acc + i.quantidade, 0);

  const totalRetalhos = estoque
    .filter((i) => i.tipo_registro === "retalho")
    .reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <AppLayout>
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <Database className="h-8 w-8 text-teal-500" />
              Controle de Estoque de Chapas
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Gerencie chapas inteiras e retalhos. Os consumos e sobras úteis serão atualizados automaticamente na aprovação de ordens de produção.
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-[#0f0f15]/80 border-gray-200 flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-teal-200 flex items-center justify-center text-teal-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Chapas Inteiras</span>
              <h3 className="text-2xl font-bold text-slate-700 mt-1">{totalInteiras} un</h3>
            </div>
          </Card>

          <Card className="p-6 bg-[#0f0f15]/80 border-gray-200 flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Retalhos em Estoque</span>
              <h3 className="text-2xl font-bold text-slate-700 mt-1">{totalRetalhos} un</h3>
            </div>
          </Card>

          <Card className="p-6 bg-[#0f0f15]/80 border-gray-200 flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-teal-500">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Total de Registros</span>
              <h3 className="text-2xl font-bold text-slate-700 mt-1">{estoque.length} itens</h3>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Card */}
          <Card className="lg:col-span-1 p-6 bg-[#0f0f15]/80 border-gray-200 h-fit">
            <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
              {editingId ? <Edit className="h-5 w-5 text-teal-600" /> : <Plus className="h-5 w-5 text-teal-600" />}
              {editingId ? "Editar Registro" : "Adicionar Chapa / Retalho"}
            </h2>

            <form onSubmit={handleAddOrUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Material
                </label>
                <Select
                  value={form.material}
                  onChange={(e) => setForm({ ...form, material: e.target.value })}
                  options={[
                    { value: "AÇO CARBONO", label: "Aço Carbono" },
                    { value: "INOX", label: "Inox" },
                    { value: "ALUMÍNIO", label: "Alumínio" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Tipo/Liga (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: SAE 1020, AISI 304, etc."
                  value={form.tipo_material}
                  onChange={(e) => setForm({ ...form, tipo_material: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Espessura (mm) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="Ex: 1.50"
                    required
                    value={form.espessura}
                    onChange={(e) => setForm({ ...form, espessura: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Tipo Registro *
                  </label>
                  <Select
                    value={form.tipo_registro}
                    onChange={(e) => setForm({ ...form, tipo_registro: e.target.value })}
                    options={[
                      { value: "inteira", label: "Chapa Inteira" },
                      { value: "retalho", label: "Retalho" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Largura (mm) *
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 1200"
                    required
                    value={form.largura}
                    onChange={(e) => setForm({ ...form, largura: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Comprimento (mm) *
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 2400"
                    required
                    value={form.comprimento}
                    onChange={(e) => setForm({ ...form, comprimento: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Quantidade *
                </label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 border-gray-200 text-slate-600 hover:text-slate-700"
                    onClick={cancelEdit}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveLoading ? "Salvando..." : editingId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Card>

          {/* List Card */}
          <Card className="lg:col-span-2 p-6 bg-[#0f0f15]/80 border-gray-200">
            <h2 className="text-lg font-bold text-slate-700 mb-6">
              Inventário de Chapas e Retalhos
            </h2>

            {loading ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                Carregando inventário de chapas...
              </div>
            ) : estoque.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                Nenhuma chapa ou retalho cadastrado no estoque.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table headers={["Material", "Liga/Especificação", "Tipo", "Espessura", "Dimensões", "Quantidade", "Ações"]}>
                  {estoque.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell className="py-4 pl-4 font-semibold text-slate-600">
                          {item.material}
                        </TableCell>
                        <TableCell className="py-4 text-slate-600">
                          {item.tipo_material || "-"}
                        </TableCell>
                        <TableCell className="py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                              item.tipo_registro === "inteira"
                                ? "bg-blue-500/10 text-teal-600 border border-teal-200"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {item.tipo_registro === "inteira" ? "Inteira" : "Retalho"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-center font-mono text-slate-600">
                          {item.espessura.toFixed(2)} mm
                        </TableCell>
                        <TableCell className="py-4 text-center font-mono text-slate-600">
                          {item.largura.toFixed(0)} x {item.comprimento.toFixed(0)} mm
                        </TableCell>
                        <TableCell className="py-4 text-center font-mono text-slate-700 font-bold">
                          {item.quantidade} un
                        </TableCell>
                        <TableCell className="py-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleEdit(item)}
                              title="Editar"
                              className="text-slate-600 hover:text-teal-600 transition-colors p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              title="Excluir"
                              className="text-slate-600 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
