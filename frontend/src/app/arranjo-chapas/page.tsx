"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import {
  Layers,
  RefreshCw,
  Search,
  Maximize2,
  Minimize2,
  Cpu,
  Boxes,
  HelpCircle,
  Play,
  RotateCw,
  Printer,
  Edit,
  Check,
  X,
  CheckCircle2,
} from "lucide-react";

export default function ArranjoChapasPage() {
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [selectedOrcamentos, setSelectedOrcamentos] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("aprovado");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingOrcamentos, setLoadingOrcamentos] = useState(true);

  // Itens para nesting carregados
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Agrupamentos e Nesting
  const [groupedItems, setGroupedItems] = useState<{ [key: string]: any[] }>({});
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [configs, setConfigs] = useState<{
    [key: string]: { chapa_l: number; chapa_c: number; gap: number };
  }>({});
  const [nestingResults, setNestingResults] = useState<{ [key: string]: any }>({});
  const [nestingLoading, setNestingLoading] = useState<{ [key: string]: boolean }>({});
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  // Controle de estoque e baixa
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loadingEstoque, setLoadingEstoque] = useState(false);
  const [baixaLoading, setBaixaLoading] = useState<{ [key: string]: boolean }>({});

  // Edição inline de peças no arranjo
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    descricao: string;
    largura: number;
    comprimento: number;
    quantidade: number;
  }>({
    descricao: "",
    largura: 0,
    comprimento: 0,
    quantidade: 0,
  });

  // Modal de Origem do Material
  const [modalOpen, setModalOpen] = useState(false);
  const [modalGroupKey, setModalGroupKey] = useState<string | null>(null);
  const [modalTipoChapa, setModalTipoChapa] = useState<string>("automatico");
  const [modalChapaClienteL, setModalChapaClienteL] = useState<number>(1200);
  const [modalChapaClienteC, setModalChapaClienteC] = useState<number>(2400);

  // Seleção múltipla para edição em massa
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modal de Edição em Massa
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalGroupKey, setBulkModalGroupKey] = useState<string | null>(null);
  const [bulkNewMaterial, setBulkNewMaterial] = useState<string>("");
  const [bulkNewEspessura, setBulkNewEspessura] = useState<string>("");
  const [bulkNewQuantidade, setBulkNewQuantidade] = useState<string>("");
  const [bulkQuantityMultiplier, setBulkQuantityMultiplier] = useState<string>("");

  // Regrupar itens por material e espessura no frontend
  const regroupItems = (flatItems: any[]) => {
    const groups: { [key: string]: any[] } = {};
    const newConfigs = { ...configs };
    const newExpanded = { ...expandedGroups };

    flatItems.forEach((item: any) => {
      const key = `${item.material} - ${item.espessura}mm`;
      if (!groups[key]) {
        groups[key] = [];
        if (!newConfigs[key]) {
          newConfigs[key] = {
            chapa_l: item.chapa_l || 1200,
            chapa_c: item.chapa_c || 2400,
            gap: 5.0,
          };
        }
        if (newExpanded[key] === undefined) {
          newExpanded[key] = true;
        }
      }
      groups[key].push(item);
    });

    setGroupedItems(groups);
    setConfigs(newConfigs);
    setExpandedGroups(newExpanded);
    setSelectedGroups((prevSelected) => {
      const activeKeys = Object.keys(groups);
      if (prevSelected.length === 0) {
        return activeKeys;
      }
      return prevSelected.filter((key) => activeKeys.includes(key));
    });
  };

  // Carregar estoque de chapas
  async function loadEstoque() {
    setLoadingEstoque(true);
    try {
      const data = await api.getEstoque();
      setEstoque(data || []);
    } catch (err) {
      console.error("Erro ao carregar estoque:", err);
    } finally {
      setLoadingEstoque(false);
    }
  }

  // Carregar orçamentos ao montar o componente ou mudar filtro de status
  async function loadOrcamentos() {
    setLoadingOrcamentos(true);
    try {
      const data = await api.getOrcamentos(statusFilter || undefined, 1, 100);
      setOrcamentos(data.items || []);
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err);
    } finally {
      setLoadingOrcamentos(false);
    }
  }

  useEffect(() => {
    loadOrcamentos();
    loadEstoque();
  }, [statusFilter]);

  // Buscar itens para nesting quando a seleção de orçamentos muda
  useEffect(() => {
    async function loadItens() {
      if (selectedOrcamentos.length === 0) {
        setItems([]);
        setGroupedItems({});
        setSelectedGroups([]);
        setSelectedItemIds([]);
        return;
      }
      setLoadingItems(true);
      try {
        const data = await api.getItensParaNesting(undefined, selectedOrcamentos.join(","));
        setItems(data || []);
        regroupItems(data || []);
        setSelectedItemIds([]);
      } catch (err) {
        console.error("Erro ao carregar itens para nesting:", err);
      } finally {
        setLoadingItems(false);
      }
    }
    loadItens();
  }, [selectedOrcamentos]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredOrcamentos.map((o) => o.id);
      setSelectedOrcamentos(allIds);
    } else {
      setSelectedOrcamentos([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedOrcamentos([...selectedOrcamentos, id]);
    } else {
      setSelectedOrcamentos(selectedOrcamentos.filter((oId) => oId !== id));
    }
  };

  const handleSelectGroupAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(Object.keys(groupedItems));
    } else {
      setSelectedGroups([]);
    }
  };

  const handleSelectGroupOne = (groupKey: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups([...selectedGroups, groupKey]);
    } else {
      setSelectedGroups(selectedGroups.filter((g) => g !== groupKey));
    }
  };

  const handleConfigChange = (groupKey: string, field: string, value: number) => {
    setConfigs({
      ...configs,
      [groupKey]: {
        ...configs[groupKey],
        [field]: value,
      },
    });
  };

  // Funções para edição inline de peças
  const handleStartEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditFields({
      descricao: item.descricao,
      largura: item.largura,
      comprimento: item.comprimento,
      quantidade: item.quantidade,
    });
  };

  const handleSaveEditItem = (groupKey: string, itemId: string) => {
    const updatedItems = items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          descricao: editFields.descricao,
          largura: Number(editFields.largura),
          comprimento: Number(editFields.comprimento),
          quantidade: Number(editFields.quantidade),
          area: (Number(editFields.largura) * Number(editFields.comprimento)) / 1e6,
        };
      }
      return it;
    });

    setItems(updatedItems);
    regroupItems(updatedItems);
    setEditingItemId(null);
  };

  // Funções para seleção e aplicação de edição em massa
  const handleToggleSelectItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleSelectAllGroup = (groupKey: string, checked: boolean) => {
    const groupItemIds = (groupedItems[groupKey] || []).map((it) => it.id);
    if (checked) {
      setSelectedItemIds((prev) => {
        const uniqueNewIds = groupItemIds.filter((id) => !prev.includes(id));
        return [...prev, ...uniqueNewIds];
      });
    } else {
      setSelectedItemIds((prev) => prev.filter((id) => !groupItemIds.includes(id)));
    }
  };

  const handleApplyBulkEdit = (groupKey: string) => {
    const groupItems = groupedItems[groupKey] || [];
    const selectedGroupIds = groupItems
      .filter((it) => selectedItemIds.includes(it.id))
      .map((it) => it.id);

    if (selectedGroupIds.length === 0) return;

    const updatedItems = items.map((it) => {
      if (selectedGroupIds.includes(it.id)) {
        let mat = it.material;
        let esp = it.espessura;
        let qty = it.quantidade;

        if (bulkNewMaterial) mat = bulkNewMaterial;
        if (bulkNewEspessura) esp = Number(bulkNewEspessura) || esp;
        if (bulkNewQuantidade) qty = Number(bulkNewQuantidade) || qty;
        else if (bulkQuantityMultiplier) qty = Math.max(1, Math.round(qty * (Number(bulkQuantityMultiplier) || 1)));

        return {
          ...it,
          material: mat,
          espessura: esp,
          quantidade: qty,
          area: (it.largura * it.comprimento) / 1e6,
        };
      }
      return it;
    });

    setItems(updatedItems);
    regroupItems(updatedItems);

    setSelectedItemIds((prev) => prev.filter((id) => !selectedGroupIds.includes(id)));
    setBulkModalOpen(false);
    setBulkModalGroupKey(null);
  };

  const runNesting = async (
    groupKey: string,
    tipoChapa: string = "automatico",
    chapaClienteL?: number,
    chapaClienteC?: number
  ) => {
    const groupItems = groupedItems[groupKey];
    const config = configs[groupKey];
    if (!groupItems || groupItems.length === 0 || !config) return;

    // Filtrar apenas peças com dimensões maiores que 0 para evitar erro no validador do backend
    const validItems = groupItems.filter((it) => it.largura > 0 && it.comprimento > 0);
    if (validItems.length === 0) {
      alert("Nenhuma peça com dimensões válidas (> 0) neste grupo.");
      return;
    }

    const firstItem = validItems[0];
    const material = firstItem.material;
    const espessura = firstItem.espessura;

    setNestingLoading((prev) => ({ ...prev, [groupKey]: true }));
    try {
      const payload = {
        itens: validItems.map((it) => ({
          id: `${it.orcamento_numero} | ${it.descricao}`,
          largura: it.largura,
          comprimento: it.comprimento,
          quantidade: it.quantidade,
          vetor_svg: it.vetor_svg,
        })),
        chapa_l: config.chapa_l,
        chapa_c: config.chapa_c,
        gap: config.gap,
        tipo_chapa: tipoChapa,
        chapa_cliente_l: chapaClienteL,
        chapa_cliente_c: chapaClienteC,
        material: material,
        espessura: espessura,
      };

      const result = await api.calcularNesting(payload);
      
      setNestingResults((prev) => ({
        ...prev,
        [groupKey]: {
          ...result,
          tipo_chapa: tipoChapa,
          material: material,
          espessura: espessura,
        }
      }));
    } catch (err) {
      console.error("Erro ao calcular nesting:", err);
      alert("Erro ao calcular arranjo de nesting.");
    } finally {
      setNestingLoading((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  const handleAprovarNesting = async (groupKey: string) => {
    const result = nestingResults[groupKey];
    if (!result) return;

    if (!window.confirm("Deseja aprovar este arranjo de chapas e dar baixa nos materiais utilizados no estoque?")) {
      return;
    }

    setBaixaLoading((prev) => ({ ...prev, [groupKey]: true }));
    try {
      const chapasPayload = result.chapas.map((chapa: any) => ({
        id: chapa.id,
        quantidade: 1,
        tipo_registro: chapa.tipo_registro,
        largura: chapa.l,
        comprimento: chapa.c,
        material: result.material,
        espessura: result.espessura,
        retalho_gerado: chapa.retalho_gerado,
      }));

      const res = await api.darBaixaNesting({ chapas: chapasPayload });
      
      if (res.avisos && res.avisos.length > 0) {
        alert("Nesting aprovado com os seguintes avisos:\n\n" + res.avisos.join("\n"));
      } else {
        alert("Baixa no estoque realizada com sucesso!");
      }

      // Limpar resultados desta otimização após aprovação
      setNestingResults((prev) => {
        const copy = { ...prev };
        delete copy[groupKey];
        return copy;
      });

      // Recarregar estoque para refletir as baixas
      loadEstoque();
    } catch (err: any) {
      console.error("Erro ao dar baixa no nesting:", err);
      alert(err.message || "Erro ao dar baixa no estoque.");
    } finally {
      setBaixaLoading((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  const handlePrintReport = (groupKey: string) => {
    const result = nestingResults[groupKey];
    const config = configs[groupKey];
    if (!result || !config) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita pop-ups para abrir o relatório.");
      return;
    }

    let sheetsHtml = "";
    result.chapas.forEach((chapa: any, cIdx: number) => {
      const aspectRatio = chapa.l / chapa.c;
      const maxWidth = 850;
      const height = maxWidth * aspectRatio;

      let piecesHtml = "";
      chapa.pecas.forEach((peca: any) => {
        const leftPct = (peca.y / chapa.c) * 100;
        const topPct = (peca.x / chapa.l) * 100;
        const widthPct = (peca.h / chapa.c) * 100;
        const heightPct = (peca.w / chapa.l) * 100;

        let innerContent = "";
        if (peca.vetor_svg) {
          const rotStyle = peca.rotacionado
            ? `width: ${heightPct}%; height: ${widthPct}%; transform: rotate(90deg); transform-origin: center;`
            : "width: 100%; height: 100%;";
          
          innerContent = `
            <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              <div style="${rotStyle} display: flex; align-items: center; justify-content: center; color: #2563eb;">
                ${peca.vetor_svg}
              </div>
              <div style="position: absolute; pointer-events: none; text-align: center; color: #1e293b; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <span style="font-size: 8px; font-weight: bold; background: rgba(255,255,255,0.8); padding: 1px 3px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.15); max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${peca.id.split("|")[1]?.trim() || peca.id}
                </span>
                <span style="font-size: 7px; color: #475569; background: rgba(255,255,255,0.8); padding: 1px 2px; border-radius: 2px; margin-top: 1px; font-weight: 600;">
                  ${Math.round(peca.w)}x${Math.round(peca.h)}
                </span>
              </div>
            </div>
          `;
        } else {
          innerContent = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center;">
              <span style="font-size: 8px; font-weight: bold; color: #1e3a8a; max-width: 95%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${peca.id.split("|")[1]?.trim() || peca.id}
              </span>
              <span style="font-size: 7px; color: #475569; margin-top: 1px; font-weight: 600;">
                ${Math.round(peca.w)}x${Math.round(peca.h)}
              </span>
            </div>
          `;
        }

        const borderStyle = peca.rotacionado
          ? "border: 1px solid #d97706; background-color: rgba(245, 158, 11, 0.03);"
          : "border: 1px solid #2563eb; background-color: rgba(59, 130, 246, 0.03);";

        piecesHtml += `
          <div style="position: absolute; left: ${leftPct}%; top: ${topPct}%; width: ${widthPct}%; height: ${heightPct}%; box-sizing: border-box; ${borderStyle} overflow: hidden;">
            ${innerContent}
          </div>
        `;
      });

      const retalhoInfo = chapa.retalho_gerado
        ? `<div style="margin-top: 8px; font-size: 10px; color: #047857; font-weight: bold; font-family: sans-serif;">
             🌱 Sobra de Material: Retalho de ${chapa.retalho_gerado.largura}x${chapa.retalho_gerado.comprimento}mm alocado automaticamente ao estoque
           </div>`
        : "";

      sheetsHtml += `
        <div class="chapa-container">
          <div class="chapa-header">
            Layout da Chapa #${cIdx + 1} (Dimensões: ${chapa.c}x${chapa.l}mm | Aproveitamento: ${chapa.aproveitamento}%)
            ${chapa.fora_de_estoque ? ' - <span style="color: #dc2626;">(FORA DE ESTOQUE)</span>' : ''}
          </div>
          <div class="cad-view" style="width: ${maxWidth}px; height: ${height}px;">
            ${piecesHtml}
          </div>
          ${retalhoInfo}
        </div>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Arranjo de Chapas - ${groupKey}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            font-size: 10pt;
            line-height: 1.4;
            background-color: #ffffff;
          }
          .header {
            margin-bottom: 20px;
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
          }
          .title {
            font-size: 16pt;
            font-weight: bold;
            color: #0f172a;
          }
          .subtitle {
            font-size: 10pt;
            color: #475569;
            margin-top: 2px;
          }
          .stats-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 6px;
          }
          .stats-col {
            display: table-cell;
            width: 25%;
            font-size: 9pt;
          }
          .chapa-container {
            margin-bottom: 35px;
            page-break-inside: avoid;
          }
          .chapa-header {
            font-size: 10pt;
            font-weight: bold;
            color: #334155;
            margin-bottom: 8px;
          }
          .cad-view {
            border: 1px dashed #475569;
            background-color: #f8fafc;
            position: relative;
            box-sizing: border-box;
          }
          svg {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <table class="header-table">
            <tr>
              <td>
                <div class="title">Relatório de Otimização de Arranjo (Nesting)</div>
                <div class="subtitle">Grupo de Material: <strong>${groupKey}</strong></div>
              </td>
              <td style="text-align: right; font-size: 9pt; color: #475569; vertical-align: bottom;">
                Gerado em: ${new Date().toLocaleString("pt-BR")}
              </td>
            </tr>
          </table>
        </div>

        <div class="stats-grid">
          <div class="stats-col">
            <strong>Aproveitamento Médio:</strong> <span style="color: #059669; font-weight: bold;">${result.aproveitamento_medio}%</span>
          </div>
          <div class="stats-col">
            <strong>Chapas Utilizadas:</strong> ${result.total_chapas}
          </div>
          <div class="stats-col">
            <strong>Espaçamento (Gap):</strong> ${config.gap} mm
          </div>
          <div class="stats-col">
            <strong>Eficiência Total:</strong> ${result.total_chapas > 0 ? (result.chapas.reduce((acc: number, c: any) => acc + c.pecas.length, 0)) : 0} peças dispostas
          </div>
        </div>

        ${sheetsHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupKey]: !expandedGroups[groupKey],
    });
  };

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
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" /> Otimização de Arranjo de Chapas
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Agrupe e organize peças de múltiplos orçamentos para corte laser e nesting otimizado.
            </p>
          </div>
        </div>

        {/* Section 1: Orçamentos & Materiais Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Filtros e Seleção */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Card 1: Seleção de Orçamentos */}
            <Card header="Seletor de Orçamentos" className="h-[320px] flex flex-col">
              <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar por cliente/número..."
                      icon={<Search className="h-4 w-4" />}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      options={[
                        { value: "", label: "Todos" },
                        { value: "aprovado", label: "Aprovados" },
                        { value: "pendente", label: "Pendentes" },
                        { value: "rascunho", label: "Rascunho" },
                      ]}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Orcamentos Checkbox List */}
                <div className="flex-1 overflow-y-auto border border-white/5 bg-black/10 rounded-lg p-3 space-y-2">
                  {loadingOrcamentos ? (
                    <div className="h-full flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-slate-600 animate-spin" />
                    </div>
                  ) : filteredOrcamentos.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                      Nenhum orçamento encontrado.
                    </div>
                  ) : (
                    <>
                      <label className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-white/5 rounded transition-colors text-xs font-bold text-slate-400 border-b border-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            filteredOrcamentos.length > 0 &&
                            selectedOrcamentos.length === filteredOrcamentos.length
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500"
                        />
                        Selecionar Todos
                      </label>
                      {filteredOrcamentos.map((orc) => (
                        <label
                          key={orc.id}
                          className={`flex items-center justify-between gap-2 px-2 py-2 hover:bg-white/5 rounded cursor-pointer transition-all ${
                            selectedOrcamentos.includes(orc.id)
                              ? "bg-blue-600/5 border border-blue-500/20"
                              : "border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedOrcamentos.includes(orc.id)}
                              onChange={(e) => handleSelectOne(orc.id, e.target.checked)}
                              className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-200 truncate">
                                {orc.cliente_nome}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                {orc.numero}
                              </span>
                            </div>
                          </div>
                          <Badge status={orc.status} />
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Card 2: Seleção de Materiais e Espessuras */}
            <Card header="Materiais & Espessuras" className="h-[320px] flex flex-col">
              <div className="flex flex-col gap-3 h-full">
                {selectedOrcamentos.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-500 font-semibold p-4">
                    Selecione primeiro os orçamentos para listar os materiais disponíveis.
                  </div>
                ) : loadingItems ? (
                  <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-slate-600 animate-spin" />
                  </div>
                ) : Object.keys(groupedItems).length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-500 font-semibold p-4">
                    Nenhum material encontrado nas peças dos orçamentos selecionados.
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto border border-white/5 bg-black/10 rounded-lg p-3 space-y-2">
                    <label className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-white/5 rounded transition-colors text-xs font-bold text-slate-400 border-b border-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          Object.keys(groupedItems).length > 0 &&
                          selectedGroups.length === Object.keys(groupedItems).length
                        }
                        onChange={(e) => handleSelectGroupAll(e.target.checked)}
                        className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500"
                      />
                      Selecionar Todos os Grupos
                    </label>
                    {Object.entries(groupedItems).map(([groupKey, groupItems]) => (
                      <label
                        key={groupKey}
                        className={`flex items-center justify-between gap-2 px-2 py-2 hover:bg-white/5 rounded cursor-pointer transition-all ${
                          selectedGroups.includes(groupKey)
                            ? "bg-blue-600/5 border border-blue-500/20"
                            : "border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(groupKey)}
                            onChange={(e) => handleSelectGroupOne(groupKey, e.target.checked)}
                            className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {groupKey}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {groupItems.reduce((acc, it) => acc + it.quantidade, 0)} peça(s) no total
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Section 2: Grouped Items & Nesting Analysis */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {selectedOrcamentos.length === 0 ? (
              <div className="h-[660px] flex flex-col items-center justify-center text-center p-8 bg-white/[0.01] border border-white/5 rounded-xl text-slate-500 gap-3">
                <Boxes className="h-10 w-10 text-slate-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-400">Nenhum orçamento selecionado</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Selecione um ou mais orçamentos na lista lateral para agrupar as peças e calcular a disposição de chapas.
                  </p>
                </div>
              </div>
            ) : loadingItems ? (
              <div className="h-[660px] flex flex-col items-center justify-center gap-3 bg-white/[0.01] border border-white/5 rounded-xl">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Carregando peças dos orçamentos...</span>
              </div>
            ) : Object.keys(groupedItems).length === 0 ? (
              <div className="h-[660px] flex flex-col items-center justify-center p-8 bg-white/[0.01] border border-white/5 rounded-xl text-slate-500 gap-3">
                <Boxes className="h-10 w-10 text-slate-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-400">Nenhuma peça disponível</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Os orçamentos selecionados não possuem peças válidas com dimensões cadastradas.
                  </p>
                </div>
              </div>
            ) : selectedGroups.length === 0 ? (
              <div className="h-[660px] flex flex-col items-center justify-center text-center p-8 bg-white/[0.01] border border-white/5 rounded-xl text-slate-500 gap-3">
                <Layers className="h-10 w-10 text-slate-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-400">Nenhum material selecionado</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Selecione pelo menos um material/espessura na lista lateral esquerda para calcular o nesting correspondente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto max-h-[660px] pr-1">
                {Object.entries(groupedItems)
                  .filter(([groupKey]) => selectedGroups.includes(groupKey))
                  .map(([groupKey, groupItems]) => {
                  const config = configs[groupKey] || { chapa_l: 1200, chapa_c: 2400, gap: 5.0 };
                  const result = nestingResults[groupKey];
                  const loading = nestingLoading[groupKey];
                  const expanded = expandedGroups[groupKey];

                  const allGroupSelected = groupItems.length > 0 && groupItems.every((it) => selectedItemIds.includes(it.id));
                  const someGroupSelected = groupItems.some((it) => selectedItemIds.includes(it.id));
                  const groupSelectedCount = groupItems.filter((it) => selectedItemIds.includes(it.id)).length;
                  
                  const tableHeaders = [
                    <input
                      key="select-all-checkbox"
                      type="checkbox"
                      checked={allGroupSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = someGroupSelected && !allGroupSelected;
                        }
                      }}
                      onChange={(e) => handleToggleSelectAllGroup(groupKey, e.target.checked)}
                      className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />,
                    "Orçamento",
                    "Peça",
                    "Dimensões (mm)",
                    "Quantidade",
                    "Área Unit (m²)",
                    "Ações"
                  ];

                  return (
                    <Card
                      key={groupKey}
                      className="border border-white/5"
                      header={
                        <div className="flex justify-between items-center w-full">
                          <button
                            onClick={() => toggleGroup(groupKey)}
                            className="flex items-center gap-2 font-bold text-slate-200 text-sm hover:text-white transition-colors cursor-pointer"
                          >
                            <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px]">
                              {groupItems.length} Peça(s)
                            </span>
                            <span>{groupKey}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            {result && (
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                Aproveitamento: {result.aproveitamento_medio}%
                              </span>
                            )}
                            <button
                              onClick={() => toggleGroup(groupKey)}
                              className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                              {expanded ? (
                                <Minimize2 className="h-4 w-4" />
                              ) : (
                                <Maximize2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      }
                    >
                      {expanded && (
                        <div className="flex flex-col gap-4 mt-2">
                          {/* Barra de Ações para Edição em Massa */}
                          <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-4 py-2 rounded-lg text-xs">
                            <span className="text-slate-400 font-semibold">
                              Selecione peças na tabela para habilitar a edição em massa.
                            </span>
                            {groupSelectedCount > 0 && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setBulkModalGroupKey(groupKey);
                                  setBulkNewMaterial("");
                                  setBulkNewEspessura("");
                                  setBulkNewQuantidade("");
                                  setBulkQuantityMultiplier("");
                                  setBulkModalOpen(true);
                                }}
                                className="h-7 text-[10px] cursor-pointer bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20 px-3 flex items-center gap-1 select-none font-bold"
                              >
                                <Edit className="h-3 w-3" /> Editar em Massa ({groupSelectedCount})
                              </Button>
                            )}
                          </div>

                          {/* List of items in this group */}
                          <Table headers={tableHeaders}>
                            {groupItems.map((item, itIdx) => {
                              const isEditing = editingItemId === item.id;
                              return (
                                <TableRow key={item.id || itIdx}>
                                  <TableCell className="w-10 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.includes(item.id)}
                                      onChange={() => handleToggleSelectItem(item.id)}
                                      className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </TableCell>
                                  <TableCell className="font-semibold text-slate-400 text-xs">
                                    {item.orcamento_numero}
                                  </TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <Input
                                        value={editFields.descricao}
                                        onChange={(e) => setEditFields({ ...editFields, descricao: e.target.value })}
                                        className="h-8 text-xs bg-slate-950/40 border-white/10"
                                      />
                                    ) : (
                                      <div className="flex flex-col">
                                        <span className="font-bold text-xs text-slate-200">{item.descricao}</span>
                                        {item.cliente_nome && (
                                          <span className="text-[9px] text-slate-500 font-semibold">{item.cliente_nome}</span>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          value={editFields.largura}
                                          onChange={(e) => setEditFields({ ...editFields, largura: parseFloat(e.target.value) || 0 })}
                                          className="h-8 w-16 text-xs bg-slate-950/40 border-white/10"
                                        />
                                        <span className="text-[10px] text-slate-500">x</span>
                                        <Input
                                          type="number"
                                          value={editFields.comprimento}
                                          onChange={(e) => setEditFields({ ...editFields, comprimento: parseFloat(e.target.value) || 0 })}
                                          className="h-8 w-16 text-xs bg-slate-950/40 border-white/10"
                                        />
                                      </div>
                                    ) : (
                                      `${Math.round(item.largura)} x ${Math.round(item.comprimento)} mm`
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-xs text-slate-300">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={editFields.quantidade}
                                        onChange={(e) => setEditFields({ ...editFields, quantidade: parseInt(e.target.value) || 0 })}
                                        className="h-8 w-16 text-xs bg-slate-950/40 border-white/10 mx-auto text-center"
                                      />
                                    ) : (
                                      item.quantidade
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {isEditing
                                      ? ((editFields.largura * editFields.comprimento) / 1e6).toFixed(6)
                                      : (item.area?.toFixed(6) || ((item.largura * item.comprimento) / 1e6).toFixed(6))}
                                  </TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <div className="flex gap-1.5">
                                        <Button
                                          size="sm"
                                          variant="primary"
                                          onClick={() => handleSaveEditItem(groupKey, item.id)}
                                          className="text-[10px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer border-none"
                                        >
                                          <Check className="h-3 w-3 inline mr-0.5" /> Salvar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => setEditingItemId(null)}
                                          className="text-[10px] px-2.5 py-1 cursor-pointer"
                                        >
                                          <X className="h-3 w-3 inline mr-0.5" /> Cancelar
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleStartEditItem(item)}
                                        className="text-[10px] px-2.5 py-1 cursor-pointer"
                                      >
                                        <Edit className="h-3 w-3 inline mr-0.5" /> Editar
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </Table>

                          {/* Otimização Settings */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                            <div>
                              <Input
                                label="Largura da Chapa (mm)"
                                type="number"
                                value={config.chapa_l}
                                onChange={(e) =>
                                  handleConfigChange(groupKey, "chapa_l", parseFloat(e.target.value))
                                }
                                className="h-9 text-xs"
                              />
                            </div>
                            <div>
                              <Input
                                label="Comprimento Chapa (mm)"
                                type="number"
                                value={config.chapa_c}
                                onChange={(e) =>
                                  handleConfigChange(groupKey, "chapa_c", parseFloat(e.target.value))
                                }
                                className="h-9 text-xs"
                              />
                            </div>
                            <div>
                              <Input
                                label="Espaçamento / Gap (mm)"
                                type="number"
                                value={config.gap}
                                onChange={(e) =>
                                  handleConfigChange(groupKey, "gap", parseFloat(e.target.value))
                                }
                                className="h-9 text-xs"
                              />
                            </div>
                            <div>
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setModalGroupKey(groupKey);
                                  setModalTipoChapa("automatico");
                                  setModalChapaClienteL(config.chapa_l);
                                  setModalChapaClienteC(config.chapa_c);
                                  setModalOpen(true);
                                }}
                                loading={loading}
                                className="w-full flex items-center gap-1.5 h-9 text-xs cursor-pointer"
                              >
                                <Play className="h-3 w-3 fill-current" /> Calcular Nesting
                              </Button>
                            </div>
                          </div>

                          {/* Nesting output */}
                          {loading ? (
                            <div className="h-48 flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                              <span className="text-xs text-slate-500 font-semibold">Otimizando corte...</span>
                            </div>
                          ) : result ? (
                            <div className="flex flex-col gap-6 border-t border-white/5 pt-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-white/[0.01] border border-white/5 p-3 rounded-lg animate-in fade-in duration-200">
                                <div>
                                  <span className="text-slate-500 block font-semibold mb-0.5">Chapas Ocupadas</span>
                                  <span className="font-bold text-slate-300">{result.total_chapas} chapa(s)</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block font-semibold mb-0.5">Aproveitamento Médio</span>
                                  <span className="font-bold text-emerald-400">{result.aproveitamento_medio}%</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block font-semibold mb-0.5">Peças Posicionadas</span>
                                  <span className="font-bold text-slate-300">
                                    {result.chapas.reduce((acc: number, c: any) => acc + c.pecas.length, 0)} peça(s)
                                  </span>
                                </div>
                              </div>

                              {/* Ações do Nesting Calculado */}
                              <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3 rounded-lg text-xs">
                                <div className="text-slate-400 font-semibold">
                                  Origem configurada: <span className="text-blue-400 font-bold uppercase">{result.tipo_chapa === 'automatico' ? 'Automático (Remanescentes + Chapas)' : result.tipo_chapa === 'cliente' ? 'Chapas do Cliente' : result.tipo_chapa === 'inteira' ? 'Estoque (Chapas Inteiras)' : 'Estoque (Retalhos)'}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={() => handlePrintReport(groupKey)}
                                    className="flex items-center gap-1.5 h-8 text-xs cursor-pointer select-none"
                                  >
                                    <Printer className="h-3.5 w-3.5" /> Relatório PDF
                                  </Button>
                                  
                                  {result.tipo_chapa !== 'cliente' && (
                                    <Button
                                      variant="primary"
                                      onClick={() => handleAprovarNesting(groupKey)}
                                      loading={baixaLoading[groupKey]}
                                      className="flex items-center gap-1.5 h-8 text-xs cursor-pointer select-none bg-emerald-600 hover:bg-emerald-700 border-none shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar e Dar Baixa
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-5">
                                {result.chapas.map((chapa: any, cIdx: number) => {
                                  // As dimensões reais desta chapa em particular (pode vir de retalhos com tamanhos diferentes!)
                                  const chRealC = chapa.c;
                                  const chRealL = chapa.l;
                                  
                                  return (
                                    <div
                                      key={cIdx}
                                      className="flex flex-col gap-3 bg-black/20 border border-white/5 p-4 rounded-xl"
                                    >
                                      <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-400">
                                          Layout da Chapa #{cIdx + 1} ({chRealC}x{chRealL}mm - {chapa.tipo_registro === 'retalho' ? 'Retalho' : 'Chapa Inteira'})
                                          {chapa.fora_de_estoque && <span className="text-red-500 font-bold ml-1.5">(⚠️ FORA DE ESTOQUE)</span>}
                                        </span>
                                        <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                          Eficiência: {chapa.aproveitamento}%
                                        </span>
                                      </div>

                                      {/* CAD layout representation */}
                                      <div className="relative w-full border border-slate-800 bg-[#07070a] rounded-lg overflow-hidden flex flex-col items-center justify-center p-3">
                                        <div
                                          style={{
                                            width: "100%",
                                            maxWidth: "600px",
                                            aspectRatio: `${chRealC} / ${chRealL}`,
                                            position: "relative",
                                            border: "1px dashed #334155",
                                            backgroundColor: "#020204",
                                          }}
                                        >
                                          {chapa.pecas.map((peca: any, pIdx: number) => {
                                            const isRotated = peca.rotacionado;
                                            return (
                                              <div
                                                key={pIdx}
                                                style={{
                                                  position: "absolute",
                                                  left: `${(peca.y / chRealC) * 100}%`,
                                                  top: `${(peca.x / chRealL) * 100}%`,
                                                  width: `${(peca.h / chRealC) * 100}%`,
                                                  height: `${(peca.w / chRealL) * 100}%`,
                                                  border: isRotated
                                                    ? "1px solid rgba(245, 158, 11, 0.5)"
                                                    : "1px solid rgba(59, 130, 246, 0.5)",
                                                  backgroundColor: isRotated
                                                    ? "rgba(245, 158, 11, 0.05)"
                                                    : "rgba(59, 130, 246, 0.05)",
                                                  borderRadius: "2px",
                                                  boxSizing: "border-box",
                                                  overflow: "hidden",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                }}
                                                title={`${peca.id}: ${Math.round(peca.w)}x${Math.round(peca.h)}mm ${
                                                  isRotated ? "(Rotacionado 90°)" : ""
                                                }`}
                                              >
                                                {peca.vetor_svg ? (
                                                  <div
                                                    style={{
                                                      position: "relative",
                                                      width: "100%",
                                                      height: "100%",
                                                      display: "flex",
                                                      alignItems: "center",
                                                      justifyContent: "center",
                                                    }}
                                                  >
                                                    <div
                                                      style={
                                                        isRotated
                                                          ? {
                                                              width: `${(peca.w / chRealL) * 100}%`,
                                                              height: `${(peca.h / chRealC) * 100}%`,
                                                              transform: "rotate(90deg)",
                                                              transformOrigin: "center",
                                                              color: "rgba(245, 158, 11, 0.7)",
                                                              display: "flex",
                                                              alignItems: "center",
                                                              justifyContent: "center",
                                                            }
                                                          : {
                                                              width: "100%",
                                                              height: "100%",
                                                              color: "rgba(59, 130, 246, 0.7)",
                                                              display: "flex",
                                                              alignItems: "center",
                                                              justifyContent: "center",
                                                            }
                                                      }
                                                      dangerouslySetInnerHTML={{ __html: peca.vetor_svg }}
                                                    />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                                                      <span className="text-[6px] md:text-[7.5px] font-bold text-slate-300 truncate max-w-[90%] bg-slate-950/80 px-1 border border-white/5 rounded">
                                                        {peca.id.split("|")[1]?.trim() || peca.id}
                                                      </span>
                                                      <span className="text-[5px] md:text-[6.5px] text-slate-400 font-bold mt-0.5 bg-slate-950/80 px-1 border border-white/5 rounded">
                                                        {Math.round(peca.w)}x{Math.round(peca.h)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="flex flex-col items-center justify-center text-center select-none w-full h-full">
                                                    <span className="text-[7px] md:text-[8px] font-bold text-slate-300 truncate max-w-full leading-none">
                                                      {peca.id.split("|")[1]?.trim() || peca.id}
                                                    </span>
                                                    <span className="text-[6px] md:text-[7px] text-slate-500 font-bold mt-0.5">
                                                      {Math.round(peca.w)}x{Math.round(peca.h)}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Informações de Retalho Sobrando */}
                                      {chapa.retalho_gerado && (
                                        <div className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold">
                                          🌱 Sobra de Material Estimada: Gerará um retalho de {chapa.retalho_gerado.comprimento}x{chapa.retalho_gerado.largura}mm que será inserido no estoque após aprovação.
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Modal de Origem do Material */}
        {modalOpen && modalGroupKey && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl max-w-lg w-full p-6 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Configurar Origem do Material
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione a fonte do material para o grupo: <span className="text-blue-400 font-bold">{modalGroupKey}</span>
                </p>
              </div>

              {/* Informações de Estoque no Modal */}
              {(() => {
                const groupItems = groupedItems[modalGroupKey] || [];
                const first = groupItems[0];
                if (!first) return null;
                const mat = first.material;
                const esp = first.espessura;
                const matchEstoque = estoque.filter(e => e.material === mat && e.espessura === esp);
                const chapasInteiras = matchEstoque.filter(e => e.tipo_registro === "inteira").reduce((acc, e) => acc + e.quantidade, 0);
                const retalhos = matchEstoque.filter(e => e.tipo_registro === "retalho").reduce((acc, e) => acc + e.quantidade, 0);

                return (
                  <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3 text-xs flex flex-col gap-1">
                    <span className="text-slate-400 font-semibold">Disponível no Estoque para {mat} - {esp}mm:</span>
                    <div className="flex gap-4 font-bold mt-1">
                      <span className="text-slate-200">🗂️ Chapas Inteiras: <span className="text-blue-400">{chapasInteiras} un</span></span>
                      <span className="text-slate-200">✂️ Retalhos: <span className="text-emerald-400">{retalhos} un</span></span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400">Opções de Chapas:</span>
                <div className="grid grid-cols-1 gap-2.5">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${modalTipoChapa === "automatico" ? "bg-blue-600/5 border-blue-500" : "bg-black/20 border-white/5 hover:bg-white/5"}`}>
                    <input
                      type="radio"
                      name="tipoChapa"
                      value="automatico"
                      checked={modalTipoChapa === "automatico"}
                      onChange={() => setModalTipoChapa("automatico")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 border-white/10 bg-slate-950"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">Automático (Otimizado)</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Usa retalhos disponíveis primeiro para reduzir desperdício, e chapas inteiras se necessário.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${modalTipoChapa === "inteira" ? "bg-blue-600/5 border-blue-500" : "bg-black/20 border-white/5 hover:bg-white/5"}`}>
                    <input
                      type="radio"
                      name="tipoChapa"
                      value="inteira"
                      checked={modalTipoChapa === "inteira"}
                      onChange={() => setModalTipoChapa("inteira")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 border-white/10 bg-slate-950"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">Estoque - Chapas Inteiras</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Utiliza apenas chapas inteiras cadastradas no estoque.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${modalTipoChapa === "retalho" ? "bg-blue-600/5 border-blue-500" : "bg-black/20 border-white/5 hover:bg-white/5"}`}>
                    <input
                      type="radio"
                      name="tipoChapa"
                      value="retalho"
                      checked={modalTipoChapa === "retalho"}
                      onChange={() => setModalTipoChapa("retalho")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 border-white/10 bg-slate-950"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">Estoque - Retalhos</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Utiliza apenas retalhos e sobras disponíveis no estoque.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${modalTipoChapa === "cliente" ? "bg-blue-600/5 border-blue-500" : "bg-black/20 border-white/5 hover:bg-white/5"}`}>
                    <input
                      type="radio"
                      name="tipoChapa"
                      value="cliente"
                      checked={modalTipoChapa === "cliente"}
                      onChange={() => setModalTipoChapa("cliente")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 border-white/10 bg-slate-950"
                    />
                    <div className="flex flex-col w-full">
                      <span className="text-xs font-bold text-slate-200">Material do Cliente</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Usa chapas fornecidas pelo cliente (não afeta o estoque).</span>

                      {modalTipoChapa === "cliente" && (
                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5">
                          <Input
                            label="Largura Chapa (mm)"
                            type="number"
                            value={modalChapaClienteL}
                            onChange={(e) => setModalChapaClienteL(parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs bg-slate-950/40"
                          />
                          <Input
                            label="Comprimento Chapa (mm)"
                            type="number"
                            value={modalChapaClienteC}
                            onChange={(e) => setModalChapaClienteC(parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs bg-slate-950/40"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setModalOpen(false);
                    setModalGroupKey(null);
                  }}
                  className="h-9 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (modalGroupKey) {
                      runNesting(modalGroupKey, modalTipoChapa, modalChapaClienteL, modalChapaClienteC);
                    }
                    setModalOpen(false);
                    setModalGroupKey(null);
                  }}
                  className="h-9 text-xs cursor-pointer bg-blue-600 hover:bg-blue-700 border-none shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                >
                  Confirmar e Calcular
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição em Massa */}
        {bulkModalOpen && bulkModalGroupKey && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl max-w-md w-full p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <Edit className="h-4.5 w-4.5 text-blue-500" /> Edição em Massa de Peças
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Modificando as peças selecionadas no grupo: <span className="text-blue-400 font-bold">{bulkModalGroupKey}</span>
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Alterar Material"
                    value={bulkNewMaterial}
                    onChange={(e) => setBulkNewMaterial(e.target.value)}
                    options={[
                      { value: "", label: "Manter original" },
                      { value: "AÇO CARBONO", label: "Aço Carbono" },
                      { value: "INOX", label: "Inox" },
                      { value: "ALUMÍNIO", label: "Alumínio" },
                    ]}
                    className="h-9 text-xs"
                  />
                  <Input
                    label="Alterar Espessura (mm)"
                    type="number"
                    placeholder="Manter original"
                    value={bulkNewEspessura}
                    onChange={(e) => setBulkNewEspessura(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                  <Input
                    label="Nova Quantidade Fixa"
                    type="number"
                    placeholder="Manter original"
                    value={bulkNewQuantidade}
                    disabled={!!bulkQuantityMultiplier}
                    onChange={(e) => setBulkNewQuantidade(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Input
                    label="Multiplicar Qtd por"
                    type="number"
                    placeholder="Manter original"
                    value={bulkQuantityMultiplier}
                    disabled={!!bulkNewQuantidade}
                    onChange={(e) => setBulkQuantityMultiplier(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * Campos em branco não serão modificados. A alteração de material/espessura reagrupará as peças automaticamente.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkModalGroupKey(null);
                  }}
                  className="h-9 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApplyBulkEdit(bulkModalGroupKey)}
                  className="h-9 text-xs cursor-pointer bg-blue-600 hover:bg-blue-700 border-none shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                >
                  Aplicar Alterações
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
