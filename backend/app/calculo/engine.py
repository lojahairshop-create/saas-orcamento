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
from app.calculo.nesting_engine import Nesting2DEngine


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
        chapa_arranjada = bool(item_data.get("chapa_arranjada", False))

        if chapa_arranjada:
            largura_calc = chapa_l
            comprimento_calc = comprimento + 20.0
            area = (largura_calc / 1000.0) * (comprimento_calc / 1000.0)
            peso_unitario = espessura * largura_calc * comprimento_calc * densidade / 1000000.0
            peso_total = quantidade * peso_unitario
        else:
            area = calcular_area(largura, comprimento)
            peso_unitario = calcular_peso_unitario(largura, comprimento, espessura)
            pad = max(espessura, 5.0)
            peso_total = quantidade * (espessura * (largura + pad) * (comprimento + pad) * densidade / 1000000.0)

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

        # 7. Custo MP (com IPI)
        ipi_rate = float(config.get("ipi_rate", 0.05))
        custo_mp_override = item_data.get("custo_mp_override")
        
        if custo_mp_override is not None:
            custo_mp = float(custo_mp_override)
        else:
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
                lookup_nome = "USINAGEM INTERNA" if nome.upper() == "USINAGEM" else nome.upper()
                custo = float(custo_val) if custo_val is not None else float(custos_op_config.get(lookup_nome, self.CUSTO_HORA_DEFAULT))
            else:
                nome = getattr(op, "nome", "")
                tempo = float(getattr(op, "tempo_min", 0))
                custo_val = getattr(op, "custo_hora", None)
                lookup_nome = "USINAGEM INTERNA" if nome.upper() == "USINAGEM" else nome.upper()
                custo = float(custo_val) if custo_val is not None else float(custos_op_config.get(lookup_nome, self.CUSTO_HORA_DEFAULT))
            if nome and tempo > 0:
                tempos_min[nome] = tempo * quantidade
                custos_hora[nome] = custo

        # 9. Total fabricação e custo básico (adiciona pintura e custo_extra)
        valor_pintura = float(item_data.get("valor_pintura", 0.0))
        preco_pintura_kg = float(item_data.get("preco_pintura_kg", 0.0))
        val_pint = valor_pintura if valor_pintura > 0 else preco_pintura_kg
        custo_pintura = val_pint * quantidade

        total_fabricacao = calcular_total_fabricacao(tempos_min, custos_hora) + custo_pintura
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
        valor_final = float(item_data.get("valor_final", 0.0))
        if valor_final > 0:
            preco_unitario_com_imp = valor_final
            preco_total = valor_final * quantidade
        else:
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
            "chapa_arranjada": chapa_arranjada,
            # Parâmetros laser
            "velocidade": velocidade,
            "peck": peck,
            "tempo_corte_laser": tempo_corte_laser,
            "custo_extra": float(item_data.get("custo_extra", 0.0)),
            "tempo_corte": float(item_data.get("tempo_corte", 0.0)),
            "preco_pintura_kg": preco_pintura_kg,
            "valor_pintura": valor_pintura,
            "valor_final": valor_final,
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

        # ------------------------------------------------------------------
        # ORQUESTRAÇÃO NESTING MULTI-BIN (Atrás de Feature Flag)
        # ------------------------------------------------------------------
        usar_nesting_2d = config.get("usar_nesting_2d", False)
        
        itens_nesting = []
        if usar_nesting_2d:
            for i, item in enumerate(items):
                if item.get("chapa_arranjada", False) and not item.get("beneficiamento", False):
                    itens_nesting.append((i, item))
                
        grupos_nesting = {}
        for idx, item in itens_nesting:
            mat = item.get("material", "AÇO CARBONO").upper().strip()
            esp = float(item.get("espessura", 0))
            chapa_dim = (float(item.get("chapa_l", 1200)), float(item.get("chapa_c", 2400)))
            key = (mat, esp, chapa_dim)
            if key not in grupos_nesting:
                grupos_nesting[key] = []
            grupos_nesting[key].append((idx, item))
            
        retalhos_disponiveis = config.get("retalhos_disponiveis", [])
        bins_utilizados_geral = []
        custo_rateado_por_item_idx = {}
        
        ipi_rate = float(config.get("ipi_rate", 0.05))
        margem_corte = float(config.get("margem_corte", 5.0))
        
        for key, lista_itens in grupos_nesting.items():
            mat, esp, chapa_padrao = key
            
            # Filtra retalhos aplicáveis a este grupo
            retalhos_grupo = [
                r for r in retalhos_disponiveis
                if r.get('material', '').upper().strip() == mat and float(r.get('espessura', 0)) == esp
            ]
            
            pecas_para_nesting = []
            preco_kg = float(lista_itens[0][1].get("preco_kg", 0))
            
            for idx, item in lista_itens:
                pecas_para_nesting.append({
                    'id': idx, # Usamos o idx como ID para recuperar o rateio depois
                    'largura': float(item.get("largura", 0)),
                    'comprimento': float(item.get("comprimento", 0)),
                    'quantidade': int(item.get("quantidade", 1)),
                    'permitir_rotacao': item.get("permitir_rotacao", True)
                })
                
            res_nesting = Nesting2DEngine.otimizar_lote_multi_bin(
                pecas=pecas_para_nesting,
                retalhos_disponiveis=retalhos_grupo,
                chapa_padrao=chapa_padrao,
                margem_corte=margem_corte
            )
            
            densidade = self.get_densidade(mat)
            
            for bin_info in res_nesting['bins_utilizados']:
                bins_utilizados_geral.append(bin_info)
                
                # Calcular custo total do bin (chapa ou retalho)
                if bin_info['tipo'] == 'retalho':
                    custo_bin = float(bin_info['valor_original'])
                else:
                    # Chapa nova: custo do peso total da chapa com IPI
                    w, h = bin_info['dimensao']
                    peso_chapa = (esp * w * h * densidade) / 1_000_000.0
                    custo_bin = calcular_custo_mp(peso_chapa, preco_kg, ipi_rate)
                    bin_info['valor_original'] = custo_bin # Atualiza para caso precisemos salvar o retalho sobrante
                # Processar retalhos novos (sobras úteis)
                retalhos_novos_uteis = []
                valor_sobras_uteis = 0.0
                tamanho_min_retalho = float(config.get("tamanho_min_retalho", 200.0))
                
                for r_livre in bin_info['nesting_result'].get('retangulos_livres', []):
                    w_livre = r_livre.get('w', 0)
                    h_livre = r_livre.get('h', 0)
                    
                    if w_livre >= tamanho_min_retalho and h_livre >= tamanho_min_retalho:
                        peso_retalho = (esp * w_livre * h_livre * densidade) / 1_000_000.0
                        valor_retalho = calcular_custo_mp(peso_retalho, preco_kg, ipi_rate)
                        
                        retalho_novo = {
                            "material": mat,
                            "tipo_material": lista_itens[0][1].get("tipo_material"),
                            "espessura": esp,
                            "largura": w_livre,
                            "comprimento": h_livre,
                            "x": r_livre.get('x', 0),
                            "y": r_livre.get('y', 0),
                            "valor_contabil": valor_retalho
                        }
                        retalhos_novos_uteis.append(retalho_novo)
                        valor_sobras_uteis += valor_retalho
                        
                bin_info['novos_retalhos_gerados'] = retalhos_novos_uteis
                
                # Custo a ratear: Custo original menos o valor financeiro resgatado nas sobras úteis
                custo_bin_liquido = max(0.0, custo_bin - valor_sobras_uteis)
                    
                rateios = bin_info['nesting_result'].get('rateio_custo_pecas', {})
                for peca_idx, fracao in rateios.items():
                    custo_rateado_por_item_idx[peca_idx] = custo_rateado_por_item_idx.get(peca_idx, 0.0) + (custo_bin_liquido * fracao)

        # ------------------------------------------------------------------

        items_calculados: List[Dict[str, Any]] = []
        total_preco = 0.0
        total_nf = 0.0
        total_tributos = 0.0
        total_comissao = 0.0
        total_peso = 0.0
        total_custo_mp = 0.0
        total_fabricacao = 0.0

        for i, item_data in enumerate(items):
            # Injeta o custo override se esse item participou do nesting e alocou alguma peça
            if i in custo_rateado_por_item_idx:
                item_data["custo_mp_override"] = custo_rateado_por_item_idx[i]
                
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
            "bins_utilizados": bins_utilizados_geral,
            "total_preco": total_preco,
            "total_nf": total_nf,
            "total_tributos": total_tributos,
            "total_comissao": total_comissao,
            "total_peso": total_peso,
            "total_custo_mp": total_custo_mp,
            "total_fabricacao": total_fabricacao,
        }
