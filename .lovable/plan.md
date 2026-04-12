

# Plano: Alinhar ícones na coluna Ações dos consolidados

## Problema
O primeiro botão (ver ativos detalhados) usa `px-2` com texto dinâmico (contagem de ativos), enquanto os demais usam `w-8 p-0` fixo. Isso faz os ícones ficarem desalinhados entre linhas.

## Solução
Padronizar todos os botões de ação para `h-8 w-8 p-0` e usar `flex items-center justify-center` no container. O botão de "ver ativos" perderá o texto da contagem inline e ficará apenas com o ícone (a contagem já aparece no tooltip via `title`).

Alternativamente, se quiser manter a contagem visível, dar largura fixa mínima ao primeiro botão (`min-w-[40px]`) para que todas as linhas tenham o mesmo espaçamento.

### Arquivo: `src/pages/DataManagement.tsx` (linhas ~4262-4333)

- Mudar o container de `flex items-center gap-1` para `flex items-center justify-end gap-0.5`
- Primeiro botão: trocar `h-8 px-2` por `h-8 w-8 p-0` e remover o `<span>` com a contagem (mover contagem para o `title` que já existe)
- Manter todos os outros botões com `h-8 w-8 p-0` como já estão

Resultado: 5 ícones quadrados de 32px, alinhados uniformemente em todas as linhas.

