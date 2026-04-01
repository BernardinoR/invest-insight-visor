
Objetivo: corrigir a ordenação padrão ao abrir **Gerenciar Dados** para que a competência mais recente apareça primeiro (ex.: `02/2026` antes de `12/2025`).

Diagnóstico confirmado:
- A conversão de competência para data já está correta (`parseCompetenciaToDate`).
- O problema persiste no “default” porque a tabela só aplica ordenação cronológica quando `sortConfig` está ativo.
- No carregamento inicial, `sortConfig` fica `null`, então a tela respeita a ordem original da query (lexicográfica de string `MM/YYYY`), gerando a lista “bagunçada”.

Plano de implementação (1 arquivo: `src/pages/DataManagement.tsx`):
1. Definir um sort padrão de competência
- Criar constante local:
  - `DEFAULT_COMPETENCIA_SORT = { field: 'Competencia', direction: 'desc' }`.

2. Aplicar esse padrão sempre que não houver ordenação manual
- Em `filteredConsolidadoData`, trocar:
  - `applySortingGeneric(data, sortConfig)`
  por:
  - `applySortingGeneric(data, sortConfig ?? DEFAULT_COMPETENCIA_SORT)`.
- Fazer o mesmo em `filteredDadosData`.

3. Manter comportamento atual para ordenação manual
- Quando o usuário escolher outra coluna/direção, continua valendo `sortConfig`.
- Se “limpar” ordenação (voltar para `null`), a tela retorna automaticamente para o padrão correto por competência mais recente.

4. Validação funcional
- Abrir `/data-management/Adriana de Farias` e validar ordem inicial (sem clicar em ordenar):
  - `02/2026` acima de `12/2025`, `11/2025`, etc.
- Trocar abas (Consolidado/Ativos) e confirmar que o padrão continua correto.
- Aplicar ordenação manual em outra coluna e depois remover para validar retorno ao default cronológico.

Detalhes técnicos:
- Não envolve migração de banco.
- Não altera schema/tabelas.
- Mudança isolada em memoized filters/sorting, de baixo risco e impacto controlado.
