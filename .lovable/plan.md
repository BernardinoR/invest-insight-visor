

# Plano: Botão "Gravar Classificação" no Modal de Edição

## Objetivo
Adicionar um botão ao lado do campo "Classe do Ativo" no modal de edição de ativos que salva a classificação na tabela `RAG_Processador` do Supabase. Quando o ativo já existir na tabela com outra classe, exibir um dialog de confirmação.

## Alterações em `src/pages/DataManagement.tsx`

### 1. Novo state para o dialog de conflito
```typescript
const [ragConflictDialog, setRagConflictDialog] = useState<{
  open: boolean;
  ativo: string;
  classeNova: string;
  classeExistente: string;
} | null>(null);
```

### 2. Função `handleSaveClassificacao`
- Recebe o nome do ativo e a classe selecionada
- Consulta `RAG_Processador` com `.eq('Ativo', ativo)`
- Se **não existir**: insere `{ Ativo, Classificacao }` e mostra toast de sucesso
- Se **existir com a mesma classe**: mostra toast informando que já está gravado
- Se **existir com classe diferente**: abre dialog de conflito com opções:
  - "Manter atual" (fecha sem alterar)
  - "Atualizar classificação" — faz update no registro existente E atualiza todos os registros de `DadosPerformance` com o mesmo `Ativo` para a nova classe

### 3. Botão na UI (após o Select de Classe do Ativo, linha ~5382)
Adicionar um botão compacto com ícone de "salvar/gravar" logo abaixo do Select, no mesmo grid cell. Estilo:
- Botão `variant="outline"` com tamanho `sm`, largura total
- Ícone `BookmarkPlus` (ou `Save`) + texto "Gravar Classificação"
- Desabilitado se `Ativo` ou `Classe do ativo` estiverem vazios
- Tooltip explicando: "Salvar esta classificação para uso automático futuro"

### 4. Dialog de conflito de classificação
Um `AlertDialog` separado que aparece quando há conflito:
- Título: "Classificação diferente encontrada"
- Descrição: "O ativo X está gravado como Y. Deseja atualizar para Z?"
- Checkbox opcional: "Atualizar também todos os registros existentes com este ativo"
- Botões: "Manter atual" / "Atualizar classificação"

### 5. Lógica de update em massa (quando confirmado)
```typescript
// Update RAG_Processador
await supabase.from('RAG_Processador')
  .update({ Classificacao: classeNova })
  .eq('Ativo', ativo);

// Update todos DadosPerformance com mesmo Ativo
await supabase.from('DadosPerformance')
  .update({ "Classe do ativo": classeNova })
  .eq('Ativo', ativo);

// Refresh data
await fetchData();
```

## Resultado Visual
O campo "Classe do Ativo" no modal ficará com o Select seguido de um botão estilizado "Gravar Classificação" que indica ao usuário a possibilidade de persistir a classificação para uso futuro pelo outro software.

