-- Enable pg_cron if not already enabled (Supabase supports this)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the estoque_retalhos table
CREATE TABLE IF NOT EXISTS estoque_retalhos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material VARCHAR(255) NOT NULL,
    espessura NUMERIC NOT NULL,
    largura NUMERIC NOT NULL,
    comprimento NUMERIC NOT NULL,
    x NUMERIC DEFAULT 0,
    y NUMERIC DEFAULT 0,
    valor_contabil NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'consumido')),
    orcamento_id UUID REFERENCES orcamentos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC for Concurrency: Atomic reservation
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
    -- By checking row count, we prevent partial reservations (Race Condition safe)
    WITH updated AS (
        UPDATE estoque_retalhos
        SET 
            status = 'reservado',
            orcamento_id = p_orcamento_id,
            updated_at = NOW()
        WHERE id = ANY(p_retalho_ids)
          AND status = 'disponivel'
        RETURNING id
    )
    SELECT count(*) INTO v_updated_count FROM updated;

    IF v_updated_count = v_requested_count THEN
        RETURN TRUE;
    ELSE
        -- Rollback the update if we didn't get all of them
        -- Because we are in plpgsql, raising an exception rolls back the transaction
        RAISE EXCEPTION 'Falha de concorrência: um ou mais retalhos já foram reservados.';
    END IF;
END;
$$;

-- Function for Reversion Trigger
CREATE OR REPLACE FUNCTION trg_reverter_retalhos_orcamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se o orçamento mudou para 'Cancelado' ou 'Reprovado' (assumindo esses nomes)
    IF NEW.status IN ('Cancelado', 'Reprovado') AND OLD.status NOT IN ('Cancelado', 'Reprovado') THEN
        -- Retalhos pré-existentes que estavam reservados voltam para o estoque
        UPDATE estoque_retalhos
        SET status = 'disponivel',
            orcamento_id = NULL,
            updated_at = NOW()
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
          AND valor_contabil > 0; -- Identifica retalhos "antigos" que têm valor.
          
        -- Retalhos "novos" (sobras desse orçamento, recém criadas com valor=0 até aprovação)
        -- Ou podemos deletá-los diretamente se gerados pelo orçamento e não efetivados.
        -- Para simplificar: deleta os retalhos que foram gerados por esse orçamento e nunca consumidos.
        DELETE FROM estoque_retalhos
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
          AND valor_contabil = 0;
    
    -- Se o orçamento mudou para 'Aprovado'
    ELSIF NEW.status = 'Aprovado' AND OLD.status != 'Aprovado' THEN
        -- Os retalhos antigos usados por ele são consumidos de vez
        UPDATE estoque_retalhos
        SET status = 'consumido',
            updated_at = NOW()
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
          AND valor_contabil > 0;
          
        -- Os retalhos novos gerados por ele (as sobras) ficam disponíveis para outros
        UPDATE estoque_retalhos
        SET status = 'disponivel',
            orcamento_id = NULL,
            updated_at = NOW()
        WHERE orcamento_id = NEW.id
          AND status = 'reservado'
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

-- Create pg_cron job for timeout of abandoned reservations
-- Runs every hour: restores reservations older than 7 days if the associated orçamento is not active.
-- Orçamento statuses: "Pendente", "Rascunho", etc.
SELECT cron.schedule(
    'liberar_retalhos_abandonados',
    '0 * * * *', -- Every hour
    $$
    UPDATE estoque_retalhos
    SET status = 'disponivel',
        orcamento_id = NULL,
        updated_at = NOW()
    WHERE status = 'reservado'
      AND updated_at < NOW() - INTERVAL '7 days'
      AND valor_contabil > 0;
      
    -- Delete abandoned new scraps
    DELETE FROM estoque_retalhos
    WHERE status = 'reservado'
      AND updated_at < NOW() - INTERVAL '7 days'
      AND valor_contabil = 0;
    $$
);
