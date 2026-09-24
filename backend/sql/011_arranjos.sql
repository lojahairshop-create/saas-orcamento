-- Fase 1: Tabelas de Arranjos
-- Esta migration cria o modelo paralelo para agrupar orcamento_itens em arranjos (chapa arranjada).
-- Não altera as estruturas clássicas.

CREATE TABLE arranjos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    material TEXT NOT NULL,
    espessura NUMERIC NOT NULL,
    tipo_montagem TEXT NOT NULL CHECK (tipo_montagem IN ('manual', 'automatico')),
    modo_cobranca TEXT NOT NULL CHECK (modo_cobranca IN ('chapa_arranjada', 'individual')),
    material_usado_id UUID REFERENCES estoque_chapas(id) ON DELETE SET NULL,
    largura_usada NUMERIC NOT NULL,
    comprimento_usado NUMERIC NOT NULL,
    nesting_json JSONB,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'confirmado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE arranjo_itens (
    arranjo_id UUID REFERENCES arranjos(id) ON DELETE CASCADE,
    orcamento_item_id UUID REFERENCES orcamento_itens(id) ON DELETE CASCADE,
    PRIMARY KEY (arranjo_id, orcamento_item_id)
);

-- Habilitar RLS
ALTER TABLE arranjos ENABLE ROW LEVEL SECURITY;
ALTER TABLE arranjo_itens ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver seus próprios arranjos"
    ON arranjos FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem inserir arranjos"
    ON arranjos FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem atualizar seus próprios arranjos"
    ON arranjos FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem deletar seus próprios arranjos"
    ON arranjos FOR DELETE
    USING (auth.uid() = created_by);

-- Políticas para arranjo_itens baseadas no arranjo pai
CREATE POLICY "Usuários podem ver itens de arranjo"
    ON arranjo_itens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM arranjos a 
            WHERE a.id = arranjo_itens.arranjo_id 
            AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "Usuários podem gerenciar itens de arranjo"
    ON arranjo_itens FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM arranjos a 
            WHERE a.id = arranjo_itens.arranjo_id 
            AND a.created_by = auth.uid()
        )
    );

-- Trigger para updated_at no arranjos
CREATE TRIGGER update_arranjos_modtime
BEFORE UPDATE ON arranjos
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
