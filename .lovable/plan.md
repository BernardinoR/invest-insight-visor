
# Plano: Visão Personalizada de Nome de Conta Compartilhável

## Objetivo
Permitir que o usuário selecione contas específicas (nomeConta) no dashboard e compartilhe um link que mantenha essa seleção. Quando alguém abrir o link, verá apenas os dados das contas selecionadas.

## Arquitetura Atual

O sistema já possui:
- `selectedRows`: array de strings no formato `"Instituição|nomeConta"` que filtra os dados exibidos
- `handleToggleRow`: função para selecionar/deselecionar contas
- `copyShareLink`: função que gera URL no formato `/client/NomeCliente`
- Rotas `/dashboard/:clientName` e `/client/:clientName`

## Alterações Necessárias

### 1. Modificar `copyShareLink` em `InvestmentDashboard.tsx`

**Linhas ~427-455**

Adicionar os `selectedRows` como query parameter na URL:

```typescript
const copyShareLink = () => {
  const currentHost = window.location.origin;
  
  try {
    const encodedClient = encodeURIComponent(selectedClient);
    let shareUrl = `${currentHost}/client/${encodedClient}`;
    
    // Adicionar contas selecionadas como query params
    if (selectedRows.length > 0) {
      const accountsParam = selectedRows
        .map(row => encodeURIComponent(row))
        .join(',');
      shareUrl += `?accounts=${accountsParam}`;
    }
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Link copiado para o clipboard!");
    });
  } catch (error) {
    toast.error("Erro ao gerar o link");
  }
};
```

### 2. Ler Query Params no Dashboard

**Arquivo: `src/pages/Dashboard.tsx`**

Adicionar lógica para extrair `accounts` da URL e passar para `InvestmentDashboard`:

```typescript
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";

export default function Dashboard() {
  const { clientName } = useParams<{ clientName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Extrair contas selecionadas da URL
  const accountsFromUrl = searchParams.get('accounts');
  const initialSelectedRows = accountsFromUrl 
    ? accountsFromUrl.split(',').map(decodeURIComponent) 
    : [];

  // ... resto do código ...

  return (
    <InvestmentDashboard 
      selectedClient={decodedClientName} 
      initialSelectedRows={initialSelectedRows}
    />
  );
}
```

### 3. Atualizar Props do InvestmentDashboard

**Arquivo: `src/components/InvestmentDashboard.tsx`**

**Linhas ~33-35 - Atualizar interface:**

```typescript
interface InvestmentDashboardProps {
  selectedClient: string;
  initialSelectedRows?: string[];
}
```

**Linha ~44 - Inicializar com props:**

```typescript
export function InvestmentDashboard({ selectedClient, initialSelectedRows = [] }: InvestmentDashboardProps) {
  // ...
  const [selectedRows, setSelectedRows] = useState<string[]>(initialSelectedRows);
```

### 4. Atualizar Botão de Compartilhar (UX)

Mostrar indicação visual quando há filtros aplicados:

```typescript
<Button 
  variant="outline" 
  className="bg-card/50 border-primary/20 hover:bg-primary/10"
  onClick={copyShareLink}
>
  <Share2 className="mr-2 h-4 w-4" />
  {selectedRows.length > 0 
    ? `Compartilhar (${selectedRows.length} conta${selectedRows.length > 1 ? 's' : ''})` 
    : 'Compartilhar Link'}
</Button>
```

## Fluxo de Uso

```text
1. Usuário acessa /dashboard/ClienteX
2. Seleciona contas "BTG|Conta1" e "XP|Conta2"
3. Clica em "Compartilhar (2 contas)"
4. Link copiado: /client/ClienteX?accounts=BTG%7CConta1,XP%7CConta2
5. Destinatário abre link
6. Dashboard carrega já filtrado por essas 2 contas
```

## Resumo de Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Adicionar `useSearchParams` e extrair `accounts`, passar `initialSelectedRows` |
| `src/components/InvestmentDashboard.tsx` | Adicionar prop `initialSelectedRows`, atualizar `copyShareLink` com query params, melhorar texto do botão |

## Benefícios

- Links personalizados por seleção de contas
- Não quebra links existentes (sem accounts = mostra tudo)
- UX clara mostrando quantas contas estão no link
