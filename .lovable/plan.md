## Padronização do campo Taxa em Ajuste de Ativos

### Diagnóstico do banco

Hoje a coluna `Taxa` em `DadosPerformance` tem MUITAS variações para o mesmo conceito (~milhares de valores distintos). Exemplos reais por classe:

- **CDI - Liquidez / CDI - Titulos / CDI - Fundos**: `100% CDI`, `100,00% CDI`, `100,0% CDI`, `103.5% CDI`, `CDI+ 2,64%`, `CDI+ 1,20%`, `CDI+ 100,00%` (claramente errado), `1,20%`, `4,76% a.a.`
- **Inflação - Titulos / Fundos**: `IPCA+ 6,85%`, `IPCA+ 6,8%`, `IPCA+ 7%`, `IPCA+ 6,317%`, `IGP-M + 7,00%`, `IGP-M + 6,60%`, `11,14% a.a.`
- **Pré Fixado - Titulos / Fundos**: `14,8% a.a.`, `13,00% a.a.`, `14.8% a.a.` (com ponto), `17% a.a.`
- **Ações / ETFs / Multimercado / etc.**: `-`, `2,04%`, `17,28` (sem símbolo)

Problemas: separador decimal inconsistente (`,` vs `.`), sufixo opcional (`% CDI`, `a.a.`), espaço após `+`, `IGP-M +` vs `IPCA+`, casas decimais variáveis, e alguns valores com tipo errado para a classe.

### Formato padrão proposto (sempre BR — vírgula decimal, 2 casas)

| Classe | Tipos permitidos | Formato canônico |
|---|---|---|
| CDI - Liquidez / Titulos / Fundos | `% CDI` ou `CDI+` | `103,50% CDI` ou `CDI+ 2,55%` |
| Inflação - Titulos / Fundos | `IPCA+` ou `IGPM+` | `IPCA+ 6,85%` ou `IGPM+ 7,00%` |
| Pré Fixado - Titulos / Fundos | Pré | `14,80% a.a.` |
| Multimercado, Ações, ETFs, Imobiliário, Exterior, COE, Cripto, Ouro, Alternativo, PE/VC | livre / sem taxa | campo vazio (default) |

Padronização: `IGP-M +` → `IGPM+`, ponto → vírgula, sempre 2 casas, sufixo obrigatório.

### Mudanças no AssetOverridesTab.tsx (modal "Nova regra" / Editar)

Substituir o `Input` único de Taxa por um **componente composto** que muda dinamicamente conforme a classe selecionada (`form.classe_ativo`):

1. **Detector de tipo de taxa** baseado na classe:
   - Classes CDI → mostra `Select` com 2 opções: `% CDI` | `CDI+` + `BRNumberInput` (2 casas)
   - Classes Inflação → mostra `Select` com 2 opções: `IPCA+` | `IGPM+` + `BRNumberInput`
   - Classes Pré Fixado → mostra apenas `BRNumberInput` com sufixo fixo `% a.a.`
   - Demais classes → mostra `Input` livre (fallback) ou oculta o campo

2. **Montagem do valor canônico** ao salvar:
   - `% CDI`: `{valor}% CDI`
   - `CDI+`: `CDI+ {valor}%`
   - `IPCA+` / `IGPM+`: `{tipo} {valor}%`
   - Pré: `{valor}% a.a.`
   - Sempre formatado com vírgula e 2 casas decimais.

3. **Parser ao abrir/editar** uma regra existente: regex extrai tipo + número de qualquer um dos formatos antigos para popular o select e o input numéricos corretamente. Aceita `100% CDI`, `100,00% CDI`, `103.5% CDI`, `CDI+ 2,64%`, `IPCA+ 6,85%`, `IGP-M + 6,60%`, `14,8% a.a.`, `14.8% a.a.`.

4. **Pré-preenchimento contextual**: quando a regra é criada via "Ajustar ativo" da tabela, o `prefillRequest.taxa` (vindo do registro original) passa pelo mesmo parser, já caindo nos selects/inputs corretos.

5. **Placeholder dinâmico** mostra exemplo do formato canônico esperado para a classe atual.

6. **BRNumberInput**: reutilizar `src/components/BRNumberInput` (já padrão do projeto) para garantir vírgula como separador decimal.

### Não inclui (escopo separado)

- Migração/atualização em massa dos valores antigos em `DadosPerformance.Taxa` — apenas o que for editado/ajustado via app passa a ficar canônico.
- Mudança no schema (`Taxa` segue como `text`).
- Aplicação automática das regras (continua sendo feita pelo n8n, conforme memória `asset-overrides`).

### Arquivos afetados

- `src/components/AssetOverridesTab.tsx` — substituir o bloco do campo Taxa (linhas ~640-649) por um componente composto + ajustar `prefillRequest` effect (~180), `handleOpenEdit` (~220) e `handleSave` (~265) para serializar/parsear.

### Pergunta antes de implementar

Os títulos `% CDI` aparecem hoje quase sempre com 2 casas decimais (ex: `119,00%`, `103,50%`). Confirma que quer **forçar sempre 2 casas** ao salvar, ou prefere **mínimo 2, máximo 4** (para casos como `IPCA+ 6,317%` ou `126,67% CDI`)?
