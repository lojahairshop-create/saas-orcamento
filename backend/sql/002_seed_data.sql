-- 002_seed_data.sql
-- Dados iniciais (seed) correspondentes à planilha original

-- 1. Configurações Globais Iniciais (Singleton)
INSERT INTO public.configuracoes (id, icms_padrao, ipi_padrao, pis_padrao, cofins_padrao, csll_padrao, irpj_padrao, comissao_padrao, base_calculo_padrao)
VALUES (
    'd800a747-fa20-43f1-bd12-f286b24d7770', -- ID Fixo para facilitar updates
    0.1800, -- ICMS
    0.0500, -- IPI
    0.0065, -- PIS
    0.0300, -- COFINS
    0.0108, -- CSLL
    0.0120, -- IRPJ
    0.0300, -- Comissão
    1.0000  -- Base de Cálculo
) ON CONFLICT (id) DO NOTHING;

-- 2. Custos Operacionais Padrão (R$ 10.00/hora para todas as operações)
INSERT INTO public.custos_operacao (operacao, custo_hora) VALUES
('CORTE LASER', 10.00),
('SET-UP', 10.00),
('DOBRA', 10.00),
('CALDEIRARIA', 10.00),
('SOLDA', 10.00),
('GUILHOTINA', 10.00),
('USINAGEM INTERNA', 10.00),
('MONTAGEM', 10.00)
ON CONFLICT (operacao) DO UPDATE SET custo_hora = EXCLUDED.custo_hora;

-- 3. Medidas de Chapa Comerciais Padrão
INSERT INTO public.medidas_chapas (descricao, largura, comprimento) VALUES
('1000 x 1200', 1000.00, 1200.00),
('1200 x 1500', 1200.00, 1500.00),
('1500 x 2000', 1500.00, 2000.00),
('2000 x 2500', 2000.00, 2500.00),
('2000 x 3000', 2000.00, 3000.00),
('1200 x 2400', 1200.00, 2400.00) -- Chapa clássica
ON CONFLICT DO NOTHING;

-- 4. Materiais e Densidades Padrão (R$/Kg provisório da planilha + densidades oficiais)
INSERT INTO public.materiais (nome, tipo, preco_kg, densidade) VALUES
('INOX', 'A 304', 20.00, 7.860),
('INOX', 'A 304 L', 21.00, 7.860),
('INOX', 'A316', 25.00, 7.860),
('INOX', 'A 430', 18.00, 7.860),
('AÇO CARBONO', 'S 1020', 2.00, 7.860), -- Preço da planilha Y10=2.00
('AÇO CARBONO', 'S 1045', 2.50, 7.860),
('ALUMÍNIO', 'Padrão', 15.00, 2.710),
('OUTROS', 'Padrão', 10.00, 7.860)
ON CONFLICT DO NOTHING;

-- 5. Parâmetros de Velocidade e Peck para Corte Laser
-- INOX
INSERT INTO public.parametros_laser (material, espessura, avanco, peck) VALUES
('INOX', 1.00, 7800.00, 1.00),
('INOX', 1.50, 6300.00, 1.10),
('INOX', 2.00, 5300.00, 1.10),
('INOX', 2.50, 4500.00, 1.20),
('INOX', 3.00, 3800.00, 1.20),
('INOX', 3.18, 3528.00, 1.30),
('INOX', 4.00, 2450.00, 1.40),
('INOX', 4.75, 2000.00, 1.50),
('INOX', 5.00, 1600.00, 1.80),
('INOX', 6.35, 1200.00, 2.00),
('INOX', 8.00, 500.00, 2.50),
('INOX', 10.00, 350.00, 3.00),
('INOX', 12.70, 225.00, 4.00),
('INOX', 15.87, 0.01, 0.00), -- 0 avanço significa indisponível
('INOX', 19.00, 0.01, 0.00),

-- AÇO CARBONO
('AÇO CARBONO', 1.00, 6500.00, 1.00),
('AÇO CARBONO', 1.50, 5800.00, 1.00),
('AÇO CARBONO', 2.00, 4900.00, 1.00),
('AÇO CARBONO', 2.50, 3724.00, 1.00),
('AÇO CARBONO', 3.00, 3600.00, 1.00),
('AÇO CARBONO', 3.18, 3528.00, 1.00),
('AÇO CARBONO', 4.00, 2646.00, 1.00),
('AÇO CARBONO', 4.75, 2352.00, 1.50),
('AÇO CARBONO', 6.35, 2058.00, 2.00),
('AÇO CARBONO', 8.00, 1666.00, 2.50),
('AÇO CARBONO', 10.00, 1200.00, 3.00),
('AÇO CARBONO', 12.70, 1078.00, 3.00),
('AÇO CARBONO', 15.87, 780.00, 6.00),
('AÇO CARBONO', 19.00, 600.00, 10.00),

-- ALUMÍNIO
('ALUMÍNIO', 1.00, 8750.00, 1.00),
('ALUMÍNIO', 1.50, 6600.00, 1.00),
('ALUMÍNIO', 2.00, 5390.00, 1.00),
('ALUMÍNIO', 2.50, 3724.00, 1.00),
('ALUMÍNIO', 3.18, 2450.00, 1.00),
('ALUMÍNIO', 4.00, 1764.00, 1.20),
('ALUMÍNIO', 4.75, 1274.00, 1.20),
('ALUMÍNIO', 6.35, 882.00, 1.50),
('ALUMÍNIO', 8.00, 300.00, 1.50),
('ALUMÍNIO', 10.00, 0.01, 0.00),
('ALUMÍNIO', 12.70, 0.01, 0.00),
('ALUMÍNIO', 15.87, 0.01, 0.00),
('ALUMÍNIO', 19.00, 0.01, 0.00)
ON CONFLICT (material, espessura) DO UPDATE SET avanco = EXCLUDED.avanco, peck = EXCLUDED.peck;

-- 6. Alíquotas de Impostos de Todos os 27 Estados (ICMS, Diferenciando Equipamento vs Peças)
INSERT INTO public.impostos_estados (uf, nome, icms_equipamento, base_calc_equipamento, icms_pecas, base_calc_pecas, ipi_padrao, csll) VALUES
-- Estados com 7% ICMS (Base de cálculo 73.43% na planilha)
('AC', 'Acre', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('AL', 'Alagoas', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('AP', 'Amapá', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('AM', 'Amazonas', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('BA', 'Bahia', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('CE', 'Ceará', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('ES', 'Espírito Santo', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('GO', 'Goiás', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('MA', 'Maranhão', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('MT', 'Mato Grosso', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('MS', 'Mato Grosso do Sul', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('PA', 'Pará', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('PB', 'Paraíba', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('PE', 'Pernambuco', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('PI', 'Piauí', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('RN', 'Rio Grande do Norte', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('RO', 'Rondônia', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('RR', 'Roraima', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('SE', 'Sergipe', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('TO', 'Tocantins', 0.0700, 0.7343, 0.0700, 0.7343, 0.05, 0.0108),
('ZFM', 'Zona Franca de Manaus', 0.0700, 0.7343, 0.0700, 0.7343, 0.00, 0.0108),

-- Estados com 12% ICMS (Base de cálculo 73.33% na planilha)
('MG', 'Minas Gerais', 0.1200, 0.7333, 0.1200, 0.7333, 0.05, 0.0108),
('PR', 'Paraná', 0.1200, 0.7333, 0.1200, 0.7333, 0.05, 0.0108),
('RJ', 'Rio de Janeiro', 0.1200, 0.7333, 0.1200, 0.7333, 0.05, 0.0108),
('RS', 'Rio Grande do Sul', 0.1200, 0.7333, 0.1200, 0.7333, 0.05, 0.0108),
('SC', 'Santa Catarina', 0.1200, 0.7333, 0.1200, 0.7333, 0.05, 0.0108),

-- São Paulo (12% equip com base 73.33% OU 18% peças com base 100% - planilha diz SP Peças = 18%)
('SP', 'São Paulo', 0.1200, 0.7333, 0.1800, 1.0000, 0.05, 0.0108),
('DF', 'Distrito Federal', 0.1200, 0.7333, 0.1800, 1.0000, 0.05, 0.0108)
ON CONFLICT (uf) DO UPDATE SET 
    icms_equipamento = EXCLUDED.icms_equipamento,
    base_calc_equipamento = EXCLUDED.base_calc_equipamento,
    icms_pecas = EXCLUDED.icms_pecas,
    base_calc_pecas = EXCLUDED.base_calc_pecas;
