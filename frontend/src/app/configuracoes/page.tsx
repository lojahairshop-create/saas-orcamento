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
  ConfigGlobais,
  ImpostoEstado,
  Material,
  ParametroLaser,
  CustoOperacao,
} from "@/types";
import {
  FileText,
  DollarSign,
  Zap,
  Clock,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Edit,
  Copy,
  Building,
  Image,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<"impostos" | "materiais" | "laser" | "custos" | "empresa">("impostos");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Tab 1: Impostos
  const [configsGlobais, setConfigsGlobais] = useState<ConfigGlobais>({
    icms_padrao: 0.18,
    ipi_padrao: 0.05,
    pis_padrao: 0.0065,
    cofins_padrao: 0.03,
    csll_padrao: 0.0108,
    irpj_padrao: 0.012,
    comissao_padrao: 0.03,
    base_calculo_padrao: 1.0,
  });
  const [impostosEstados, setImpostosEstados] = useState<ImpostoEstado[]>([]);

  // Tab 2: Materiais
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({
    nome: "AÇO CARBONO",
    tipo: "",
    preco_kg: 0,
    densidade: 7.86,
  });

  // Tab 3: Parâmetros Laser
  const [parametrosLaser, setParametrosLaser] = useState<ParametroLaser[]>([]);
  const [laserForm, setLaserForm] = useState({
    material: "AÇO CARBONO",
    espessura: 1.0,
    avanco: 3000,
    peck: 1.0,
  });

  // Tab 4: Custos Operação
  const [custosOperacao, setCustosOperacao] = useState<CustoOperacao[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "impostos" || activeTab === "empresa") {
        const globais = await api.getConfigGlobais();
        if (globais) setConfigsGlobais(globais);
        if (activeTab === "impostos") {
          const estados = await api.getImpostosEstados();
          setImpostosEstados(estados || []);
        }
      } else if (activeTab === "materiais") {
        const list = await api.getMateriais();
        setMateriais(list || []);
      } else if (activeTab === "laser") {
        const list = await api.getParametrosLaser();
        setParametrosLaser(list || []);
      } else if (activeTab === "custos") {
        const list = await api.getCustosOperacao();
        setCustosOperacao(list || []);
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Salvar impostos globais
  const handleSaveImpostos = async () => {
    setSaveLoading(true);
    try {
      await api.saveConfigGlobais(configsGlobais);
      alert("Configurações fiscais salvas com sucesso!");
    } catch (err) {
      alert("Erro ao salvar configurações fiscais.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveEmpresa = async () => {
    setSaveLoading(true);
    try {
      await api.saveConfigGlobais(configsGlobais);
      alert("Informações da empresa salvas com sucesso!");
    } catch (err) {
      alert("Erro ao salvar informações da empresa.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Salvar impostos de estado inline
  const handleUpdateEstado = async (uf: string, field: string, value: number) => {
    const estado = impostosEstados.find((est) => est.uf === uf);
    if (!estado) return;

    const payload = {
      uf: estado.uf,
      nome: estado.nome,
      icms_equipamento: estado.icms_equipamento,
      base_calc_equipamento: estado.base_calc_equipamento,
      icms_pecas: estado.icms_pecas,
      base_calc_pecas: estado.base_calc_pecas,
      ipi_padrao: estado.ipi_padrao,
      csll: estado.csll,
      [field]: value,
    };

    try {
      await api.updateImpostoEstado(uf, payload);
    } catch (err) {
      console.error(err);
    }
  };

  // Materiais CRUD
  const handleCreateMaterial = async () => {
    if (!materialForm.tipo) {
      alert("Informe o tipo/especificação do material.");
      return;
    }
    try {
      await api.createMaterial(materialForm);
      setMaterialForm({ nome: "AÇO CARBONO", tipo: "", preco_kg: 0, densidade: 7.86 });
      loadData();
    } catch (err) {
      alert("Erro ao criar material");
    }
  };

  const handleUpdateMaterial = async () => {
    if (!editingMaterialId) return;
    if (!materialForm.tipo) {
      alert("Informe o tipo/especificação do material.");
      return;
    }
    try {
      await api.updateMaterial(editingMaterialId, materialForm);
      setMaterialForm({ nome: "AÇO CARBONO", tipo: "", preco_kg: 0, densidade: 7.86 });
      setEditingMaterialId(null);
      loadData();
    } catch (err) {
      alert("Erro ao atualizar material");
    }
  };

  const handleEditMaterial = (mat: Material) => {
    setMaterialForm({
      nome: mat.nome,
      tipo: mat.tipo,
      preco_kg: mat.preco_kg,
      densidade: mat.densidade,
    });
    setEditingMaterialId(mat.id);
  };

  const handleDuplicateMaterial = (mat: Material) => {
    setMaterialForm({
      nome: mat.nome,
      tipo: `${mat.tipo} (Cópia)`,
      preco_kg: mat.preco_kg,
      densidade: mat.densidade,
    });
    setEditingMaterialId(null);
  };

  const handleCancelEdit = () => {
    setMaterialForm({ nome: "AÇO CARBONO", tipo: "", preco_kg: 0, densidade: 7.86 });
    setEditingMaterialId(null);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm("Excluir este material?")) return;
    try {
      await api.deleteMaterial(id);
      if (editingMaterialId === id) {
        handleCancelEdit();
      }
      loadData();
    } catch (err) {
      alert("Erro ao deletar material");
    }
  };

  // Parâmetros Laser CRUD
  const handleCreateLaser = async () => {
    try {
      await api.createParametroLaser(laserForm);
      loadData();
    } catch (err) {
      alert("Erro ao criar parâmetro laser");
    }
  };

  const handleDeleteLaser = async (id: string) => {
    if (!window.confirm("Excluir este parâmetro?")) return;
    try {
      await api.deleteParametroLaser(id);
      loadData();
    } catch (err) {
      alert("Erro ao deletar parâmetro");
    }
  };

  // Custo Operação CRUD
  const handleUpdateCustoHora = async (id: string, operacao: string, custo_hora: number) => {
    try {
      await api.updateCustoOperacao(id, { operacao, custo_hora });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">Painel Administrativo</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure taxas de impostos, tabelas de preço de matérias-primas e custos operacionais
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 gap-1 bg-white rounded-xl p-1 max-w-2xl">
          <button
            onClick={() => setActiveTab("impostos")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "impostos"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-700 hover:bg-gray-50"
            }`}
          >
            <FileText className="h-4.5 w-4.5" /> Impostos / UFs
          </button>
          <button
            onClick={() => setActiveTab("empresa")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "empresa"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-700 hover:bg-gray-50"
            }`}
          >
            <Building className="h-4.5 w-4.5" /> Dados da Empresa
          </button>
          <button
            onClick={() => setActiveTab("materiais")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "materiais"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-700 hover:bg-gray-50"
            }`}
          >
            <DollarSign className="h-4.5 w-4.5" /> Materiais
          </button>
          <button
            onClick={() => setActiveTab("laser")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "laser"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-700 hover:bg-gray-50"
            }`}
          >
            <Zap className="h-4.5 w-4.5" /> Laser / Peck
          </button>
          <button
            onClick={() => setActiveTab("custos")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === "custos"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-700 hover:bg-gray-50"
            }`}
          >
            <Clock className="h-4.5 w-4.5" /> Custos / Hora
          </button>
        </div>

        {/* Tab 1: Impostos */}
        {activeTab === "impostos" && !loading && (
          <div className="flex flex-col gap-6">
            <Card
              header="Impostos Globais Federais/Administrativos"
              footer={
                <div className="flex justify-end">
                  <Button onClick={handleSaveImpostos} loading={saveLoading} className="flex items-center gap-1.5">
                    <Save className="h-4.5 w-4.5" /> Salvar Configurações
                  </Button>
                </div>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  label="PIS (%)"
                  type="number"
                  step="0.0001"
                  value={configsGlobais.pis_padrao * 100}
                  onChange={(e) =>
                    setConfigsGlobais({
                      ...configsGlobais,
                      pis_padrao: parseFloat(e.target.value) / 100,
                    })
                  }
                />
                <Input
                  label="COFINS (%)"
                  type="number"
                  step="0.01"
                  value={configsGlobais.cofins_padrao * 100}
                  onChange={(e) =>
                    setConfigsGlobais({
                      ...configsGlobais,
                      cofins_padrao: parseFloat(e.target.value) / 100,
                    })
                  }
                />
                <Input
                  label="CSLL (%)"
                  type="number"
                  step="0.01"
                  value={configsGlobais.csll_padrao * 100}
                  onChange={(e) =>
                    setConfigsGlobais({
                      ...configsGlobais,
                      csll_padrao: parseFloat(e.target.value) / 100,
                    })
                  }
                />
                <Input
                  label="IRPJ (%)"
                  type="number"
                  step="0.01"
                  value={configsGlobais.irpj_padrao * 100}
                  onChange={(e) =>
                    setConfigsGlobais({
                      ...configsGlobais,
                      irpj_padrao: parseFloat(e.target.value) / 100,
                    })
                  }
                />
              </div>
            </Card>

            <Card header="Alíquotas e Base de Cálculo ICMS por Estado">
              <Table headers={["UF", "Estado", "ICMS Equipamento (%)", "BC Equipamento (%)", "ICMS Peças (%)", "BC Peças (%)"]}>
                {impostosEstados.map((est) => (
                  <TableRow key={est.uf}>
                    <TableCell className="font-bold text-slate-800">{est.uf}</TableCell>
                    <TableCell>{est.nome}</TableCell>
                    <TableCell>
                      <input
                        type="number"
                        step="0.1"
                        className="bg-transparent border-b border-gray-200 focus:border-blue-500 w-16 text-center focus:outline-none"
                        defaultValue={est.icms_equipamento * 100}
                        onBlur={(e) =>
                          handleUpdateEstado(est.uf, "icms_equipamento", parseFloat(e.target.value) / 100)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        step="0.1"
                        className="bg-transparent border-b border-gray-200 focus:border-blue-500 w-16 text-center focus:outline-none"
                        defaultValue={est.base_calc_equipamento * 100}
                        onBlur={(e) =>
                          handleUpdateEstado(est.uf, "base_calc_equipamento", parseFloat(e.target.value) / 100)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        step="0.1"
                        className="bg-transparent border-b border-gray-200 focus:border-blue-500 w-16 text-center focus:outline-none"
                        defaultValue={est.icms_pecas * 100}
                        onBlur={(e) =>
                          handleUpdateEstado(est.uf, "icms_pecas", parseFloat(e.target.value) / 100)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        step="0.1"
                        className="bg-transparent border-b border-gray-200 focus:border-blue-500 w-16 text-center focus:outline-none"
                        defaultValue={est.base_calc_pecas * 100}
                        onBlur={(e) =>
                          handleUpdateEstado(est.uf, "base_calc_pecas", parseFloat(e.target.value) / 100)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </Card>
          </div>
        )}

        {/* Tab 2: Materiais */}
        {activeTab === "materiais" && !loading && (
          <div className="flex flex-col gap-6">
            {/* Adicionar / Editar Material Form */}
            <Card header={editingMaterialId ? "Editar Material" : "Cadastrar Novo Material"}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <Select
                  label="Nome do Material"
                  value={materialForm.nome}
                  onChange={(e) => {
                    const nome = e.target.value;
                    let densidade = 7.86;
                    if (nome === "ALUMÍNIO") {
                      densidade = 2.71;
                    }
                    setMaterialForm({ ...materialForm, nome, densidade });
                  }}
                  options={[
                    { value: "AÇO CARBONO", label: "AÇO CARBONO" },
                    { value: "INOX", label: "INOX" },
                    { value: "ALUMÍNIO", label: "ALUMÍNIO" },
                    { value: "OUTROS", label: "OUTROS" },
                  ]}
                />
                <Input
                  label="Especificação/Tipo"
                  placeholder="Ex: A 304, S 1020"
                  value={materialForm.tipo}
                  onChange={(e) => setMaterialForm({ ...materialForm, tipo: e.target.value })}
                />
                <Input
                  label="Preço por KG (R$)"
                  type="number"
                  step="0.01"
                  value={materialForm.preco_kg}
                  onChange={(e) => setMaterialForm({ ...materialForm, preco_kg: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Densidade (kg/m²·mm)"
                  type="number"
                  step="0.001"
                  value={materialForm.densidade}
                  onChange={(e) => setMaterialForm({ ...materialForm, densidade: parseFloat(e.target.value) || 0 })}
                />
                <div className="flex gap-2">
                  {editingMaterialId ? (
                    <>
                      <Button onClick={handleUpdateMaterial} className="flex-1 flex items-center justify-center gap-1 h-10">
                        <Save className="h-4 w-4" /> Salvar
                      </Button>
                      <Button onClick={handleCancelEdit} variant="secondary" className="flex-1 h-10">
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleCreateMaterial} className="w-full flex items-center justify-center gap-1 h-10">
                      <Plus className="h-4 w-4" /> Cadastrar
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* List of Materials */}
            <Card header="Tabela de Preços e Materiais">
              <Table headers={["Material", "Tipo / Especificação", "Preço por KG (R$)", "Densidade (kg/m²·mm)", "Ações"]}>
                {materiais.map((mat) => (
                  <TableRow key={mat.id} className={editingMaterialId === mat.id ? "bg-blue-950/10 border-l-2 border-blue-500" : ""}>
                    <TableCell className="font-bold text-slate-800">{mat.nome}</TableCell>
                    <TableCell>{mat.tipo}</TableCell>
                    <TableCell>R$ {mat.preco_kg.toFixed(2)}</TableCell>
                    <TableCell>{mat.densidade.toFixed(3)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditMaterial(mat)}
                          className="p-1.5 text-teal-600 hover:bg-blue-950/20"
                          title="Editar Material"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicateMaterial(mat)}
                          className="p-1.5 text-amber-400 hover:bg-amber-950/20"
                          title="Duplicar Material"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMaterial(mat.id)}
                          className="p-1.5 text-red-400 hover:bg-red-950/20"
                          title="Excluir Material"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </Card>
          </div>
        )}

        {/* Tab 3: Parâmetros Laser */}
        {activeTab === "laser" && !loading && (
          <div className="flex flex-col gap-6">
            <Card header="Cadastrar Parâmetros por Espessura">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <Select
                  label="Material"
                  value={laserForm.material}
                  onChange={(e) => setLaserForm({ ...laserForm, material: e.target.value })}
                  options={[
                    { value: "AÇO CARBONO", label: "AÇO CARBONO" },
                    { value: "INOX", label: "INOX" },
                    { value: "ALUMÍNIO", label: "ALUMÍNIO" },
                  ]}
                />
                <Input
                  label="Espessura (mm)"
                  type="number"
                  step="0.01"
                  value={laserForm.espessura}
                  onChange={(e) => setLaserForm({ ...laserForm, espessura: parseFloat(e.target.value) || 0.0 })}
                />
                <Input
                  label="Avanço (mm/min)"
                  type="number"
                  value={laserForm.avanco}
                  onChange={(e) => setLaserForm({ ...laserForm, avanco: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="Peck (segundos)"
                  type="number"
                  step="0.1"
                  value={laserForm.peck}
                  onChange={(e) => setLaserForm({ ...laserForm, peck: parseFloat(e.target.value) || 0.0 })}
                />
                <Button onClick={handleCreateLaser} className="flex items-center justify-center gap-1 h-10">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </Card>

            <Card header="Tabela de Avanços do Corte Laser">
              <Table headers={["Material", "Espessura (mm)", "Velocidade Avanço (mm/min)", "Tempo Peck (s)", "Ações"]}>
                {parametrosLaser.map((param) => (
                  <TableRow key={param.id}>
                    <TableCell className="font-bold text-slate-800">{param.material}</TableCell>
                    <TableCell>{param.espessura.toFixed(2)} mm</TableCell>
                    <TableCell>{param.avanco} mm/min</TableCell>
                    <TableCell>{param.peck} s</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLaser(param.id)}
                        className="p-1.5 text-red-400 hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </Card>
          </div>
        )}

        {/* Tab 4: Custos/Hora */}
        {activeTab === "custos" && !loading && (
          <Card header="Custo / Hora Cobrado por Operação de Fabricação">
            <Table headers={["Operação de Fabricação", "Custo por Hora (R$)"]}>
              {custosOperacao.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-semibold text-slate-800">{op.operacao}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="bg-transparent border-b border-gray-200 focus:border-blue-500 w-24 px-1 focus:outline-none font-semibold text-slate-700"
                        defaultValue={op.custo_hora}
                        onBlur={(e) =>
                          handleUpdateCustoHora(op.id, op.operacao, parseFloat(e.target.value) || 10.0)
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>
        )}

        {/* Tab 5: Empresa */}
        {activeTab === "empresa" && !loading && (
          <div className="flex flex-col gap-6">
            <Card
              header="Dados Corporativos & Logo da Empresa"
              footer={
                <div className="flex justify-end">
                  <Button onClick={handleSaveEmpresa} loading={saveLoading} className="flex items-center gap-1.5">
                    <Save className="h-4.5 w-4.5" /> Salvar Informações
                  </Button>
                </div>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Inputs de dados */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome da Empresa (Razão Social / Nome Fantasia)"
                      placeholder="Ex: Metal Cut Indústria Metalúrgica"
                      value={configsGlobais.empresa_nome || ""}
                      onChange={(e) =>
                        setConfigsGlobais({
                          ...configsGlobais,
                          empresa_nome: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="CNPJ"
                      placeholder="Ex: 00.000.000/0000-00"
                      value={configsGlobais.empresa_cnpj || ""}
                      onChange={(e) =>
                        setConfigsGlobais({
                          ...configsGlobais,
                          empresa_cnpj: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Input
                    label="Endereço da Empresa (Faturamento/Produção)"
                    placeholder="Ex: Av. Principal, 1000 - Distrito Industrial - Sorocaba/SP"
                    value={configsGlobais.empresa_endereco || ""}
                    onChange={(e) =>
                      setConfigsGlobais({
                        ...configsGlobais,
                        empresa_endereco: e.target.value,
                      })
                    }
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="E-mail Comercial"
                      placeholder="Ex: comercial@suaempresa.com.br"
                      value={configsGlobais.empresa_email || ""}
                      onChange={(e) =>
                        setConfigsGlobais({
                          ...configsGlobais,
                          empresa_email: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Telefone / WhatsApp"
                      placeholder="Ex: (15) 3222-2222"
                      value={configsGlobais.empresa_telefone || ""}
                      onChange={(e) =>
                        setConfigsGlobais({
                          ...configsGlobais,
                          empresa_telefone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Bloco de Upload da Logo */}
                <div className="flex flex-col items-center justify-center border border-gray-200 bg-white rounded-xl p-6 gap-4">
                  <span className="text-xs font-bold text-slate-600 self-start">LOGO DA EMPRESA (PDF / HTML)</span>
                  
                  {configsGlobais.logo_base64 ? (
                    <div className="relative w-full h-44 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center p-4">
                      <img
                        src={configsGlobais.logo_base64}
                        alt="Logo da Empresa"
                        className="max-h-full max-w-full object-contain"
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        className="absolute bottom-2 right-2 p-1.5 h-auto text-xs"
                        onClick={() =>
                          setConfigsGlobais({
                            ...configsGlobais,
                            logo_base64: "",
                          })
                        }
                      >
                        Remover Logo
                      </Button>
                    </div>
                  ) : (
                    <label className="w-full h-44 border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-xl bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
                      <Image className="h-10 w-10 text-slate-500" />
                      <span className="text-xs font-bold text-slate-600">Selecionar Imagem</span>
                      <span className="text-[10px] text-slate-600">Recomendado: PNG ou JPG até 1MB</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              alert("A imagem da logo deve ter no máximo 1MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setConfigsGlobais({
                                ...configsGlobais,
                                logo_base64: reader.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Loader generic fallback */}
        {loading && (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
