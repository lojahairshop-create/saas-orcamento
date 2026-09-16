-- 010_orcamento_nesting.sql
-- Adiciona a coluna nesting_json para persistir a geometria do corte
-- do orcamento de forma observável no frontend.

ALTER TABLE orcamentos
ADD COLUMN IF NOT EXISTS nesting_json JSONB;
