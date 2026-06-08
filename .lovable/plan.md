## Adicionar liquidez em dias corridos e dias úteis

Hoje existe apenas uma coluna `liquidez` (texto, formato `D+N`) em `DadosPerformance` e `RAG_Processador`. Vamos passar a ter dois campos — um para **dias corridos** e outro para **dias úteis** — para refletir como fundos costumam divulgar liquidez (D+N corridos / D+N úteis, podendo ter um ou os dois).

### 1. Banco (migração)

Em `DadosPerformance`:
- Adicionar `liquidez_corridos text` e `liquidez_uteis text`.
- Backfill: `liquidez_corridos = liquidez` (valor atual tratado como dias corridos), `liquidez_uteis` fica null.
- Manter a coluna `liquidez` por compatibilidade (sem remover agora).

Em `RAG_Processador`:
- Adicionar `Liquidez_Corridos text` e `Liquidez_Uteis text`.
- Backfill: `Liquidez_Corridos = Liquidez`.

Atualizar `calculate_verification(text, text)`:
- Trocar a contagem de `missing_liquidity` para considerar **sem vencimento E sem liquidez_corridos E sem liquidez_uteis** (regra escolhida: ambos em branco e sem vencimento).
- Rodar `SELECT public.calculate_verification(NULL,NULL)` ao final para recomputar `verification_results`.

### 2. UI — `src/pages/DataManagement.tsx`

**Tipo / estado do `editingItem`** (linhas 158, 187, 1086): adicionar `liquidez_corridos` e `liquidez_uteis` em vez do `liquidez` único. Carregar do registro ao abrir o modal.

**Modal de edição (seção "Condições", layout 4-seções)**: substituir o input único de Liquidez por dois inputs lado a lado:
- `Liquidez (dias corridos)` — placeholder `D+30`, formato numbers-only com prefixo `D+` (mesmo componente já usado hoje).
- `Liquidez (dias úteis)` — idem, placeholder `D+30`.
Botão "Gravar no RAG" passa a gravar os dois campos (`Liquidez_Corridos` e `Liquidez_Uteis`) no `RAG_Processador`.

**Diálogo de conflito RAG** (`ragLiquidezConflictDialog`): exibir conflito separado por tipo (mostrando o que mudou em corridos e/ou úteis). Mesma opção "atualizar registros existentes".

**Preencher liquidez via RAG (bulk)** (`handleBulkFillLiquidezFromRAG`): preencher os dois campos a partir de `Liquidez_Corridos` e `Liquidez_Uteis` do RAG; só atualiza um campo se ele estiver vazio no item.

**Bulk edit** (modal de edição em massa): adicionar os dois campos; aplica regra "pré-preenche só se todos os selecionados compartilham o mesmo valor".

**Tabela detalhada** (linha 5324 e arredores):
- Coluna única `Liquidez` exibindo: `D+30c / D+20u`, ou só um lado quando o outro for vazio, `-` quando ambos vazios. (Mantém uma coluna só para não estourar largura.)
- Visibilidade da coluna continua controlada por `visibleColumnsDetalhados`.

**Alerta "sem liquidez"** (linhas 2328, 2491, 2598, 2630, 4774, 5636): trocar a checagem `!liquidez` por `!liquidez_corridos && !liquidez_uteis`. Mensagem do tooltip atualizada para "Sem vencimento e sem liquidez (corridos/úteis)".

**Tooltip da bolinha de verificação** (linhas 4607-4616): atualizar texto.

### 3. CSV import

`handleImportCSV` aceita as colunas novas `liquidez_corridos` e `liquidez_uteis`. Se vier só a antiga `liquidez`, mapeia para `liquidez_corridos` (compatibilidade).

### 4. Validação

- Editar um ativo, preencher só corridos → bolinha some.
- Preencher só úteis → bolinha some.
- Limpar os dois e remover vencimento → bolinha aparece, contador de `missing_liquidity` bate com o cálculo SQL.
- Bulk fill RAG preenche os campos corretos.
- Tabela mostra `D+30c / D+20u` corretamente.

### Fora de escopo

- Remoção da coluna `liquidez` antiga (mantida para não quebrar n8n / extratos legados; pode ser dropada num passo futuro).
- Mudanças em outros componentes (Dashboard, MaturityDialog) — só leem `Vencimento`, não dependem de liquidez.
