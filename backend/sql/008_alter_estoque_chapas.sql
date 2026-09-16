-- Enable pg_cron if not already enabled (Supabase supports this)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Alterar a tabela existente estoque_chapas
ALTER TABLE estoque_chapas 
    ADD COLUMN IF NOT EXISTS x NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS y NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS valor_contabil NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'consumido')),
    ADD COLUMN IF NOT EXISTS orcamento_id UUID REFERENCES orcamentos(id) ON DELETE SET NULL;

-- 2. RPC for Concurrency: Atomic reservation (apenas para tipo_registro = 'retalho')
CREATE OR REPLACE FUNCTION reservar_retalhos(p_retalho_ids UUID[], p_orcamento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INT;
    v_requested_count INT;
BEGIN
    v_requested_count := array_length(p_retalho_ids, 1);
    
    IF v_requested_count IS NULL OR v_requested_count = 0 THEN
        RETURN TRUE; -- Nothing to reserve
    END IF;

    -- Attempt to update only if ALL requested rows are available
    WITH updated AS (
        UPDATE estoque_chapas
        SET 
            status = 'reservado',
            orcamento_id = p_orcamento_id,
            updated_at = NOW()
        WHERE id = ANY(p_retalho_ids)
          AND status = 'disponivel'
          AND tipo_registro = 'retalho'
        RETURNING id
    )
    SELECT count(*) INTO v_updated_count FROM updated;

    IF v_updated_count = v_requested_count THEN
        RETURN TRUE;
    ELSE
        -- Rollback
        RAISE EXCEPTION 'Falha de concorrência: um ou mais retalhos já foram reservados.';
    END IF;
END;
$$;

-- 3. Function for Reversion Trigger
CREATE OR REPLACE FUNCTION trg_reverter_retalhos_orcamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se o orçamento mudou para 'Cancelado' ou 'Reprovado' (assumindo esses nomes, ajuste se os nomes do banco forem diferentes)
    IF NEW.status IN ('Cancelado', 'Reprovado') AND OLD.status NOT IN ('Cancelado', 'Reprovado') THEN
        -- Retalhos pré-existentes reservados voltam para o estoque
        UPDATE estoque_chapas
        SET status = 'disponivel',
            orcamento_id = NULL,
            updated_at = NOW()
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
          AND tipo_registro = 'retalho'
          AND valor_contabil > 0;
          
        -- Retalhos "novos" deletados
        DELETE FROM estoque_chapas
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
          AND tipo_registro = 'retalho'
          AND valor_contabil = 0;
    
    -- Se o orçamento mudou para 'Aprovado'
    ELSIF NEW.status = 'Aprovado' AND OLD.status != 'Aprovado' THEN
        -- Os retalhos antigos usados por ele são consumidos
        UPDATE estoque_chapas
        SET status = 'consumido',
            updated_at = NOW()
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
          AND tipo_registro = 'retalho'
          AND valor_contabil > 0;
          
        -- Os retalhos novos viram disponiveis
        UPDATE estoque_chapas
        SET status = 'disponivel',
            orcamento_id = NULL,
            updated_at = NOW()
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
          AND tipo_registro = 'retalho'
          AND valor_contabil = 0;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the Trigger on the 'orcamentos' table
DROP TRIGGER IF EXISTS reverter_retalhos_trigger ON orcamentos;
CREATE TRIGGER reverter_retalhos_trigger
AFTER UPDATE OF status ON orcamentos
FOR EACH ROW
EXECUTE FUNCTION trg_reverter_retalhos_orcamento();

-- 4. Create pg_cron job for timeout of abandoned reservations
SELECT cron.schedule(
    'liberar_retalhos_abandonados',
    '0 * * * *', -- Every hour
    $$
    UPDATE estoque_chapas
    SET status = 'disponivel',
        orcamento_id = NULL,
        updated_at = NOW()
    WHERE status = 'reservado'
      AND tipo_registro = 'retalho'
      AND updated_at < NOW() - INTERVAL '7 days'
      AND valor_contabil > 0;
      
    DELETE FROM estoque_chapas
    WHERE status = 'reservado'
      AND tipo_registro = 'retalho'
      AND updated_at < NOW() - INTERVAL '7 days'
      AND valor_contabil = 0;
    $$
);
