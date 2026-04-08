

# Plano: Adicionar campo "Liquidez" (D+N) na tabela e no editar ativo

## Resumo

Adicionar coluna `liquidez TEXT` na tabela `DadosPerformance` e campo de edição no dialog de ativo detalhado. O prefixo "D+" só aparece quando há valor digitado, e o campo pode ser limpo completamente.

## Alterações

### 1. Migration — Nova coluna
```sql
ALTER TABLE "DadosPerformance" ADD COLUMN liquidez TEXT DEFAULT NULL;
```

### 2. Frontend — `src/pages/DataManagement.tsx`

Adicionar campo entre "Vencimento" (linha ~5701) e "Rendimento" (linha ~5704):

```tsx
<div>
  <Label htmlFor="liquidez">Liquidez</Label>
  <div className="flex items-center gap-2">
    <Input
      id="liquidez"
      value={editingItem.liquidez ? editingItem.liquidez.replace(/^D\+/i, '') : ''}
      onChange={(e) => {
        const num = e.target.value.replace(/\D/g, '');
        setEditingItem({
          ...editingItem,
          liquidez: num ? `D+${num}` : null
        });
      }}
      placeholder="Ex: 0, 30, 90..."
    />
    {editingItem.liquidez && (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEditingItem({...editingItem, liquidez: null})}
      >
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
  {editingItem.liquidez && (
    <p className="text-xs text-muted-foreground mt-1">
      Valor salvo: {editingItem.liquidez}
    </p>
  )}
</div>
```

**Comportamento:**
- Campo vazio por padrão (muitos ativos não terão liquidez)
- Ao digitar um número, salva automaticamente como `D+N` (ex: digitar "30" → salva "D+30")
- Prefixo "D+" mostrado apenas no preview abaixo do campo quando há valor
- Botão X ao lado para limpar o campo inteiro (volta a `null`)
- Aceita apenas números

### 3. Incluir `liquidez` no save (handleSave)

Garantir que o campo `liquidez` é incluído no objeto enviado ao Supabase no update/insert do `DadosPerformance`.

### 4. Coluna na tabela de detalhados (opcional mas incluído)

Adicionar "Liquidez" como coluna visível na tabela de dados detalhados, com toggle de visibilidade.

### Flag para o n8n
```json
{ "liquidez": "D+30" }
```

