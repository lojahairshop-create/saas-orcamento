"""
Motor de cálculo principal – orquestra as fórmulas individuais
para calcular itens e orçamentos completos.
"""

from typing import Dict, List, Tuple, Any, Optional

from app.calculo.formulas import (
    calcular_area,
    calcular_peso_unitario,
    calcular_peso_chapa,
    calcular_pecas_por_chapa,
    calcular_qtd_chapas,
    calcular_sobra,
    calcular_retalho,
    calcular_custo_mp,
    calcular_tempo_corte_laser,
    calcular_total_fabricacao,
    calcular_custo_basico,
    calcular_valor_venda_sem_imp,
    calcular_preco_com_impostos,
    calcular_impostos_individuais,
    calcular_total_nf,
    calcular_comissao,
)
from app.calculo.impostos import get_tax_config, TaxConfig


class CalculoEngine:
    """Executa a cadeia completa de cálculo de orçamentos metalúrgicos."""

    # ------------------------------------------------------------------
    # Parâmetros laser (velocidade mm/min, peck s) – dados da planilha
    # ------------------------------------------------------------------
    PARAMETROS_LASER: Dict[str, Dict[float, Tuple[float, float]]] = {
        "INOX": {
            1.0:  (7800, 1.0),
            1.5:  (6300, 1.1),
            2.0:  (5300, 1.1),
            2.5:  (4500, 1.2),
            3.0:  (3800, 1.2),
            3.18: (3528, 1.3),
            4.0:  (2450, 1.4),
            4.75: (2000, 1.5),
            5.0:  (1600, 1.8),
            6.35: (1200, 2.0),
            8.0:  (500,  2.5),
            10.0: (350,  3.0),
            12.7: (225,  4.0),
            15.87: (0,   0),
            19.0:  (0,   0),
        },
        "AÇO CARBONO": {
            1.0:  (6500, 1.0),
            1.5:  (5800, 1.0),
            2.0:  (4900, 1.0),
            2.5:  (3724, 1.0),
            3.0:  (3600, 1.0),
            3.18: (3528, 1.0),
            4.0:  (2646, 1.0),
            4.75: (2352, 1.5),
            6.35: (2058, 2.0),
            8.0:  (1666, 2.5),
            10.0: (1200, 3.0),
            12.7: (1078, 3.0),
            15.87: (780, 6.0),
            19.0:  (600, 10.0),
        },
        "ALUMÍNIO": {
            1.0:  (8750, 1.0),
            1.5:  (6600, 1.0),
            2.0:  (5390, 1.0),
            2.5:  (3724, 1.0),
            3.18: (2450, 1.0),
            4.0:  (1764, 1.2),
            4.75: (1274, 1.2),
            6.35: (882,  1.5),
            8.0:  (300,  1.5),
            10.0: (0,    0),
            12.7: (0,    0),
            15.87: (0,   0),
            19.0:  (0,   0),
        },
    }

    # ------------------------------------------------------------------
    # Densidades por categoria de material (kg / dm³·mm  →  usado como
    # multiplicador direto: area_m² × espessura_mm × densidade = kg)
    # ------------------------------------------------------------------
    DENSIDADES: Dict[str, float] = {
        "INOX": 8.2,
        "AÇO CARBONO": 7.86,
        "AÇO CARB.": 7.86,
        "ALUMÍNIO": 3.2,
        "ALUMINIO": 3.2,
        "OUTROS": 7.86,
    }

    # ------------------------------------------------------------------
    # Operações padrão e custo-hora default
    # ------------------------------------------------------------------
    OPERACOES: List[str] = [
        "CORTE LASER",
        "SET-UP",
        "DOBRA",
        "CALDEIRARIA",
        "SOLDA",
        "GUILHOTINA",
        "USINAGEM INTERNA",
        "MONTAGEM",
    ]

    CUSTO_HORA_DEFAULT: float = 10.0

    # ------------------------------------------------------------------
    # Lookup de parâmetros laser
    # ------------------------------------------------------------------
    def get_laser_params(
        self,
        material: str,
        espessura: float,
        parametros_custom: Optional[Dict] = None,
    ) -> Tuple[float, float]:
        """
        Retorna (velocidade_mm_min, peck_s) para o material e espessura.
        Aceita parâmetros customizados vindos do banco de dados.
        """
        source = parametros_custom or self.PARAMETROS_LASER

        # Mapear categorias alternativas
        material_key = material.upper().strip()
        aliases = {
            "AÇO CARB.": "AÇO CARBONO",
            "ACO CARBONO": "AÇO CARBONO",
            "ACO CARB.": "AÇO CARBONO",
            "ALUMINUM": "ALUMÍNIO",
        }
        material_key = aliases.get(material_key, material_key)

        material_params = source.get(material_key, {})
        if not material_params:
            return (0.0, 0.0)

        # Busca exata
        if espessura in material_params:
            val = material_params[espessura]
            if isinstance(val, (list, tuple)):
                return (float(val[0]), float(val[1]))
            return (0.0, 0.0)

        # Busca pela espessura mais próxima
        espessuras = sorted(material_params.keys())
        closest = min(espessuras, key=lambda e: abs(e - espessura))
        val = material_params[closest]
        if isinstance(val, (list, tuple)):
            return (float(val[0]), float(val[1]))
        return (0.0, 0.0)

    # ------------------------------------------------------------------
    # Densidade
    # ------------------------------------------------------------------
    def get_densidade(self, material: str) -> float:
        """Retorna a densidade para o material informado."""
        material_key = material.upper().strip()
        aliases = {
            "AÇO CARB.": "AÇO CARBONO",
            "ACO CARBONO": "AÇO CARBONO",
        }
        material_key = aliases.get(material_key, material_key)
        return self.DENSIDADES.get(material_key, 7.86)

    # ------------------------------------------------------------------
    # Cálculo de um item
    # ------------------------------------------------------------------
    def calcular_item(
        self,
        item_data: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executa a cadeia completa de cálculo para um único item.

        Parâmetros esperados em item_data:
            material, espessura, largura, comprimento, perimetro,
            num_entradas, quantidade, chapa_l, chapa_c, preco_kg,
            margem_lucro, operacoes (list[{nome, tempo_min, custo_hora}]),
            taxa_comissao

        Parâmetros opcionais em config:
            estado, tipo_venda, ipi_rate, parametros_laser, custos_operacao
        """
        config = config or {}

        material = item_data.get("material", "AÇO CARBONO")
        espessura = float(item_data.get("espessura", 0))
        largura = float(item_data.get("largura", 0))
        comprimento = float(item_data.get("comprimento", 0))
        perimetro = float(item_data.get("perimetro", 0))
        num_entradas = int(item_data.get("num_entradas", 1))
        quantidade = int(item_data.get("quantidade", 1))
        chapa_l = float(item_data.get("chapa_l", 1200))
        chapa_c = float(item_data.get("chapa_c", 2400))
        preco_kg = float(item_data.get("preco_kg", 0))
        margem_lucro = float(item_data.get("margem_lucro", 0.30))
        taxa_comissao = float(item_data.get("taxa_comissao", 0.03))
        operacoes_input = item_data.get("operacoes", [])

        # Parâmetros laser customizados
        parametros_laser_custom = config.get("parametros_laser")

        # 1. Velocidade / Peck
        velocidade, peck = self.get_laser_params(
            material, espessura, parametros_laser_custom
        )

        # 2. Tempo corte laser (calcula o tempo total do lote e arredonda para cima, ou usa o tempo_corte manual)
        tempo_corte_manual = float(item_data.get("tempo_corte", 0.0))
        if tempo_corte_manual > 0.0:
            tempo_corte_laser = tempo_corte_manual * quantidade
        else:
            tempo_corte_laser = calcular_tempo_corte_laser(
                perimetro, velocidade, num_entradas, peck, quantidade
            )

        # 3. Área e pesos
        densidade = self.get_densidade(material)
        area = calcular_area(largura, comprimento)
        peso_unitario = calcular_peso_unitario(largura, comprimento, espessura)
        peso_chapa = calcular_peso_chapa(chapa_l, chapa_c, espessura)

        # 4. Peças por chapa (duas orientações com gap=espessura e margem de 5mm na chapa)
        pecas_por_chapa = calcular_pecas_por_chapa(
            chapa_l, chapa_c, largura, comprimento, espessura
        )

        # 5. Qtd chapas
        qtd_chapas = calcular_qtd_chapas(quantidade, pecas_por_chapa)

        # 6. Sobra & retalho
        sobra = calcular_sobra(pecas_por_chapa, qtd_chapas, quantidade)
        retalho = calcular_retalho(sobra, peso_unitario)

        beneficiamento = bool(item_data.get("beneficiamento", False))

        # 7. Peso total (com margem de max(espessura, 5mm)) e custo MP (com IPI)
        pad = max(espessura, 5.0)
        peso_total = quantidade * (espessura * (largura + pad) * (comprimento + pad) * densidade / 1000000.0)
        ipi_rate = float(config.get("ipi_rate", 0.05))
        custo_mp = 0.0 if beneficiamento else calcular_custo_mp(peso_total, preco_kg, ipi_rate)

        # 8. Montagem dos tempos e custos de operação
        tempos_min: Dict[str, float] = {}
        custos_hora: Dict[str, float] = {}
        custos_op_config = config.get("custos_operacao", {})

        # Adicionar corte laser como primeira operação (se houver perimetro)
        if tempo_corte_laser > 0:
            tempos_min["CORTE LASER"] = tempo_corte_laser
            custos_hora["CORTE LASER"] = custos_op_config.get(
                "CORTE LASER", self.CUSTO_HORA_DEFAULT
            )

        # Demais operações informadas (multiplica todas por quantidade, inclusive SET-UP)
        for op in operacoes_input:
            if isinstance(op, dict):
                nome = op.get("nome", "")
                tempo = float(op.get("tempo_min", 0))
                custo_val = op.get("custo_hora")
                custo = float(custo_val) if custo_val is not None else float(custos_op_config.get(nome, self.CUSTO_HORA_DEFAULT))
            else:
                nome = getattr(op, "nome", "")
                tempo = float(getattr(op, "tempo_min", 0))
                custo_val = getattr(op, "custo_hora", None)
                custo = float(custo_val) if custo_val is not None else float(custos_op_config.get(nome, self.CUSTO_HORA_DEFAULT))
            if nome and tempo > 0:
                tempos_min[nome] = tempo * quantidade
                custos_hora[nome] = custo

        # 9. Total fabricação e custo básico (adiciona o custo_extra)
        total_fabricacao = calcular_total_fabricacao(tempos_min, custos_hora)
        custo_extra = float(item_data.get("custo_extra", 0.0))
        custo_basico = calcular_custo_basico(total_fabricacao, custo_mp) + (custo_extra * quantidade)

        # 10. Valor de venda sem impostos
        valor_venda_sem_imp = calcular_valor_venda_sem_imp(custo_basico, margem_lucro)

        # 11. Impostos (margem por dentro)
        estado = config.get("estado", "SP")
        tipo_venda = config.get("tipo_venda", "pecas")
        ipi_rate = float(config.get("ipi_rate", 0.05))

        tax_cfg = get_tax_config(estado, tipo_venda, ipi_rate, valor_venda_sem_imp)
        total_impostos = tax_cfg.total_impostos

        # 12. Preço unitário com impostos (POR UNIDADE)
        preco_unitario_com_imp = calcular_preco_com_impostos(
            valor_venda_sem_imp / quantidade if quantidade > 0 else 0,
            total_impostos,
        )

        # 13. Preço total
        preco_total = preco_unitario_com_imp * quantidade

        # 14. Impostos individuais
        impostos = calcular_impostos_individuais(
            preco_total, tax_cfg.icms, tax_cfg.ipi, tax_cfg.pis, tax_cfg.cofins
        )

        # 15. Total NF
        total_nf = calcular_total_nf(preco_total, impostos["ipi"])

        # 16. Comissão
        comissao = calcular_comissao(taxa_comissao, valor_venda_sem_imp)

        return {
            "beneficiamento": beneficiamento,
            # Parâmetros laser
            "velocidade": velocidade,
            "peck": peck,
            "tempo_corte_laser": tempo_corte_laser,
            "custo_extra": float(item_data.get("custo_extra", 0.0)),
            "tempo_corte": float(item_data.get("tempo_corte", 0.0)),
            # Geometria / Peso
            "area": area,
            "peso_unitario": peso_unitario,
            "peso_chapa": peso_chapa,
            "densidade": densidade,
            # Nesting simplificado
            "pecas_por_chapa": pecas_por_chapa,
            "qtd_chapas": qtd_chapas,
            "sobra": sobra,
            "retalho": retalho,
            # Custos
            "peso_total": peso_total,
            "custo_mp": custo_mp,
            "total_fabricacao": total_fabricacao,
            "custo_basico": custo_basico,
            # Preço
            "valor_venda_sem_imp": valor_venda_sem_imp,
            "preco_unitario_com_imp": preco_unitario_com_imp,
            "preco_total": preco_total,
            # Impostos
            "icms": impostos["icms"],
            "ipi": impostos["ipi"],
            "pis": impostos["pis"],
            "cofins": impostos["cofins"],
            "total_tributos": impostos["total_tributos"],
            "total_nf": total_nf,
            # Comissão
            "comissao": comissao,
            # Config de imposto usada
            "tax_config": {
                "icms_rate": tax_cfg.icms,
                "ipi_rate": tax_cfg.ipi,
                "pis_rate": tax_cfg.pis,
                "cofins_rate": tax_cfg.cofins,
                "csll_rate": tax_cfg.csll,
                "irpj_rate": tax_cfg.irpj,
                "total_impostos": total_impostos,
                "fator_calculo": tax_cfg.fator_calculo,
            },
        }

    # ------------------------------------------------------------------
    # Cálculo de orçamento completo
    # ------------------------------------------------------------------
    def calcular_orcamento(
        self,
        items: List[Dict[str, Any]],
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Processa todos os itens de um orçamento e retorna os totais.
        """
        config = config or {}

        items_calculados: List[Dict[str, Any]] = []
        total_preco = 0.0
        total_nf = 0.0
        total_tributos = 0.0
        total_comissao = 0.0
        total_peso = 0.0
        total_custo_mp = 0.0
        total_fabricacao = 0.0

        for item_data in items:
            resultado = self.calcular_item(item_data, config)
            items_calculados.append(resultado)

            total_preco += resultado["preco_total"]
            total_nf += resultado["total_nf"]
            total_tributos += resultado["total_tributos"]
            total_comissao += resultado["comissao"]
            total_peso += resultado["peso_total"]
            total_custo_mp += resultado["custo_mp"]
            total_fabricacao += resultado["total_fabricacao"]

        return {
            "items_calculados": items_calculados,
            "total_preco": total_preco,
            "total_nf": total_nf,
            "total_tributos": total_tributos,
            "total_comissao": total_comissao,
            "total_peso": total_peso,
            "total_custo_mp": total_custo_mp,
            "total_fabricacao": total_fabricacao,
        }
