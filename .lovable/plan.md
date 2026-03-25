

# Plano: Filtrar ativos por nomeConta ao expandir instituição

## Problema

Quando o usuário clica na seta (ArrowRight) de uma linha consolidada para ver os ativos detalhados, o código aplica filtros de `Competencia` e `Instituicao`, mas **não filtra por `nomeConta`**. Isso faz com que ativos de contas diferentes da mesma instituição e competência sejam misturados.

**Código atual (linha 4029-4033):**
```typescript
setSelectedConsolidado(item);
setActiveTab('detalhados');
setSelectedCompetencias([item.Competencia]);
setSelectedInstituicoes([item.Instituicao]);
// nomeConta NÃO é filtrado!
```

## Solução

1. **Criar estado `selectedNomesConta`** — novo state `string[]` para filtrar por nome de conta
2. **Setar o filtro ao clicar na seta** — adicionar `setSelectedNomesConta([item.nomeConta || ''])` no onClick
3. **Aplicar o filtro em `filteredDadosData`** — adicionar lógica de filtragem por `nomeConta`
4. **Limpar o filtro** quando apropriado (ao limpar filtros, ao mudar de aba)

### Alterações no arquivo `src/pages/DataManagement.tsx`:

**1. Novo state (perto da linha 564):**
```typescript
const [selectedNomesConta, setSelectedNomesConta] = useState<string[]>([]);
```

**2. onClick da seta (linha 4030-4033) — adicionar:**
```typescript
setSelectedNomesConta(item.nomeConta ? [item.nomeConta] : []);
```

**3. `filteredDadosData` (linha 2003-2011) — adicionar após filtro de instituições:**
```typescript
if (selectedNomesConta.length > 0) {
  data = data.filter(item => selectedNomesConta.includes(item.nomeConta || ''));
}
```

**4. Limpar filtro** — adicionar `setSelectedNomesConta([])` nos mesmos locais onde `selectedInstituicoes` é limpo:
- Linha 3355-3357 (ao mudar de aba)
- Linha 4182-4184 (botão de limpar filtros)

**5. Adicionar `selectedNomesConta` às dependências** dos `useMemo` relevantes (`filteredDadosData`, contadores, etc.) e ao `useEffect` de reset de página.

**6. Mostrar o filtro ativo** — exibir badge/chip do nome da conta quando `selectedNomesConta.length > 0` para o usuário saber que está filtrando por conta.

