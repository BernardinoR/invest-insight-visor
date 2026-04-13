

# Plano: Corrigir input de Nova Posição que volta a zero

## Problema
Os campos "Nova Posição" (tanto na tabela multi-ativos quanto no ativo único) usam `type="number"` com `value={a.novaPosicao}` vinculado diretamente ao estado numérico. Quando o usuário apaga o campo para digitar um novo valor, `parseFloat("") || 0` retorna `0`, e o input volta imediatamente para zero. Colar valores também falha porque o `parseFloat` com `|| 0` descarta entrada parcial.

## Solução
Usar a mesma abordagem dos inputs de resgate: `type="text"` com formato brasileiro, e estado de string intermediário para permitir digitação fluida. O parse para número acontece no `onBlur` ou quando o valor é válido.

### Alterações em `src/components/RolloverDialog.tsx`

**1. Input multi-ativos (linhas ~556-562):**
- Trocar `type="number"` para `type="text"`
- Permitir digitação livre com `value={e.target.value}` controlado localmente
- No `onBlur`, fazer o parse BR (`replace(/\./g, '').replace(',', '.')`) e chamar `handleUpdateAtivo(i, 'novaPosicao', valorParsed)`
- Exibir valor formatado em pt-BR quando não está em foco

**2. Input ativo único (linhas ~604-609):**
- Mesma mudança: `type="text"`, parse BR no `onBlur`

**3. Lógica `handleUpdateAtivo` para `novaPosicao` (linhas ~216-223):**
- Remover `parseFloat(valor) || 0` — aceitar o valor numérico já parseado (pode ser 0 legitimamente, sem o fallback `|| 0`)
- Usar `const num = typeof valor === 'number' ? valor : parseFloat(valor); if (isNaN(num)) return;`

**4. Abordagem de componente inline:**
Para evitar criar estados separados para cada célula, usar um mini-componente `BRNumberInput` que encapsula o estado de string local e faz parse/format no focus/blur. Isso mantém o código limpo.

