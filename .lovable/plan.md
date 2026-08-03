# Permitir valores negativos no campo de rentabilidade

## Problema

Os campos "Rendimento (%)" (modal de edição, edição em massa e a variante compacta) são `<input type="number">` controlados por um valor derivado (`Rendimento * 100`). Ao digitar `-`, `parseFloat("-")` é `NaN`, o código grava `0` e o input é reescrito imediatamente — então o sinal negativo nunca "fica" na tela. O mesmo acontece ao digitar `-0,` ou apagar tudo.

## Solução

Criar um input de percentual dedicado que mantenha o texto digitado em estado local e só grave no registro quando o texto for um número válido:

- Aceita `-` no início, vírgula ou ponto como decimal, e string vazia (grava `0`/`undefined` conforme o caso).
- Estados intermediários (`-`, `-0,`, `,`) permanecem visíveis sem serem sobrescritos.
- Ao perder o foco, normaliza a exibição a partir do valor efetivamente salvo.
- Sinal negativo também aceito via colar (paste) e teclado numérico.

Aplicar esse input nas 4 ocorrências do campo de rendimento em `src/pages/DataManagement.tsx` (edição individual — duas variantes de layout — e edição em massa), mantendo o sufixo `%`, o mesmo callback de gravação e a conversão `%` → decimal (dividir por 100) exatamente como hoje.

## Detalhes técnicos

- Arquivo: `src/pages/DataManagement.tsx` (linhas aprox. 6624, 7037, 7202, 7297).
- Novo componente local `PercentInput` (`type="text"`, `inputMode="decimal"`) com `value` numérico opcional + `onChange(number | undefined)`.
- Nenhuma mudança de schema, de gravação no Supabase ou de regras de validação/verificação.
