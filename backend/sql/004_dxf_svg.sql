-- 004_dxf_svg.sql
-- Adiciona a coluna vetor_svg na tabela public.orcamento_itens

ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS vetor_svg TEXT;
