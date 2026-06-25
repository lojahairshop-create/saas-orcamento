-- 003_estoque_chapas.sql
-- Tabela para controle de estoque de chapas (inteiras e retalhos)

CREATE TABLE IF NOT EXISTS public.estoque_chapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material TEXT NOT NULL, -- INOX, AÇO CARBONO, ALUMÍNIO
    tipo_material TEXT, -- A 304, S 1020, etc.
    espessura DECIMAL(6,2) NOT NULL, -- em mm
    largura DECIMAL(8,2) NOT NULL, -- em mm
    comprimento DECIMAL(8,2) NOT NULL, -- em mm
    quantidade INT DEFAULT 1 NOT NULL,
    tipo_registro TEXT NOT NULL DEFAULT 'inteira', -- 'inteira' ou 'retalho'
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alterar a tabela public.orcamento_itens para incluir o campo origem_material
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS origem_material TEXT DEFAULT 'chapa_inteira' NOT NULL;

-- Habilitar RLS
ALTER TABLE public.estoque_chapas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura de estoque para autenticados" ON public.estoque_chapas;
CREATE POLICY "Permitir leitura de estoque para autenticados" ON public.estoque_chapas
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir escrita de estoque para autenticados" ON public.estoque_chapas;
CREATE POLICY "Permitir escrita de estoque para autenticados" ON public.estoque_chapas
    FOR ALL TO authenticated USING (true);
