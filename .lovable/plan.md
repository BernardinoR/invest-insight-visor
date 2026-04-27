# Ajustador de Ativos — Cadastro de Regras + Indicador Visual

## Escopo

- **Aqui (Lovable)**: interface para CRUD das regras + indicador visual nos ativos que casam com regras existentes.
- **Fora (n8n)**: aplicação efetiva das regras no pipeline de ingestão.

Sem triggers no Postgres, sem aplicação retroativa via SQL.

## 1. Migration: tabela `asset_overrides`

```sql
CREATE TABLE public.asset_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente text NOT NULL,
  instituicao text NOT NULL,
  ativo_original text NOT NULL,
  -- campos a sobrescrever (todos opcionais)
  ativo_novo text,
  classe_ativo text,
  emissor text,
  taxa text,
  vencimento date,
  liquidez text,
  -- metadados
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_overrides_unique_key UNIQUE (cliente, instituicao, ativo_original)
);

ALTER TABLE public.asset_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on asset_overrides" ON public.asset_overrides
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_asset_overrides_updated_at
  BEFORE UPDATE ON public.asset_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_asset_overrides_lookup
  ON public.asset_overrides (cliente, instituicao, ativo_original)
  WHERE ativo = true;
```

> O n8n vai consultar essa tabela durante a ingestão e aplicar os campos não-nulos sobre o registro recebido.

## 2. UI — Nova aba "Ajustes de Ativos" em `DataManagement.tsx`

Adicionar uma aba ao lado de "Consolidado" / "Ativos" / etc:

- **Tabela** com colunas: Cliente · Instituição · Ativo Original → Ativo Novo · Classe · Emissor · Taxa · Vencimento · Liquidez · Ativa? · Ações (editar/excluir/desativar).
- **Filtros**: por cliente, instituição, busca textual no ativo original.
- **Botão "+ Nova regra"** abre dialog com:
  - Cliente (select dos clientes existentes)
  - Instituição (select)
  - Ativo Original (text — exatamente como vem do extrato)
  - Bloco "Sobrescrever para": Ativo Novo, Classe (select), Emissor, Taxa (com BRNumberInput), Vencimento, Liquidez
  - Observação (textarea opcional)
  - Switch "Regra ativa"
- **Editar** abre o mesmo dialog pré-preenchido.
- **Excluir** com confirmação.

## 3. Botão "Salvar como Ajuste" no modal de edição de ativo

No modal atual de edição de ativo detalhado, adicionar **um único botão** "Salvar como ajuste de ativo" (ícone `Wand2` ou similar) no rodapé do modal, separado dos botões "Salvar Classe" / "Salvar Liquidez" já existentes (que permanecem para o RAG global).

Ao clicar:
- Abre um dialog de confirmação mostrando os campos atuais do ativo e perguntando quais devem virar parte da regra (checkboxes pré-marcados nos campos preenchidos).
- Chave da regra: `cliente = Nome`, `instituicao = Instituicao`, `ativo_original = Ativo` original do registro (antes de qualquer edição na sessão).
- Se já existir regra com essa chave, mostra dialog de conflito (estilo `ragLiquidezConflictDialog`) com opção "Sobrescrever regra existente".

## 4. Indicador visual nos ativos ajustados

Na tabela de **ativos detalhados** (`DataManagement.tsx`):

- Carregar o conjunto de regras ativas uma vez (`useQuery` em `asset_overrides` filtrado por cliente atual) e indexar por `${instituicao}|${ativo_original}`.
- Para cada linha, verificar:
  - **Match exato** (`ativo_original` bate com o nome de `Ativo` original recebido — guardar o nome original em algum lugar não é trivial; vamos casar pelo `Ativo` atual mesmo) → badge azul **"Ajustado"** com ícone `Wand2` ao lado do nome do ativo.
  - **Tooltip** mostrando: "Esta linha tem uma regra de ajuste cadastrada (Cliente + Instituição + Ativo). Clique para editar a regra."
  - Click no badge → abre o dialog de edição da regra na aba "Ajustes de Ativos".

> Observação: como o n8n já vai ter aplicado a regra antes do dado chegar no Supabase, o `Ativo` na tabela tipicamente já será o `ativo_novo`. Por isso o match precisa ser feito também por `ativo_novo`, não só por `ativo_original`. A chave de lookup vira: `${instituicao}|${ativo_novo ?? ativo_original}`.

## 5. Indicador no consolidado (opcional, leve)

No popover de verificação do consolidado, adicionar uma linha informativa:
- "🪄 N ativo(s) com regra de ajuste aplicada" (apenas informativo, sem alerta).

## Arquivos afetados

- 1 migration (criação de `asset_overrides`).
- `src/pages/DataManagement.tsx` — nova aba, dialog de CRUD, botão no modal, badge nas linhas, query das regras.
- `src/integrations/supabase/types.ts` — regenerado automaticamente após migration.

Sem mudanças em edge functions, sem mexer no RAG_Processador, sem trigger.

## Confirmação esperada

Aplicação das regras é responsabilidade do n8n; aqui é só CRUD + visibilidade.
