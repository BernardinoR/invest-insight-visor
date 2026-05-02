## Objetivo

Adicionar um botão ao lado do campo **"Novo nome do ativo"** no modal de criação/edição de regra (`AssetOverridesTab.tsx`) que pré-preenche automaticamente o nome no formato:

```
PREFIXO EMISSOR TAXA VENCIMENTO
```

Exemplo: `CDB C6 110% CDI 19/06/2028`

## Regras de geração

### 1. Prefixo (detectado no `ativo_original`, case-insensitive)
- Contém `CDB` → `CDB`
- Contém `CRA` → `CRA`
- Contém `CRI` → `CRI`
- Contém `DEB` (ou `DEBENTURE`/`DEBÊNTURE`) → `DEB`
- Caso nenhum case, usa a **Classe do Ativo** selecionada como fallback (ou string vazia se nada).

### 2. Emissor
- Usa o campo `form.emissor` exatamente como digitado (trim).

### 3. Taxa
- Usa o campo `form.taxa` exatamente como está (já padronizado pelo seletor: `% CDI`, `CDI+`, `IPCA+`, `IGPM+`, `Pré`).

### 4. Vencimento
- Usa `form.vencimento` (campo `<input type="date">`, formato `YYYY-MM-DD`) e converte para `DD/MM/YYYY`.
- Se vazio, omite.

### 5. Montagem
- Concatena com espaço simples, ignorando partes vazias e fazendo trim final.
- Sempre **sobrescreve** o valor atual de `ativo_novo` ao clicar (comportamento de "gerar/regerar").

## Mudanças de código

**Arquivo:** `src/components/AssetOverridesTab.tsx`

1. Adicionar helper `buildNomePadrao(form)` que aplica as regras acima.
2. No bloco do "Novo nome do ativo" (linhas 652-661), envolver `<Input>` num container flex e adicionar um `<Button variant="outline" size="icon" type="button">` com ícone `Wand2` (lucide-react, já compatível) e tooltip `"Gerar nome padrão"`.
3. `onClick` do botão: `setForm({ ...form, ativo_novo: buildNomePadrao(form) })`.
4. Botão fica **desabilitado** se `form.emissor` e `form.taxa` e `form.vencimento` estiverem todos vazios (nada para gerar).

## Fora de escopo

- Não altera schema, RLS ou pipeline n8n.
- Não toca em registros já existentes — só ajuda na criação de novas regras.
- Sem geração automática ao digitar — só quando o usuário clica no botão.
