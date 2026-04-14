

# Plano: Split de Conta com Configuração Salva

## Resumo
Criar um dialog "Separar Conta" que permite dividir ativos de uma instituição em sub-contas por percentual, e salvar essa configuração no banco para reutilizar em competências futuras.

## 1. Migration: Nova tabela `account_split_configs`

```sql
CREATE TABLE public.account_split_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cliente text NOT NULL,
  instituicao text NOT NULL,
  nome_conta_origem text NOT NULL DEFAULT '',
  nome_conta_destino text NOT NULL,
  percentual_padrao numeric DEFAULT 0,
  ativos_especificos jsonb DEFAULT '[]',
  ativo boolean DEFAULT true
);

ALTER TABLE public.account_split_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on account_split_configs" ON public.account_split_configs
  FOR ALL TO public USING (true) WITH CHECK (true);
```

O campo `ativos_especificos` armazena regras por ativo: `[{"ativo": "CDB X", "percentual": 100}, {"ativo": "Fundo ABC", "percentual": 30}]`.

## 2. Novo componente: `src/components/SplitAccountDialog.tsx`

Visual idêntico ao `RolloverDialog`:
- Dialog com `max-w-4xl`, badges no header (Instituição, Cliente, Competência)
- Input para nome da sub-conta destino
- Tabela de ativos com colunas: Checkbox, Ativo, Posição Atual, % (input), Valor Transferido (calculado)
- Resumo: Total conta original / Total sub-conta
- Botões: Cancelar, Salvar Config (salva regra sem aplicar), Aplicar (salva regra + executa split)
- Se já existe config salva para essa instituição/cliente, pré-carrega os valores

**Lógica ao aplicar:**
- Ativo com 100%: `UPDATE DadosPerformance SET nomeConta = 'X' WHERE id = Y`
- Ativo parcial (ex: 30%): reduz Posição original para 70%, INSERT novo registro com 30% e `nomeConta` destino
- INSERT novo `ConsolidadoPerformance` para sub-conta com `Patrimonio Final` = soma transferida, demais campos zerados
- UPDATE consolidado original: `Patrimonio Final -= totalTransferido`

## 3. Alterações em `src/pages/DataManagement.tsx`

- Importar `SplitAccountDialog` e ícone `Scissors`
- Adicionar estados: `splitConsolidado`, `isSplitOpen`
- Adicionar botão Scissors ao lado do FastForward na linha de ações do consolidado
- Renderizar `<SplitAccountDialog>` com props similares ao RolloverDialog

## 4. Fluxo de configuração salva

- Ao abrir o dialog, busca config existente em `account_split_configs` para o mesmo cliente/instituição
- Se encontrar, pré-popula: nome da sub-conta, checkboxes e percentuais dos ativos
- Botão "Salvar Config" faz upsert na tabela (sem executar o split)
- Botão "Aplicar" salva a config E executa as operações de split
- Para editar uma config existente, basta abrir o dialog novamente — os valores carregam automaticamente

## Sem migração adicional
O schema de `DadosPerformance` e `ConsolidadoPerformance` já suporta `nomeConta`.

