"use client";

import React, { useState, useEffect, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import DxfUploader from "@/components/orcamento/DxfUploader";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { DXFResult, Material } from "@/types";
import {
  calcularArea,
  calcularPesoUnitario,
  calcularPesoChapa,
  calcularPecasPorChapa,
  calcularQtdChapas,
  calcularSobra,
  calcularCustoMP,
  calcularTempoCorteLaser,
  calcularTotalFabricacao,
  calcularCustoBasico,
  calcularValorVendaSemImp,
  calcularPrecoComImpostos,
} from "@/lib/calculo";
import {
  User,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Layers,
  Sparkles,
  CheckCircle,
  X,
  Edit,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

function NovoOrcamentoWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // --- Step 1: Cliente Info ---
  const [cliente, setCliente] = useState({
    nome: "",
    email: "",
    telefone: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    estado: "SP",
  });
  const [tipoVenda, setTipoVenda] = useState("pecas");
  const [ipiRate, setIpiRate] = useState(0.05);
  const [taxaComissao, setTaxaComissao] = useState(0.03);
  const [condicaoPagamento, setCondicaoPagamento] = useState("30 dias");
  const [prazoEntrega, setPrazoEntrega] = useState("15 dias úteis");
  const [validade, setValidade] = useState(30);
  const [observacoes, setObservacoes] = useState("");

  // --- Step 2: Lista de Peças ---
  const [itens, setItens] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkNewMaterial, setBulkNewMaterial] = useState<string>("");
  const [bulkNewEspessura, setBulkNewEspessura] = useState<string>("");
  const [bulkNewQuantidade, setBulkNewQuantidade] = useState<string>("");
  
  // Tempos das operações para edição em massa
  const [bulkTempoSetup, setBulkTempoSetup] = useState<string>("");
  const [bulkTempoDobra, setBulkTempoDobra] = useState<string>("");
  const [bulkTempoCaldeiraria, setBulkTempoCaldeiraria] = useState<string>("");
  const [bulkTempoSolda, setBulkTempoSolda] = useState<string>("");
  const [bulkTempoGuilhotina, setBulkTempoGuilhotina] = useState<string>("");
  const [bulkTempoUsinagem, setBulkTempoUsinagem] = useState<string>("");
  const [bulkTempoMontagem, setBulkTempoMontagem] = useState<string>("");

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [custosOperacao, setCustosOperacao] = useState<{ [key: string]: number }>({});
  const [dxfItemsToConfigure, setDxfItemsToConfigure] = useState<any[] | null>(null);
  const [editingPecaId, setEditingPecaId] = useState<string | null>(null);
  
  // Peça que está sendo editada/adicionada no form manual
  const [novaPeca, setNovaPeca] = useState({
    descricao: "",
    num_desenho: "",
    material: "AÇO CARBONO",
    tipo_material: "S 1020",
    espessura: 3.18,
    largura: 0.0,
    comprimento: 0.0,
    perimetro: 0.0,
    num_entradas: 1,
    quantidade: 1,
    chapa_l: 1200,
    chapa_c: 2400,
    preco_kg: 2.00,
    margem_lucro: 0.30,
    origem_material: "chapa_inteira",
    
    // Tempos das operações (minutos)
    tempo_setup: 6.0,
    tempo_dobra: 6.0,
    tempo_caldeiraria: 6.0,
    tempo_solda: 6.0,
    tempo_guilhotina: 6.0,
    tempo_usinagem: 6.0,
    tempo_montagem: 6.0,
    
    observacoes: "",
  });

  const [sugestaoEstoque, setSugestaoEstoque] = useState<any>(null);

  // Carregar materiais e custos padrão do backend no início
  useEffect(() => {
    async function loadMateriais() {
      try {
        const list = await api.getMateriais();
        if (list && list.length > 0) {
          setMateriais(list);
          const firstMat = list[0];
          setNovaPeca(prev => ({
            ...prev,
            material: firstMat.nome,
            tipo_material: firstMat.tipo,
            preco_kg: firstMat.preco_kg
          }));
        }
      } catch (err) {
        console.error("Erro ao carregar materiais, usando backup local:", err);
      }
    }
    async function loadCustos() {
      try {
        const list = await api.getCustosOperacao();
        const map: { [key: string]: number } = {};
        list.forEach(c => {
          map[c.operacao] = parseFloat(c.custo_hora.toString());
        });
        setCustosOperacao(map);
      } catch (err) {
        console.error("Erro ao carregar custos operacionais:", err);
      }
    }
    loadMateriais();
    loadCustos();
  }, []);

  // Buscar sugestões de chapa/retalho no estoque
  useEffect(() => {
    async function fetchSugestao() {
      if (
        novaPeca.largura > 0 &&
        novaPeca.comprimento > 0 &&
        novaPeca.espessura > 0 &&
        novaPeca.quantidade > 0
      ) {
        try {
          const res = await api.obterSugestaoEstoque({
            material: novaPeca.material,
            espessura: novaPeca.espessura,
            largura: novaPeca.largura,
            comprimento: novaPeca.comprimento,
            quantidade: novaPeca.quantidade,
          });
          setSugestaoEstoque(res);
        } catch (err) {
          console.error("Erro ao buscar sugestão de estoque:", err);
          setSugestaoEstoque(null);
        }
      } else {
        setSugestaoEstoque(null);
      }
    }
    fetchSugestao();
  }, [
    novaPeca.material,
    novaPeca.espessura,
    novaPeca.largura,
    novaPeca.comprimento,
    novaPeca.quantidade,
  ]);

  // Carregar orçamento se estiver no modo edição
  useEffect(() => {
    if (!editId) return;
    async function loadEditOrcamento() {
      try {
        setLoading(true);
        const data = await api.getOrcamento(editId!);
        
        // Preencher informações do cliente
        setCliente({
          nome: data.cliente.nome || "",
          email: data.cliente.email || "",
          telefone: data.cliente.telefone || "",
          cnpj: data.cliente.cnpj || "",
          endereco: data.cliente.endereco || "",
          cidade: data.cliente.cidade || "",
          estado: data.cliente.estado || "SP",
        });
        
        setTipoVenda(data.tipo_venda || "pecas");
        setIpiRate(data.ipi_rate ?? 0.05);
        setTaxaComissao(data.taxa_comissao ?? 0.03);
        setCondicaoPagamento(data.condicao_pagamento || "30 dias");
        setPrazoEntrega(data.prazo_entrega || "15 dias úteis");
        setValidade(data.validade ?? 30);
        setObservacoes(data.observacoes || "");

        // Mapear itens de volta
        const getTempo = (ops: any[], name: string) => {
          const op = ops.find(o => o.nome === name);
          return op ? op.tempo_min : 0.0;
        };

        const mappedItens = data.itens.map((it: any) => ({
          id: it.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          descricao: it.descricao || "",
          num_desenho: "",
          material: it.material || "AÇO CARBONO",
          tipo_material: it.tipo_material || "",
          espessura: it.espessura || 0,
          largura: it.largura || 0,
          comprimento: it.comprimento || 0,
          perimetro: it.perimetro || 0,
          num_entradas: it.num_entradas || 1,
          quantidade: it.quantidade || 1,
          chapa_l: it.chapa_l || 1200,
          chapa_c: it.chapa_c || 2400,
          preco_kg: it.preco_kg || 0,
          margem_lucro: it.margem_lucro || 0.3,
          origem_material: it.origem_material || "chapa_inteira",
          tempo_setup: getTempo(it.operacoes || [], "SET-UP"),
          tempo_dobra: getTempo(it.operacoes || [], "DOBRA"),
          tempo_caldeiraria: getTempo(it.operacoes || [], "CALDEIRARIA"),
          tempo_solda: getTempo(it.operacoes || [], "SOLDA"),
          tempo_guilhotina: getTempo(it.operacoes || [], "GUILHOTINA"),
          tempo_usinagem: getTempo(it.operacoes || [], "USINAGEM INTERNA"),
          tempo_montagem: getTempo(it.operacoes || [], "MONTAGEM"),
          observacoes: it.observacoes || ""
        }));
        
        setItens(mappedItens);
      } catch (err) {
        console.error("Erro ao carregar orçamento para edição:", err);
        alert("Erro ao carregar orçamento para edição.");
      } finally {
        setLoading(false);
      }
    }
    loadEditOrcamento();
  }, [editId]);

  const handleAddPeca = () => {
    if (!novaPeca.descricao) {
      alert("Informe pelo menos a descrição da peça.");
      return;
    }
    
    if (editingPecaId) {
      setItens(itens.map(it => it.id === editingPecaId ? { ...novaPeca, id: editingPecaId } : it));
      setEditingPecaId(null);
    } else {
      setItens([...itens, { ...novaPeca, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) }]);
    }
    
    // Reset form peça mantendo material/configurações anteriores
    setNovaPeca(prev => ({
      ...prev,
      descricao: "",
      num_desenho: "",
      largura: 0,
      comprimento: 0,
      perimetro: 0,
      num_entradas: 1,
      quantidade: 1,
      origem_material: "chapa_inteira",
      tempo_setup: 6.0,
      tempo_dobra: 6.0,
      tempo_caldeiraria: 6.0,
      tempo_solda: 6.0,
      tempo_guilhotina: 6.0,
      tempo_usinagem: 6.0,
      tempo_montagem: 6.0,
      observacoes: ""
    }));
  };

  const handleRemovePeca = (id: string) => {
    setItens(itens.filter(it => it.id !== id));
    if (editingPecaId === id) {
      setEditingPecaId(null);
    }
  };

  const handleEditPeca = (item: any) => {
    setNovaPeca({
      descricao: item.descricao || "",
      num_desenho: item.num_desenho || "",
      material: item.material || "AÇO CARBONO",
      tipo_material: item.tipo_material || "",
      espessura: item.espessura ?? 3.18,
      largura: item.largura ?? 0,
      comprimento: item.comprimento ?? 0,
      perimetro: item.perimetro ?? 0,
      num_entradas: item.num_entradas ?? 1,
      quantidade: item.quantidade ?? 1,
      chapa_l: item.chapa_l ?? 1200,
      chapa_c: item.chapa_c ?? 2400,
      preco_kg: item.preco_kg ?? 2.00,
      margem_lucro: item.margem_lucro ?? 0.30,
      origem_material: item.origem_material || "chapa_inteira",
      tempo_setup: item.tempo_setup ?? 0,
      tempo_dobra: item.tempo_dobra ?? 0,
      tempo_caldeiraria: item.tempo_caldeiraria ?? 0,
      tempo_solda: item.tempo_solda ?? 0,
      tempo_guilhotina: item.tempo_guilhotina ?? 0,
      tempo_usinagem: item.tempo_usinagem ?? 0,
      tempo_montagem: item.tempo_montagem ?? 0,
      observacoes: item.observacoes || ""
    });
    setEditingPecaId(item.id);
    
    // Rolar a tela suavemente para o formulário de peças
    const element = document.getElementById("peca-form-card");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenBulkEdit = () => {
    setBulkNewMaterial("");
    setBulkNewEspessura("");
    setBulkNewQuantidade("");
    setBulkTempoSetup("");
    setBulkTempoDobra("");
    setBulkTempoCaldeiraria("");
    setBulkTempoSolda("");
    setBulkTempoGuilhotina("");
    setBulkTempoUsinagem("");
    setBulkTempoMontagem("");
    setBulkModalOpen(true);
  };

  const handleApplyBulkEdit = () => {
    if (selectedItemIds.length === 0) return;

    const updatedItens = itens.map((it) => {
      if (selectedItemIds.includes(it.id)) {
        let mat = it.material;
        let esp = it.espessura;
        let qty = it.quantidade;
        let setup = it.tempo_setup;
        let dobra = it.tempo_dobra;
        let caldeiraria = it.tempo_caldeiraria;
        let solda = it.tempo_solda;
        let guilhotina = it.tempo_guilhotina;
        let usinagem = it.tempo_usinagem;
        let montagem = it.tempo_montagem;
        let precoKg = it.preco_kg;
        let tipoMat = it.tipo_material;

        if (bulkNewMaterial) {
          mat = bulkNewMaterial;
          const matched = materiais.find(m => m.nome === bulkNewMaterial);
          tipoMat = matched ? matched.tipo : tipoMat;
          precoKg = matched ? matched.preco_kg : precoKg;
        }
        
        if (bulkNewEspessura) {
          const parsedEsp = parseFloat(String(bulkNewEspessura).replace(",", "."));
          if (!isNaN(parsedEsp)) {
            esp = parsedEsp;
          }
        }
        
        if (bulkNewQuantidade) {
          const parsedQty = parseInt(String(bulkNewQuantidade), 10);
          if (!isNaN(parsedQty)) {
            qty = parsedQty;
          }
        }

        if (bulkTempoSetup) {
          const parsed = parseFloat(String(bulkTempoSetup).replace(",", "."));
          if (!isNaN(parsed)) setup = parsed;
        }
        if (bulkTempoDobra) {
          const parsed = parseFloat(String(bulkTempoDobra).replace(",", "."));
          if (!isNaN(parsed)) dobra = parsed;
        }
        if (bulkTempoCaldeiraria) {
          const parsed = parseFloat(String(bulkTempoCaldeiraria).replace(",", "."));
          if (!isNaN(parsed)) caldeiraria = parsed;
        }
        if (bulkTempoSolda) {
          const parsed = parseFloat(String(bulkTempoSolda).replace(",", "."));
          if (!isNaN(parsed)) solda = parsed;
        }
        if (bulkTempoGuilhotina) {
          const parsed = parseFloat(String(bulkTempoGuilhotina).replace(",", "."));
          if (!isNaN(parsed)) guilhotina = parsed;
        }
        if (bulkTempoUsinagem) {
          const parsed = parseFloat(String(bulkTempoUsinagem).replace(",", "."));
          if (!isNaN(parsed)) usinagem = parsed;
        }
        if (bulkTempoMontagem) {
          const parsed = parseFloat(String(bulkTempoMontagem).replace(",", "."));
          if (!isNaN(parsed)) montagem = parsed;
        }

        return {
          ...it,
          material: mat,
          tipo_material: tipoMat,
          preco_kg: precoKg,
          espessura: esp,
          quantidade: qty,
          tempo_setup: setup,
          tempo_dobra: dobra,
          tempo_caldeiraria: caldeiraria,
          tempo_solda: solda,
          tempo_guilhotina: guilhotina,
          tempo_usinagem: usinagem,
          tempo_montagem: montagem,
        };
      }
      return it;
    });

    setItens(updatedItens);
    setSelectedItemIds([]);
    setBulkModalOpen(false);
  };

  const handleDxfSuccess = (dxfs: DXFResult[]) => {
    const mapped = dxfs.map((dxf, index) => {
      const defaultMaterial = materiais.find(m => m.nome === "AÇO CARBONO") || materiais[0];
      return {
        id: `dxf-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        descricao: dxf.filename ? dxf.filename.replace(/\.dxf$/i, "") : `Peça DXF ${index + 1}`,
        num_desenho: "",
        material: defaultMaterial ? defaultMaterial.nome : "AÇO CARBONO",
        tipo_material: defaultMaterial ? defaultMaterial.tipo : "S 1020",
        espessura: 3.18,
        largura: dxf.largura,
        comprimento: dxf.comprimento,
        perimetro: dxf.perimetro,
        num_entradas: dxf.num_entradas,
        quantidade: 1,
        chapa_l: 1200,
        chapa_c: 2400,
        preco_kg: defaultMaterial ? defaultMaterial.preco_kg : 2.00,
        margem_lucro: 0.30,
        origem_material: "chapa_inteira",
        
        // Tempos padrão (iniciam em 0 para peças importadas por DXF)
        tempo_setup: 0.0,
        tempo_dobra: 0.0,
        tempo_caldeiraria: 0.0,
        tempo_solda: 0.0,
        tempo_guilhotina: 0.0,
        tempo_usinagem: 0.0,
        tempo_montagem: 0.0,
        
        observacoes: "",
      };
    });
    setDxfItemsToConfigure(mapped);
  };

  // --- Step 3: Cálculos e Revisão ---
  const [calculado, setCalculado] = useState<any>(null);

  const processarCalculoLocal = () => {
    // Simular o cálculo do backend localmente para pré-visualização instantânea.
    // Impostos dependendo do Estado e Tipo de Venda
    // 7% ICMS se AC, AL, AP, AM, BA, CE, ES, GO, MA, MT, MS, PA, PB, PE, PI, RN, RO, RR, SE, TO, ZFM
    // 12% se MG, PR, RJ, RS, SC, SP(equipamento)
    // 18% se SP(peças)
    
    let icmsRate = 0.18;
    const est7 = ["AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO", "ZFM"];
    const est12 = ["MG", "PR", "RJ", "RS", "SC"];
    
    if (est7.includes(cliente.estado)) {
      icmsRate = 0.07;
    } else if (est12.includes(cliente.estado) || (cliente.estado === "SP" && tipoVenda === "equipamento")) {
      icmsRate = 0.12;
    }

    const totalImpostos = icmsRate + 0.0065 + 0.03 + 0.0108 + 0.012; // ICMS + PIS + COFINS + CSLL + IRPJ
    const fatorCalculo = 1.0 - totalImpostos;

    let totalPreco = 0.0;
    let totalCustoMp = 0.0;
    let totalFabricacao = 0.0;
    let totalPeso = 0.0;

    const itensCalculados = itens.map((item) => {
      // 1. Velocidade de avanço baseada em material e espessura
      let avanco = 3528.0;
      let peck = 1.0;
      if (item.material === "INOX") {
        if (item.espessura <= 1.0) { avanco = 7800; }
        else if (item.espessura <= 2.0) { avanco = 5300; }
        else { avanco = 3528; }
      } else if (item.material === "ALUMÍNIO") {
        avanco = 2450;
      }

      // 2. Tempo corte laser
      const tempoLaser = calcularTempoCorteLaser(item.perimetro, avanco, item.num_entradas, peck);

      // 3. Área e Peso
      const densidade = item.material === "ALUMÍNIO" ? 2.71 : 7.86;
      const area = calcularArea(item.largura, item.comprimento);
      const pesoUnit = calcularPesoUnitario(area, item.espessura, densidade);
      const pesoTotal = pesoUnit * item.quantidade;

      // 4. Aproveitamento de chapa
      const pecasChapa = calcularPecasPorChapa(item.chapa_l, item.chapa_c, item.largura, item.comprimento, 5.0);
      const qtdChapas = calcularQtdChapas(item.quantidade, pecasChapa);
      const sobra = calcularSobra(pecasChapa, qtdChapas, item.quantidade);
      const retalho = sobra * pesoUnit;

      // 5. Custo Matéria Prima
      const custoMp = calcularCustoMP(pesoTotal, item.preco_kg);

      // 6. Fabricação (tempos e custos de hora reais ou default R$ 10.00/h)
      const getCusto = (nome: string) => custosOperacao[nome] ?? 10.00;

      const operacoes = [
        { tempo_min: tempoLaser * item.quantidade, custo_hora: getCusto("CORTE LASER") },
        { tempo_min: item.tempo_setup, custo_hora: getCusto("SET-UP") },
        { tempo_min: item.tempo_dobra * item.quantidade, custo_hora: getCusto("DOBRA") },
        { tempo_min: item.tempo_caldeiraria * item.quantidade, custo_hora: getCusto("CALDEIRARIA") },
        { tempo_min: item.tempo_solda * item.quantidade, custo_hora: getCusto("SOLDA") },
        { tempo_min: item.tempo_guilhotina * item.quantidade, custo_hora: getCusto("GUILHOTINA") },
        { tempo_min: item.tempo_usinagem * item.quantidade, custo_hora: getCusto("USINAGEM INTERNA") },
        { tempo_min: item.tempo_montagem * item.quantidade, custo_hora: getCusto("MONTAGEM") },
      ];
      const totalFab = calcularTotalFabricacao(operacoes);

      // 7. Pricing
      const custoBasico = calcularCustoBasico(totalFab, custoMp);
      const vendaSemImp = calcularValorVendaSemImp(custoBasico, item.margem_lucro);
      const vendaSemImpUnit = item.quantidade > 0 ? vendaSemImp / item.quantidade : 0;
      const precoUnitComImp = calcularPrecoComImpostos(vendaSemImpUnit, totalImpostos);
      const precoTotalItem = precoUnitComImp * item.quantidade;

      totalPreco += precoTotalItem;
      totalCustoMp += custoMp;
      totalFabricacao += totalFab;
      totalPeso += pesoTotal;

      return {
        ...item,
        peso_total: pesoTotal,
        preco_unitario_com_imp: precoUnitComImp,
        preco_total: precoTotalItem,
        custo_mp: custoMp,
        total_fabricacao: totalFab,
      };
    });

    const valorIpi = totalPreco * ipiRate;
    const totalNf = totalPreco + valorIpi;
    const totalTributos = totalPreco * totalImpostos;
    const totalComissao = (totalPreco * fatorCalculo) * taxaComissao;

    setCalculado({
      itens: itensCalculados,
      total_preco: totalPreco,
      total_custo_mp: totalCustoMp,
      total_fabricacao: totalFabricacao,
      total_peso: totalPeso,
      total_tributos: totalTributos,
      total_nf: totalNf,
      total_comissao: totalComissao,
    });
  };

  useEffect(() => {
    if (step === 3 && itens.length > 0) {
      processarCalculoLocal();
    }
  }, [step, ipiRate, taxaComissao]);

  const handleSave = async (status: string) => {
    setLoading(true);
    try {
      const payload = {
        cliente,
        tipo_venda: tipoVenda,
        ipi_rate: ipiRate,
        taxa_comissao: taxaComissao,
        condicao_pagamento: condicaoPagamento,
        prazo_entrega: prazoEntrega,
        validade,
        observacoes,
        itens: itens.map(it => ({
          descricao: it.descricao,
          material: it.material,
          tipo_material: it.tipo_material,
          espessura: it.espessura,
          largura: it.largura,
          comprimento: it.comprimento,
          perimetro: it.perimetro,
          num_entradas: it.num_entradas,
          quantidade: it.quantidade,
          chapa_l: it.chapa_l,
          chapa_c: it.chapa_c,
          preco_kg: it.preco_kg,
          margem_lucro: it.margem_lucro,
          origem_material: it.origem_material || "chapa_inteira",
          operacoes: [
            { nome: "SET-UP", tempo_min: it.tempo_setup },
            { nome: "DOBRA", tempo_min: it.tempo_dobra },
            { nome: "CALDEIRARIA", tempo_min: it.tempo_caldeiraria },
            { nome: "SOLDA", tempo_min: it.tempo_solda },
            { nome: "GUILHOTINA", tempo_min: it.tempo_guilhotina },
            { nome: "USINAGEM INTERNA", tempo_min: it.tempo_usinagem },
            { nome: "MONTAGEM", tempo_min: it.tempo_montagem },
          ]
        }))
      };

      let resultId = editId;
      if (editId) {
        await api.updateOrcamento(editId, payload);
      } else {
        const result = await api.createOrcamento(payload);
        resultId = result.id;
      }
      
      // Atualizar status
      await api.updateStatus(resultId!, status);
      
      router.push(`/orcamentos/${resultId}`);
    } catch (err) {
      alert("Erro ao salvar orçamento.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return "R$ 0,00";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            {editId ? "Editar Orçamento" : "Criar Novo Orçamento"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Preencha os dados do cliente, importe peças via DXF e revise impostos por margem por dentro
          </p>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="flex items-center gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? "bg-blue-600 text-white" : "bg-white/5 text-slate-500"
            }`}>1</span>
            <span className={`text-xs font-semibold ${step >= 1 ? "text-slate-200" : "text-slate-500"}`}>
              Dados do Cliente
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-600" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? "bg-blue-600 text-white" : "bg-white/5 text-slate-500"
            }`}>2</span>
            <span className={`text-xs font-semibold ${step >= 2 ? "text-slate-200" : "text-slate-500"}`}>
              Peças & Operações
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-600" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? "bg-blue-600 text-white" : "bg-white/5 text-slate-500"
            }`}>3</span>
            <span className={`text-xs font-semibold ${step >= 3 ? "text-slate-200" : "text-slate-500"}`}>
              Revisão & Cálculo
            </span>
          </div>
        </div>

        {/* Step 1: Cliente */}
        {step === 1 && (
          <Card header="1. Identificação do Cliente">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Cliente/Empresa"
                placeholder="Ex: Indústrias Metalúrgicas Alfa LTDA"
                value={cliente.nome}
                onChange={e => setCliente({ ...cliente, nome: e.target.value })}
              />
              <Input
                label="CNPJ / CPF"
                placeholder="00.000.000/0000-00"
                value={cliente.cnpj}
                onChange={e => setCliente({ ...cliente, cnpj: e.target.value })}
              />
              <Input
                label="E-mail"
                type="email"
                placeholder="compras@cliente.com.br"
                value={cliente.email}
                onChange={e => setCliente({ ...cliente, email: e.target.value })}
              />
              <Input
                label="Telefone"
                placeholder="(11) 98888-7777"
                value={cliente.telefone}
                onChange={e => setCliente({ ...cliente, telefone: e.target.value })}
              />
              <Input
                label="Endereço de Faturamento"
                placeholder="Rua das Indústrias, 450 - Bairro Industrial"
                value={cliente.endereco}
                onChange={e => setCliente({ ...cliente, endereco: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cidade"
                  placeholder="Sorocaba"
                  value={cliente.cidade}
                  onChange={e => setCliente({ ...cliente, cidade: e.target.value })}
                />
                <Select
                  label="Estado (Destino)"
                  value={cliente.estado}
                  onChange={e => setCliente({ ...cliente, estado: e.target.value })}
                  options={[
                    { value: "SP", label: "São Paulo (SP)" },
                    { value: "MG", label: "Minas Gerais (MG)" },
                    { value: "RJ", label: "Rio de Janeiro (RJ)" },
                    { value: "PR", label: "Paraná (PR)" },
                    { value: "SC", label: "Santa Catarina (SC)" },
                    { value: "RS", label: "Rio Grande do Sul (RS)" },
                    { value: "GO", label: "Goiás (GO)" },
                    { value: "BA", label: "Bahia (BA)" },
                    { value: "PE", label: "Pernambuco (PE)" },
                    { value: "CE", label: "Ceará (CE)" },
                    { value: "DF", label: "Distrito Federal (DF)" },
                    { value: "AM", label: "Amazonas (AM)" },
                    { value: "ZFM", label: "Zona Franca (ZFM)" },
                  ]}
                />
              </div>
            </div>

            <div className="border-t border-white/5 pt-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Tipo de Venda"
                value={tipoVenda}
                onChange={e => setTipoVenda(e.target.value)}
                options={[
                  { value: "pecas", label: "Peças Industriais (18% ICMS base SP)" },
                  { value: "equipamento", label: "Equipamento/Máquina (12% ICMS base SP)" },
                ]}
              />
              <Input
                label="IPI (%)"
                type="number"
                step="0.01"
                value={ipiRate * 100}
                onChange={e => setIpiRate(parseFloat(e.target.value) / 100)}
              />
              <Input
                label="Comissão Operador (%)"
                type="number"
                step="0.1"
                value={taxaComissao * 100}
                onChange={e => setTaxaComissao(parseFloat(e.target.value) / 100)}
              />
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => {
                  if (!cliente.nome) {
                    alert("Por favor, informe o nome do cliente.");
                    return;
                  }
                  setStep(2);
                }}
                className="flex items-center gap-2"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Peças */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            {/* DXF Drag and Drop Zone */}
            <Card header="Importação Automática via DXF/CAD">
              <DxfUploader onSuccess={handleDxfSuccess} />
            </Card>

            {/* Modal de Configuração de Peças DXF Múltiplas */}
            <Modal
              isOpen={dxfItemsToConfigure !== null}
              onClose={() => setDxfItemsToConfigure(null)}
              title="Configurar Peças DXF Importadas"
              size="xl"
            >
              {dxfItemsToConfigure && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setItens((prev) => [...prev, ...dxfItemsToConfigure]);
                    setDxfItemsToConfigure(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (
                        e.target instanceof HTMLInputElement &&
                        e.target.type !== "button" &&
                        e.target.type !== "submit"
                      ) {
                        e.preventDefault();
                        setItens((prev) => [...prev, ...dxfItemsToConfigure]);
                        setDxfItemsToConfigure(null);
                      }
                    }
                  }}
                  className="flex flex-col gap-6 max-h-[70vh]"
                >
                  <div className="overflow-y-auto max-h-[50vh] pr-2">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="border-b border-white/10 text-xs font-semibold text-slate-400">
                          <th className="py-3 px-2">Desenho / Descrição</th>
                          <th className="py-3 px-2">Dimensões (mm)</th>
                          <th className="py-3 px-2">Material</th>
                          <th className="py-3 px-2 w-16">Esp. (mm)</th>
                          <th className="py-3 px-2 w-16">Qtd</th>
                          <th className="py-3 px-2 w-20">Preço Kg</th>
                          <th className="py-3 px-2 w-20">Margem %</th>
                          <th className="py-3 px-2 w-20">Dobra (min)</th>
                          <th className="py-3 px-2 w-20">Solda (min)</th>
                          <th className="py-3 px-2 w-20">Usinagem (min)</th>
                          <th className="py-3 px-2 w-20">Custo Extra (min)</th>
                          <th className="py-3 px-2 w-24">Perímetro (mm)</th>
                          <th className="py-3 px-2 w-16">Entradas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                        {dxfItemsToConfigure.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="py-3 px-2">
                              <div className="flex flex-col gap-1 w-full max-w-[180px]">
                                <span className="font-semibold text-xs text-blue-400 truncate block" title={item.descricao}>
                                  {item.descricao}
                                </span>
                                <input
                                  type="text"
                                  className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                  placeholder="Descrição amigável"
                                  value={item.descricao}
                                  onChange={(e) => {
                                    const updated = [...dxfItemsToConfigure];
                                    updated[idx].descricao = e.target.value;
                                    setDxfItemsToConfigure(updated);
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-2 text-xs font-medium text-slate-400">
                              {item.largura} x {item.comprimento}
                            </td>
                            <td className="py-3 px-2">
                              <select
                                className="bg-[#12121e] border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-full"
                                value={item.material}
                                onChange={(e) => {
                                  const matched = materiais.find(m => m.nome === e.target.value);
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].material = e.target.value;
                                  updated[idx].tipo_material = matched ? matched.tipo : "";
                                  updated[idx].preco_kg = matched ? matched.preco_kg : 2.00;
                                  setDxfItemsToConfigure(updated);
                                }}
                              >
                                <option value="AÇO CARBONO">AÇO CARBONO</option>
                                <option value="INOX">INOX</option>
                                <option value="ALUMÍNIO">ALUMÍNIO</option>
                              </select>
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                step="0.01"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.espessura}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].espessura = parseFloat(e.target.value) || 0.0;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].quantidade = parseInt(e.target.value) || 1;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                step="0.01"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.preco_kg}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].preco_kg = parseFloat(e.target.value) || 0.0;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.margem_lucro * 100}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].margem_lucro = (parseFloat(e.target.value) || 0.0) / 100;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                step="0.1"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.tempo_dobra}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].tempo_dobra = parseFloat(e.target.value) || 0.0;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                step="0.1"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.tempo_solda}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].tempo_solda = parseFloat(e.target.value) || 0.0;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                step="0.1"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.tempo_usinagem}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].tempo_usinagem = parseFloat(e.target.value) || 0.0;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                step="0.1"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.tempo_setup}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].tempo_setup = parseFloat(e.target.value) || 0.0;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.perimetro}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].perimetro = parseFloat(e.target.value) || 0.0;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 w-full text-slate-200"
                                value={item.num_entradas}
                                onChange={(e) => {
                                  const updated = [...dxfItemsToConfigure];
                                  updated[idx].num_entradas = parseInt(e.target.value) || 1;
                                  setDxfItemsToConfigure(updated);
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                    <Button type="button" variant="secondary" onClick={() => setDxfItemsToConfigure(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Adicionar Peças ao Orçamento
                    </Button>
                  </div>
                </form>
              )}
            </Modal>

            {/* Manual item form */}
            <Card header={editingPecaId ? "Editar Peça Selecionada" : "Adicionar Peça"} id="peca-form-card">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Descrição da Peça"
                    placeholder="Ex: Suporte de fixação dobrado"
                    value={novaPeca.descricao}
                    onChange={e => setNovaPeca({ ...novaPeca, descricao: e.target.value })}
                  />
                </div>
                <Input
                  label="Número do Desenho"
                  placeholder="Ex: DES-9821-A"
                  value={novaPeca.num_desenho}
                  onChange={e => setNovaPeca({ ...novaPeca, num_desenho: e.target.value })}
                />
                <Input
                  label="Quantidade"
                  type="number"
                  value={novaPeca.quantidade}
                  onChange={e => setNovaPeca({ ...novaPeca, quantidade: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <Select
                  label="Material"
                  value={novaPeca.material}
                  onChange={e => {
                    const matched = materiais.find(m => m.nome === e.target.value);
                    setNovaPeca({
                      ...novaPeca,
                      material: e.target.value,
                      tipo_material: matched ? matched.tipo : "",
                      preco_kg: matched ? matched.preco_kg : 2.00
                    });
                  }}
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
                  value={novaPeca.espessura}
                  onChange={e => setNovaPeca({ ...novaPeca, espessura: parseFloat(e.target.value) || 1.0 })}
                />
                <Input
                  label="Largura Peça (mm)"
                  type="number"
                  value={novaPeca.largura}
                  onChange={e => setNovaPeca({ ...novaPeca, largura: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Comprimento Peça (mm)"
                  type="number"
                  value={novaPeca.comprimento}
                  onChange={e => setNovaPeca({ ...novaPeca, comprimento: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <Input
                  label="Perímetro de Corte (mm)"
                  type="number"
                  value={novaPeca.perimetro}
                  onChange={e => setNovaPeca({ ...novaPeca, perimetro: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Furos (Num Entradas)"
                  type="number"
                  value={novaPeca.num_entradas}
                  onChange={e => setNovaPeca({ ...novaPeca, num_entradas: parseInt(e.target.value) || 1 })}
                />
                <Input
                  label="Preço Material (R$/Kg)"
                  type="number"
                  step="0.01"
                  value={novaPeca.preco_kg}
                  onChange={e => setNovaPeca({ ...novaPeca, preco_kg: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Margem de Lucro (%)"
                  type="number"
                  value={novaPeca.margem_lucro * 100}
                  onChange={e => setNovaPeca({ ...novaPeca, margem_lucro: parseFloat(e.target.value) / 100 })}
                />
              </div>

              {/* Origem de Chapa e Estoque */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                  Configuração de Material e Origem
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Largura Chapa (mm)"
                      type="number"
                      value={novaPeca.chapa_l}
                      onChange={e => setNovaPeca({ ...novaPeca, chapa_l: parseFloat(e.target.value) || 1200 })}
                    />
                    <Input
                      label="Comprimento Chapa (mm)"
                      type="number"
                      value={novaPeca.chapa_c}
                      onChange={e => setNovaPeca({ ...novaPeca, chapa_c: parseFloat(e.target.value) || 2400 })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Select
                      label="Origem do Material"
                      value={novaPeca.origem_material || "chapa_inteira"}
                      onChange={e => setNovaPeca({ ...novaPeca, origem_material: e.target.value })}
                      options={(() => {
                        const opts = [
                          { value: "chapa_inteira", label: "Chapa Inteira (Do Estoque)" },
                          { value: "cliente", label: "Material do Cliente" },
                        ];
                        if (sugestaoEstoque?.retalhos_disponiveis) {
                          sugestaoEstoque.retalhos_disponiveis.forEach((r: any) => {
                            opts.push({
                              value: `retalho_${r.id}`,
                              label: `Retalho ${r.largura}x${r.comprimento} mm (Disponível no Estoque - Qtd: ${r.quantidade})`,
                            });
                          });
                        }
                        if (novaPeca.origem_material && novaPeca.origem_material.startsWith("retalho_")) {
                          if (!opts.some(o => o.value === novaPeca.origem_material)) {
                            opts.push({
                              value: novaPeca.origem_material,
                              label: "Retalho Atual (Selecionado)",
                            });
                          }
                        }
                        return opts;
                      })()}
                    />

                    {sugestaoEstoque?.sugestao && (
                      <div className="mt-2 text-[11px] text-blue-400 font-semibold flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/10 px-3 py-2 rounded-lg">
                        <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse shrink-0" />
                        <span>{sugestaoEstoque.sugestao}</span>
                        {sugestaoEstoque.opcao_sugerida && novaPeca.origem_material !== sugestaoEstoque.opcao_sugerida && (
                          <button
                            type="button"
                            onClick={() => setNovaPeca({ ...novaPeca, origem_material: sugestaoEstoque.opcao_sugerida })}
                            className="ml-auto text-blue-300 hover:text-blue-200 underline cursor-pointer text-[10px]"
                          >
                            Aplicar Sugestão
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tempos operacionais */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                  Tempos de Operação Adicionais (minutos)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  <Input
                    label="SET-UP"
                    type="number"
                    value={novaPeca.tempo_setup}
                    onChange={e => setNovaPeca({ ...novaPeca, tempo_setup: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="DOBRA"
                    type="number"
                    value={novaPeca.tempo_dobra}
                    onChange={e => setNovaPeca({ ...novaPeca, tempo_dobra: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="CALDEIRARIA"
                    type="number"
                    value={novaPeca.tempo_caldeiraria}
                    onChange={e => setNovaPeca({ ...novaPeca, tempo_caldeiraria: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="SOLDA"
                    type="number"
                    value={novaPeca.tempo_solda}
                    onChange={e => setNovaPeca({ ...novaPeca, tempo_solda: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="GUILHOTINA"
                    type="number"
                    value={novaPeca.tempo_guilhotina}
                    onChange={e => setNovaPeca({ ...novaPeca, tempo_guilhotina: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="USINAGEM"
                    type="number"
                    value={novaPeca.tempo_usinagem}
                    onChange={e => setNovaPeca({ ...novaPeca, tempo_usinagem: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="MONTAGEM"
                    type="number"
                    value={novaPeca.tempo_montagem}
                    onChange={e => setNovaPeca({ ...novaPeca, tempo_montagem: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                {editingPecaId && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setEditingPecaId(null);
                      setNovaPeca({
                        descricao: "",
                        num_desenho: "",
                        material: "AÇO CARBONO",
                        tipo_material: "S 1020",
                        espessura: 3.18,
                        largura: 0.0,
                        comprimento: 0.0,
                        perimetro: 0.0,
                        num_entradas: 1,
                        quantidade: 1,
                        chapa_l: 1200,
                        chapa_c: 2400,
                        preco_kg: 2.00,
                        margem_lucro: 0.30,
                        origem_material: "chapa_inteira",
                        tempo_setup: 6.0,
                        tempo_dobra: 6.0,
                        tempo_caldeiraria: 6.0,
                        tempo_solda: 6.0,
                        tempo_guilhotina: 6.0,
                        tempo_usinagem: 6.0,
                        tempo_montagem: 6.0,
                        observacoes: "",
                      });
                    }} 
                    className="text-slate-400 hover:text-slate-200 select-none cursor-pointer"
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button 
                  variant={editingPecaId ? "primary" : "secondary"} 
                  onClick={handleAddPeca} 
                  className={`flex items-center gap-1 select-none cursor-pointer ${editingPecaId ? "bg-blue-600 hover:bg-blue-700 text-white border-none shadow-[0_0_15px_rgba(59,130,246,0.15)]" : ""}`}
                >
                  {editingPecaId ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingPecaId ? "Salvar Alterações" : "Adicionar à Lista"}
                </Button>
              </div>
            </Card>

            {/* List of added pieces */}
            <Card header={`Peças Adicionadas (${itens.length})`}>
              {itens.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {/* Barra de Ações para Edição em Massa */}
                  <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-4 py-2 rounded-lg text-xs">
                    <span className="text-slate-400 font-semibold">
                      Selecione peças na tabela para habilitar a edição em massa.
                    </span>
                    {selectedItemIds.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleOpenBulkEdit}
                        className="h-7 text-[10px] cursor-pointer bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20 px-3 flex items-center gap-1 select-none font-bold"
                      >
                        <Edit className="h-3 w-3" /> Editar em Massa ({selectedItemIds.length})
                      </Button>
                    )}
                  </div>

                  {(() => {
                    const allSelected = itens.length > 0 && itens.every(it => selectedItemIds.includes(it.id));
                    const someSelected = itens.some(it => selectedItemIds.includes(it.id));
                    
                    const tableHeaders = [
                      <input
                        key="select-all-budget-items"
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemIds(itens.map(it => it.id));
                          } else {
                            setSelectedItemIds([]);
                          }
                        }}
                        className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />,
                      "Item",
                      "Descrição",
                      "Material / Esp.",
                      "Qtd",
                      "Origem",
                      "Dimensões",
                      "Perímetro",
                      "Ações"
                    ];

                    return (
                      <Table headers={tableHeaders}>
                        {itens.map((item, idx) => (
                          <TableRow key={item.id}>
                            <TableCell className="w-10 text-center">
                              <input
                                type="checkbox"
                                checked={selectedItemIds.includes(item.id)}
                                onChange={() => {
                                  setSelectedItemIds(prev =>
                                    prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                  );
                                }}
                                className="rounded border-white/10 bg-slate-950/40 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </TableCell>
                            <TableCell className="font-bold">{idx + 1}</TableCell>
                            <TableCell>{item.descricao}</TableCell>
                            <TableCell>{item.material} {item.espessura}mm</TableCell>
                            <TableCell className="text-center">{item.quantidade}</TableCell>
                            <TableCell>
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-300">
                                {item.origem_material === "cliente"
                                  ? "Cliente"
                                  : item.origem_material?.startsWith("retalho_")
                                  ? "Retalho"
                                  : "Chapa Inteira"}
                              </span>
                            </TableCell>
                            <TableCell>{item.largura} x {item.comprimento} mm</TableCell>
                            <TableCell>{item.perimetro} mm</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditPeca(item)}
                                  className="p-1 text-blue-400 hover:bg-blue-950/20 select-none cursor-pointer"
                                  title="Editar Peça"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemovePeca(item.id)}
                                  className="p-1 text-red-400 hover:bg-red-950/20 select-none cursor-pointer"
                                  title="Excluir Peça"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Table>
                    );
                  })()}

                  <div className="flex justify-between mt-6">
                    <Button variant="secondary" onClick={() => setStep(1)} className="flex items-center gap-1">
                      <ChevronLeft className="h-4 w-4" /> Voltar
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex items-center gap-1">
                      Calcular e Revisar <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Layers className="h-8 w-8 text-slate-700" />
                  <span className="text-sm">Nenhuma peça adicionada ao orçamento.</span>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Step 3: Revisão */}
        {step === 3 && calculado && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Detailed summary of items */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card header="Revisão das Peças Calculadas">
                <Table headers={["Descrição", "Qtd", "Peso Total", "Custo MP", "Fabricação", "Preço s/ Imp", "Total c/ Imp"]}>
                  {calculado.itens.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold text-slate-100">{item.descricao}</TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell>{item.peso_total.toFixed(2)} kg</TableCell>
                      <TableCell>{formatCurrency(item.custo_mp)}</TableCell>
                      <TableCell>{formatCurrency(item.total_fabricacao)}</TableCell>
                      <TableCell>{formatCurrency(item.preco_unitario_com_imp * (1 - 0.2393) * item.quantidade)}</TableCell>
                      <TableCell className="font-bold text-slate-100">{formatCurrency(item.preco_total)}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </Card>

              <Card header="Informações Adicionais e Observações">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Condição de Pagamento"
                    value={condicaoPagamento}
                    onChange={e => setCondicaoPagamento(e.target.value)}
                  />
                  <Input
                    label="Prazo de Entrega"
                    value={prazoEntrega}
                    onChange={e => setPrazoEntrega(e.target.value)}
                  />
                  <Input
                    label="Validade da Proposta (dias)"
                    type="number"
                    value={validade}
                    onChange={e => setValidade(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="mt-4">
                  <Input
                    label="Observações do Orçamento"
                    placeholder="Condições especiais de frete, impostos diferenciados ou observações de desenho..."
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                  />
                </div>
              </Card>
            </div>

            {/* Calculations Breakdown Sidebar */}
            <div className="flex flex-col gap-6">
              <Card
                header={
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <Sparkles className="h-4.5 w-4.5" />
                    <span>Resumo Financeiro (NF)</span>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Matéria-Prima:</span>
                    <span className="font-medium text-slate-200">{formatCurrency(calculado.total_custo_mp)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Fabricação:</span>
                    <span className="font-medium text-slate-200">{formatCurrency(calculado.total_fabricacao)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Peso Total Orçado:</span>
                    <span className="font-medium text-slate-200">{calculado.total_peso.toFixed(2)} kg</span>
                  </div>

                  <div className="border-t border-white/5 my-3" />

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Impostos (Embutidos):</span>
                    <span className="font-medium text-red-400">{formatCurrency(calculado.total_tributos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Comissão Vendedor (3%):</span>
                    <span className="font-medium text-amber-500">{formatCurrency(calculado.total_comissao)}</span>
                  </div>

                  <div className="border-t border-white/5 my-3" />

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-300">VALOR PRODUTOS:</span>
                    <span className="text-lg font-bold text-blue-400">{formatCurrency(calculado.total_preco)}</span>
                  </div>
                  
                  {ipiRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">IPI ({ipiRate * 100}% por fora):</span>
                      <span className="font-medium text-slate-200">{formatCurrency(calculado.total_nf - calculado.total_preco)}</span>
                    </div>
                  )}

                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mt-4 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      TOTAL NOTA FISCAL (c/ IPI)
                    </span>
                    <span className="text-2xl font-black text-slate-100">
                      {formatCurrency(calculado.total_nf)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mt-6">
                    <Button
                      variant="primary"
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      loading={loading}
                      onClick={() => handleSave("aprovado")}
                    >
                      <CheckCircle className="h-4.5 w-4.5" /> Aprovar Orçamento
                    </Button>

                    <Button
                      variant="danger"
                      className="w-full flex items-center justify-center gap-2"
                      loading={loading}
                      onClick={() => handleSave("reprovado")}
                    >
                      <X className="h-4.5 w-4.5" /> Reprovar / Rejeitar
                    </Button>

                    <Button
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                      loading={loading}
                      onClick={() => handleSave("pendente")}
                    >
                      Enviar para Aprovação
                    </Button>
                    
                    <Button
                      variant="secondary"
                      className="w-full"
                      loading={loading}
                      onClick={() => handleSave("rascunho")}
                    >
                      Salvar como Rascunho
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full text-xs text-slate-500 hover:text-slate-300"
                      onClick={() => setStep(2)}
                    >
                      Voltar e Editar Peças
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Modal de Edição em Massa de Peças do Orçamento */}
        {bulkModalOpen && selectedItemIds.length > 0 && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl max-w-xl w-full p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <Edit className="h-4.5 w-4.5 text-blue-500" /> Edição em Massa de Peças
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Modificando <span className="text-blue-400 font-bold">{selectedItemIds.length}</span> peças selecionadas no orçamento.
                </p>
              </div>

              <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Configurações básicas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Alterar Material"
                    value={bulkNewMaterial}
                    onChange={(e) => setBulkNewMaterial(e.target.value)}
                    options={[
                      { value: "", label: "Manter original" },
                      { value: "AÇO CARBONO", label: "AÇO CARBONO" },
                      { value: "INOX", label: "INOX" },
                      { value: "ALUMÍNIO", label: "ALUMÍNIO" },
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
                  <Input
                    label="Alterar Quantidade"
                    type="number"
                    placeholder="Manter original"
                    value={bulkNewQuantidade}
                    onChange={(e) => setBulkNewQuantidade(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Tempos de Operação */}
                <div className="border-t border-white/5 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                    Alterar Tempos de Operação (minutos)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input
                      label="SET-UP"
                      type="number"
                      placeholder="Manter original"
                      value={bulkTempoSetup}
                      onChange={(e) => setBulkTempoSetup(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      label="DOBRA"
                      type="number"
                      placeholder="Manter original"
                      value={bulkTempoDobra}
                      onChange={(e) => setBulkTempoDobra(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      label="CALDEIRARIA"
                      type="number"
                      placeholder="Manter original"
                      value={bulkTempoCaldeiraria}
                      onChange={(e) => setBulkTempoCaldeiraria(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      label="SOLDA"
                      type="number"
                      placeholder="Manter original"
                      value={bulkTempoSolda}
                      onChange={(e) => setBulkTempoSolda(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      label="GUILHOTINA"
                      type="number"
                      placeholder="Manter original"
                      value={bulkTempoGuilhotina}
                      onChange={(e) => setBulkTempoGuilhotina(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      label="USINAGEM"
                      type="number"
                      placeholder="Manter original"
                      value={bulkTempoUsinagem}
                      onChange={(e) => setBulkTempoUsinagem(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      label="MONTAGEM"
                      type="number"
                      placeholder="Manter original"
                      value={bulkTempoMontagem}
                      onChange={(e) => setBulkTempoMontagem(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic border-t border-white/5 pt-2 mt-1">
                  * Campos em branco não serão modificados. A alteração de material atualizará o tipo de material e preço por quilo automaticamente.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBulkModalOpen(false);
                  }}
                  className="h-9 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApplyBulkEdit}
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

export default function NovoOrcamentoWizard() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
        </div>
      </AppLayout>
    }>
      <NovoOrcamentoWizardContent />
    </Suspense>
  );
}
