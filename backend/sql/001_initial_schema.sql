-- 001_initial_schema.sql
-- Schema inicial para o SaaS de Orçamentos Metalúrgicos

-- Habilitar a extensão uuid-ossp se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfil de Usuários (estende a auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Configurações Globais (Singleton)
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icms_padrao DECIMAL(6,4) DEFAULT 0.1800 NOT NULL,
    ipi_padrao DECIMAL(6,4) DEFAULT 0.0500 NOT NULL,
    pis_padrao DECIMAL(8,6) DEFAULT 0.006500 NOT NULL,
    cofins_padrao DECIMAL(6,4) DEFAULT 0.0300 NOT NULL,
    csll_padrao DECIMAL(6,4) DEFAULT 0.0108 NOT NULL,
    irpj_padrao DECIMAL(6,4) DEFAULT 0.0120 NOT NULL,
    comissao_padrao DECIMAL(6,4) DEFAULT 0.0300 NOT NULL,
    base_calculo_padrao DECIMAL(6,4) DEFAULT 1.0000 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Impostos por Estado
CREATE TABLE IF NOT EXISTS public.impostos_estados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uf VARCHAR(3) UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    icms_equipamento DECIMAL(6,4) NOT NULL,
    base_calc_equipamento DECIMAL(6,4) NOT NULL,
    icms_pecas DECIMAL(6,4) NOT NULL,
    base_calc_pecas DECIMAL(6,4) NOT NULL,
    ipi_padrao DECIMAL(6,4) DEFAULT 0.0500 NOT NULL,
    csll DECIMAL(6,4) DEFAULT 0.0108 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Materiais
CREATE TABLE IF NOT EXISTS public.materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL, -- INOX, AÇO CARBONO, ALUMÍNIO, OUTROS
    tipo TEXT NOT NULL, -- A 304, S 1020, etc.
    preco_kg DECIMAL(10,2) NOT NULL,
    densidade DECIMAL(6,3) NOT NULL, -- em g/cm³ ou kg/(m²·mm) (aço=7.86, alumínio=2.71)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Parâmetros de Corte Laser
CREATE TABLE IF NOT EXISTS public.parametros_laser (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material TEXT NOT NULL, -- INOX, AÇO CARBONO, ALUMÍNIO
    espessura DECIMAL(6,2) NOT NULL, -- mm
    avanco DECIMAL(8,2) NOT NULL, -- mm/min
    peck DECIMAL(6,2) NOT NULL, -- segundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(material, espessura)
);

-- 6. Tabela de Custos de Operação (Custo/Hora)
CREATE TABLE IF NOT EXISTS public.custos_operacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operacao TEXT UNIQUE NOT NULL, -- CORTE LASER, SET-UP, DOBRA, etc.
    custo_hora DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Medidas de Chapas Padrão
CREATE TABLE IF NOT EXISTS public.medidas_chapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    largura DECIMAL(8,2) NOT NULL, -- mm
    comprimento DECIMAL(8,2) NOT NULL, -- mm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Orçamentos (Cabeçalho)
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'rascunho'::text NOT NULL,
    cliente_nome TEXT NOT NULL,
    cliente_email TEXT,
    cliente_telefone TEXT,
    cliente_cnpj TEXT,
    cliente_endereco TEXT,
    cliente_cidade TEXT,
    cliente_estado VARCHAR(3) NOT NULL,
    tipo_venda TEXT DEFAULT 'pecas'::text NOT NULL, -- pecas, equipamento
    ipi_rate DECIMAL(6,4) DEFAULT 0.0500 NOT NULL,
    taxa_comissao DECIMAL(6,4) DEFAULT 0.0300 NOT NULL,
    condicao_pagamento TEXT,
    prazo_entrega TEXT,
    validade INT DEFAULT 30 NOT NULL,
    observacoes TEXT,
    
    -- Totais Consolidados
    total_preco DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    total_nf DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    total_tributos DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    total_comissao DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    total_peso DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    total_custo_mp DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    total_fabricacao DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Itens de Orçamentos
CREATE TABLE IF NOT EXISTS public.orcamento_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
    descricao TEXT NOT NULL,
    material TEXT NOT NULL,
    tipo_material TEXT,
    espessura DECIMAL(6,2) NOT NULL,
    largura DECIMAL(8,2) NOT NULL,
    comprimento DECIMAL(8,2) NOT NULL,
    perimetro DECIMAL(10,2) NOT NULL,
    num_entradas INT DEFAULT 1 NOT NULL,
    quantidade INT DEFAULT 1 NOT NULL,
    chapa_l DECIMAL(8,2) DEFAULT 1200.00 NOT NULL,
    chapa_c DECIMAL(8,2) DEFAULT 2400.00 NOT NULL,
    preco_kg DECIMAL(10,2) NOT NULL,
    margem_lucro DECIMAL(6,4) NOT NULL,
    beneficiamento BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Metadados calculados
    velocidade DECIMAL(8,2) NOT NULL,
    peck DECIMAL(6,2) NOT NULL,
    tempo_corte_laser DECIMAL(10,4) NOT NULL,
    area DECIMAL(10,6) NOT NULL,
    peso_unitario DECIMAL(10,4) NOT NULL,
    peso_chapa DECIMAL(10,4) NOT NULL,
    pecas_por_chapa INT NOT NULL,
    qtd_chapas INT NOT NULL,
    sobra INT NOT NULL,
    retalho DECIMAL(10,4) NOT NULL,
    peso_total DECIMAL(10,4) NOT NULL,
    custo_mp DECIMAL(12,4) NOT NULL,
    total_fabricacao DECIMAL(12,4) NOT NULL,
    custo_basico DECIMAL(12,4) NOT NULL,
    valor_venda_sem_imp DECIMAL(12,4) NOT NULL,
    preco_unitario_com_imp DECIMAL(12,4) NOT NULL,
    preco_total DECIMAL(12,4) NOT NULL,
    icms_valor DECIMAL(12,4) NOT NULL,
    ipi_valor DECIMAL(12,4) NOT NULL,
    pis_valor DECIMAL(12,4) NOT NULL,
    cofins_valor DECIMAL(12,4) NOT NULL,
    total_tributos DECIMAL(12,4) NOT NULL,
    total_nf DECIMAL(12,4) NOT NULL,
    comissao DECIMAL(12,4) NOT NULL,
    custo_extra DECIMAL(12,4) DEFAULT 0.0000 NOT NULL,
    tempo_corte DECIMAL(10,4) DEFAULT 0.0000 NOT NULL,
    observacoes TEXT,
    
    -- Operações e tempos em formato JSON para flexibilidade
    operacoes JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Habilitar RLS nas tabelas (Segurança do Supabase)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
-- Tabelas de config podem ser RLS mas lidas por todos os autenticados, editadas apenas por admins
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impostos_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_laser ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_operacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medidas_chapas ENABLE ROW LEVEL SECURITY;

-- Exemplo de Políticas RLS para Orçamentos:
-- Apenas o próprio usuário pode ver e editar seus orçamentos
DROP POLICY IF EXISTS "Permitir leitura de orçamentos próprios" ON public.orcamentos;
CREATE POLICY "Permitir leitura de orçamentos próprios" ON public.orcamentos
    FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Permitir inserção de orçamentos próprios" ON public.orcamentos;
CREATE POLICY "Permitir inserção de orçamentos próprios" ON public.orcamentos
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Permitir update de orçamentos próprios" ON public.orcamentos;
CREATE POLICY "Permitir update de orçamentos próprios" ON public.orcamentos
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Permitir delete de orçamentos próprios" ON public.orcamentos;
CREATE POLICY "Permitir delete de orçamentos próprios" ON public.orcamentos
    FOR DELETE USING (auth.uid() = created_by);

-- Políticas RLS para Itens (cascateadas pelos orçamentos visíveis)
DROP POLICY IF EXISTS "Permitir leitura de itens de orçamentos visíveis" ON public.orcamento_itens;
CREATE POLICY "Permitir leitura de itens de orçamentos visíveis" ON public.orcamento_itens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orcamentos 
            WHERE public.orcamentos.id = public.orcamento_itens.orcamento_id 
              AND public.orcamentos.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Permitir inserção de itens" ON public.orcamento_itens;
CREATE POLICY "Permitir inserção de itens" ON public.orcamento_itens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orcamentos 
            WHERE public.orcamentos.id = public.orcamento_itens.orcamento_id 
              AND public.orcamentos.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Permitir delete de itens" ON public.orcamento_itens;
CREATE POLICY "Permitir delete de itens" ON public.orcamento_itens
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.orcamentos 
            WHERE public.orcamentos.id = public.orcamento_itens.orcamento_id 
              AND public.orcamentos.created_by = auth.uid()
        )
    );

-- Políticas RLS de Leitura Geral para Tabelas Auxiliares de Configuração
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.configuracoes;
CREATE POLICY "Permitir leitura para autenticados" ON public.configuracoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.impostos_estados;
CREATE POLICY "Permitir leitura para autenticados" ON public.impostos_estados FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.materiais;
CREATE POLICY "Permitir leitura para autenticados" ON public.materiais FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.parametros_laser;
CREATE POLICY "Permitir leitura para autenticados" ON public.parametros_laser FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.custos_operacao;
CREATE POLICY "Permitir leitura para autenticados" ON public.custos_operacao FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.medidas_chapas;
CREATE POLICY "Permitir leitura para autenticados" ON public.medidas_chapas FOR SELECT TO authenticated USING (true);

-- Gatilho para atualizar a profiles automaticamente ao criar um auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nome)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nome', 'Novo Usuário'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
