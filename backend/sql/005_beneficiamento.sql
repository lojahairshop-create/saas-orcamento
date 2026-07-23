-- 005_beneficiamento.sql
-- Adiciona a coluna beneficiamento na tabela public.orcamento_itens

ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS beneficiamento BOOLEAN DEFAULT FALSE NOT NULL;
