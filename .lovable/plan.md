## Adicionar opção "CDI+" no RolloverDialog

Adicionar novo modo de cálculo de rentabilidade `CDI+` (CDI + spread% a.a.) no diálogo "Avançar Competência".

### Mudanças em `src/components/RolloverDialog.tsx`

1. **Tipo `CalcMode`** (linha 59): adicionar `'CDIplus'`.
   ```ts
   type CalcMode = 'CDI' | 'CDIplus' | 'pctCDI' | 'IPCA' | 'PRE' | 'Manual';
   ```

2. **`calcularRendimento`** (linha 124): adicionar case `CDIplus`:
   ```ts
   case 'CDIplus': {
     const spreadMensal = Math.pow(1 + (parametro / 100), 1 / 12) - 1;
     return (1 + cdiMensal) * (1 + spreadMensal) - 1;
   }
   ```

3. **`MODE_LABELS`** (linha 143): adicionar `CDIplus: 'CDI+'`.

4. **`SelectItem`** (linha ~470): adicionar `<SelectItem value="CDIplus">CDI+</SelectItem>` logo após `CDI`.

5. **Lógica do parâmetro** (linhas 257, 479-481):
   - default param: `valor === 'CDIplus' ? 4 : ...`
   - `if (modo === 'CDI') return null;` permanece (CDI+ mostra input)
   - placeholder/suffix: `modo === 'CDIplus' ? '4'` / `'% a.a.'`

### Validação
Conferir no preview que ao escolher "CDI+" aparece input para o spread (ex. `4`), e o rendimento exibido é `(1+CDI_mês) * (1+4%)^(1/12) - 1`.

Sem mudanças de schema/banco.