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
  }, [statusFilter]);

  // Buscar itens para nesting quando a seleção de orçamentos muda
  useEffect(() => {
    async function loadItens() {
      if (selectedOrcamentos.length === 0) {
        setItems([]);
        setGroupedItems({});
        setSelectedGroups([]);
        return;
      }
      setLoadingItems(true);
      try {
        const data = await api.getItensParaNesting(undefined, selectedOrcamentos.join(","));
        setItems(data || []);
        
        // Agrupar itens por material e espessura no frontend
        const groups: { [key: string]: any[] } = {};
        const initialConfigs: typeof configs = {};
        const initialExpanded: { [key: string]: boolean } = {};

        data.forEach((item: any) => {
          const key = `${item.material} - ${item.espessura}mm`;
          if (!groups[key]) {
            groups[key] = [];
            initialConfigs[key] = {
              chapa_l: item.chapa_l || 1200,
              chapa_c: item.chapa_c || 2400,
              gap: 5.0,
            };
            initialExpanded[key] = true;
          }
          groups[key].push(item);
        });

        setGroupedItems(groups);
        setSelectedGroups(Object.keys(groups));
        setConfigs((prev) => ({ ...initialConfigs, ...prev }));
        setExpandedGroups((prev) => ({ ...initialExpanded, ...prev }));
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

  const runNesting = async (groupKey: string) => {
    const groupItems = groupedItems[groupKey];
    const config = configs[groupKey];
    if (!groupItems || groupItems.length === 0 || !config) return;

    // Filtrar apenas peças com dimensões maiores que 0 para evitar erro no validador do backend
    const validItems = groupItems.filter((it) => it.largura > 0 && it.comprimento > 0);
    if (validItems.length === 0) {
      alert("Nenhuma peça com dimensões válidas (> 0) neste grupo.");
      return;
    }

    setNestingLoading((prev) => ({ ...prev, [groupKey]: true }));
    try {
      const payload = {
        itens: validItems.map((it) => ({
          id: `${it.orcamento_numero} | ${it.descricao}`,
          largura: it.largura,
          comprimento: it.comprimento,
          quantidade: it.quantidade,
        })),
        chapa_l: config.chapa_l,
        chapa_c: config.chapa_c,
        gap: config.gap,
      };

      const result = await api.calcularNesting(payload);
      setNestingResults((prev) => ({ ...prev, [groupKey]: result }));
    } catch (err) {
      console.error("Erro ao calcular nesting:", err);
      alert("Erro ao calcular arranjo de nesting.");
    } finally {
      setNestingLoading((prev) => ({ ...prev, [groupKey]: false }));
    }
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
                        <div className="flex flex-col gap-6 mt-2">
                          {/* List of items in this group */}
                          <Table headers={["Orçamento", "Peça", "Dimensões (mm)", "Quantidade", "Área Unit (m²)"]}>
                            {groupItems.map((item, itIdx) => (
                              <TableRow key={itIdx}>
                                <TableCell className="font-semibold text-slate-400 text-xs">
                                  {item.orcamento_numero}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs text-slate-200">{item.descricao}</span>
                                    {item.cliente_nome && (
                                      <span className="text-[9px] text-slate-500 font-semibold">{item.cliente_nome}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {Math.round(item.largura)} x {Math.round(item.comprimento)} mm
                                </TableCell>
                                <TableCell className="text-center font-bold text-xs text-slate-300">
                                  {item.quantidade}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {item.area?.toFixed(6) || ((item.largura * item.comprimento) / 1e6).toFixed(6)}
                                </TableCell>
                              </TableRow>
                            ))}
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
                                onClick={() => runNesting(groupKey)}
                                loading={loading}
                                className="w-full flex items-center gap-1.5 h-9 text-xs"
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
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-white/[0.01] border border-white/5 p-3 rounded-lg">
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

                              <div className="flex flex-col gap-5">
                                {result.chapas.map((chapa: any, cIdx: number) => (
                                  <div
                                    key={cIdx}
                                    className="flex flex-col gap-3 bg-black/20 border border-white/5 p-4 rounded-xl"
                                  >
                                    <div className="flex justify-between items-center text-xs font-bold">
                                      <span className="text-slate-400">Layout da Chapa #{cIdx + 1}</span>
                                      <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                        Eficiência: {chapa.aproveitamento}%
                                      </span>
                                    </div>

                                    {/* CAD layout representation */}
                                    <div className="relative w-full border border-slate-800 bg-[#07070a] rounded-lg overflow-hidden flex items-center justify-center p-3">
                                      <div
                                        style={{
                                          width: "100%",
                                          maxWidth: "600px",
                                          aspectRatio: `${config.chapa_c} / ${config.chapa_l}`,
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
                                              left: `${(peca.y / config.chapa_c) * 100}%`,
                                              top: `${(peca.x / config.chapa_l) * 100}%`,
                                              width: `${(peca.h / config.chapa_c) * 100}%`,
                                              height: `${(peca.w / config.chapa_l) * 100}%`,
                                              backgroundColor: peca.rotacionado
                                                ? "rgba(245, 158, 11, 0.12)"
                                                : "rgba(59, 130, 246, 0.12)",
                                              border: peca.rotacionado
                                                ? "1px solid rgba(245, 158, 11, 0.5)"
                                                : "1px solid rgba(59, 130, 246, 0.5)",
                                              borderRadius: "2px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              padding: "1px",
                                              boxSizing: "border-box",
                                              overflow: "hidden",
                                            }}
                                            title={`${peca.id}: ${Math.round(peca.w)}x${Math.round(peca.h)}mm ${
                                              peca.rotacionado ? "(Rotacionado 90°)" : ""
                                            }`}
                                          >
                                            <div className="flex flex-col items-center justify-center text-center select-none w-full h-full">
                                              <span className="text-[7px] md:text-[8px] font-bold text-slate-300 truncate max-w-full leading-none">
                                                {peca.id.split("|")[1]?.trim() || peca.id}
                                              </span>
                                              <span className="text-[6px] md:text-[7px] text-slate-500 font-bold mt-0.5">
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
      </div>
    </AppLayout>
  );
}
