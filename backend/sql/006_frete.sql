-- Migration to add frete column to public.orcamentos
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete VARCHAR(50) DEFAULT 'FOB';
NOTIFY pgrst, 'reload schema';
