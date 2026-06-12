import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function tryFetch(symbol: string, startTimestamp: number, endTimestamp: number) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  console.log(`Yahoo [${symbol}] status:`, response.status)
  return response
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

    // Build candidate symbols: original, then .L (London), then .AS (Amsterdam)
    // Skip suffixes if ticker already has a dot.
    const hasSuffix = ticker.includes('.')
    const candidates = hasSuffix ? [ticker] : [ticker, `${ticker}.L`, `${ticker}.AS`, `${ticker}.DE`, `${ticker}.F`]

    let response: Response | null = null
    let lastErrorText = ''
    let resolvedTicker = ticker

    for (const sym of candidates) {
      const r = await tryFetch(sym, startTimestamp, endTimestamp)
      if (r.ok) {
        response = r
        resolvedTicker = sym
        break
      }
      // Only fallback on 404 (not found / delisted)
      if (r.status !== 404) {
        const text = await r.text()
        console.error('Yahoo non-404 error:', r.status, text)
        if (r.status === 429) {
          throw new Error('Limite de requisições excedido. Aguarde alguns minutos e tente novamente.')
        }
        throw new Error(`Erro na API Yahoo Finance: ${r.status}`)
      }
      lastErrorText = await r.text()
      console.log(`404 para ${sym}, tentando próximo sufixo...`)
    }

    if (!response) {
      console.error('Todos sufixos falharam para', ticker, lastErrorText)
      throw new Error(`Ticker ${ticker} não encontrado (tentado: ${candidates.join(', ')})`)
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

    console.log('Calculation result:', { resolvedTicker, startPrice, endPrice, monthlyReturn })

    return new Response(
      JSON.stringify({
        monthlyReturn,
        startPrice,
        endPrice,
        ticker,
        resolvedTicker,
        competencia
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-stock-return:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro ao buscar dados do mercado' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
