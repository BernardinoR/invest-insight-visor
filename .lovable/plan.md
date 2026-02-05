

# Plano: Corrigir Edge Function get-stock-return

## Problema Identificado

A edge function `get-stock-return` está falhando porque:

1. **Rate Limiting do Yahoo Finance**: A API do Yahoo Finance está retornando `429 Too Many Requests`
2. **Falta de verificação de status HTTP**: O código faz `response.json()` diretamente sem verificar se a resposta foi bem-sucedida (status 200)

### Log do Erro
```
Error in get-stock-return: SyntaxError: Unexpected token 'T', "Too Many Requests" is not valid JSON
```

O texto "Too Many Requests" não é JSON válido, causando o erro de parse.

## Solução

### 1. Verificar status HTTP antes de parsear JSON

**Arquivo:** `supabase/functions/get-stock-return/index.ts`

**Alteração na linha 37-38:**

De:
```typescript
const response = await fetch(url)
const data = await response.json()
```

Para:
```typescript
const response = await fetch(url)

// Verificar se a resposta foi bem-sucedida
if (!response.ok) {
  const errorText = await response.text()
  console.error('Yahoo Finance API error:', response.status, errorText)
  
  if (response.status === 429) {
    throw new Error('Limite de requisições excedido. Aguarde alguns minutos e tente novamente.')
  }
  
  throw new Error(`Erro na API Yahoo Finance: ${response.status}`)
}

const data = await response.json()
```

### 2. Adicionar headers de User-Agent (opcional, pode ajudar com rate limiting)

```typescript
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
})
```

### 3. Implementar retry com delay (opcional, para robustez)

```typescript
const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      return response;
    }
    
    if (response.status === 429 && i < retries - 1) {
      console.log(`Rate limited, waiting ${delay}ms before retry ${i + 1}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
      continue;
    }
    
    const errorText = await response.text();
    throw new Error(response.status === 429 
      ? 'Limite de requisições excedido. Aguarde alguns minutos e tente novamente.'
      : `Erro na API Yahoo Finance: ${response.status}`);
  }
  throw new Error('Falha após múltiplas tentativas');
};
```

## Código Final Corrigido

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { ticker, competencia } = await req.json()
    
    console.log('Fetching data for:', { ticker, competencia })
    
    const [month, year] = competencia.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 0)
    const endDate = new Date(parseInt(year), parseInt(month), 0)
    
    const startTimestamp = Math.floor(startDate.getTime() / 1000)
    const endTimestamp = Math.floor(endDate.getTime() / 1000)
    
    console.log('Date range:', { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString(),
      note: 'startDate = último dia do mês anterior, endDate = último dia do mês atual'
    })
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
    
    // Fetch com headers e verificação de status
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    console.log('Yahoo Finance response status:', response.status)
    
    // Verificar status antes de parsear JSON
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Yahoo Finance API error:', response.status, errorText)
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Aguarde alguns minutos e tente novamente.')
      }
      
      throw new Error(`Erro na API Yahoo Finance: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.chart?.result?.[0]) {
      throw new Error('Ticker não encontrado ou sem dados para o período')
    }
    
    const quotes = data.chart.result[0]
    const closes = quotes.indicators.quote[0].close
    
    if (!closes || closes.length === 0) {
      throw new Error('Sem dados de preço para o período informado')
    }
    
    const validCloses = closes.filter((c: number) => c != null)
    
    if (validCloses.length < 2) {
      throw new Error('Dados insuficientes para calcular rentabilidade')
    }
    
    const startPrice = validCloses[0]
    const endPrice = validCloses[validCloses.length - 1]
    const monthlyReturn = ((endPrice - startPrice) / startPrice) * 100
    
    console.log('Calculation result:', { startPrice, endPrice, monthlyReturn })
    
    return new Response(
      JSON.stringify({
        monthlyReturn,
        startPrice,
        endPrice,
        ticker,
        competencia
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
    
  } catch (error) {
    console.error('Error in get-stock-return:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao buscar dados do mercado' 
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
```

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Verificação de `response.ok` | Evita tentar parsear JSON de respostas de erro |
| Header User-Agent | Pode ajudar a evitar rate limiting |
| Mensagem específica para 429 | Informa o usuário sobre o limite de requisições |
| Log detalhado de erros | Facilita debugging futuro |

## Observação Importante

O Yahoo Finance é uma API não-oficial e tem **rate limiting agressivo**. Se o problema persistir, pode ser necessário:
1. Implementar cache de resultados no banco de dados
2. Usar uma API alternativa (Alpha Vantage, Polygon.io, etc.)
3. Adicionar delays entre requisições

