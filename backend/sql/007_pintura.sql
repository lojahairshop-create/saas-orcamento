-- Migration to add preco_pintura_kg column to public.orcamento_itens
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS preco_pintura_kg NUMERIC(10,2) DEFAULT 0.00;
NOTIFY pgrst, 'reload schema';
