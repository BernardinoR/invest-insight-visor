import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { ticker, competencia } = await req.json()
    
    console.log('Fetching data for:', { ticker, competencia })
    
    // Parse competencia (MM/YYYY) para datas
    const [month, year] = competencia.split('/')
    // Último dia do mês ANTERIOR (para pegar preço de fechamento anterior)
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 0) // Dia 0 = último dia do mês anterior
    const endDate = new Date(parseInt(year), parseInt(month), 0) // Último dia do mês atual
    
    const startTimestamp = Math.floor(startDate.getTime() / 1000)
    const endTimestamp = Math.floor(endDate.getTime() / 1000)
    
    console.log('Date range:', { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString(),
      note: 'startDate = último dia do mês anterior, endDate = último dia do mês atual'
    })
    
    // Chamar Yahoo Finance API
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
    const timestamps = quotes.timestamp
    const closes = quotes.indicators.quote[0].close
    
    if (!closes || closes.length === 0) {
      throw new Error('Sem dados de preço para o período informado')
    }
    
    // Primeiro e último preço do mês (ignorando nulls)
    const validCloses = closes.filter((c: number) => c != null)
    
    if (validCloses.length < 2) {
      throw new Error('Dados insuficientes para calcular rentabilidade')
    }
    
    const startPrice = validCloses[0]
    const endPrice = validCloses[validCloses.length - 1]
    
    // Calcular retorno percentual
    const monthlyReturn = ((endPrice - startPrice) / startPrice) * 100
    
    console.log('Calculation result:', { startPrice, endPrice, monthlyReturn })
    
    return new Response(
      JSON.stringify({
        monthlyReturn: monthlyReturn,
        startPrice: startPrice,
        endPrice: endPrice,
        ticker: ticker,
        competencia: competencia
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
