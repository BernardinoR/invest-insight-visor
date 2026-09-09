import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// CPI-U, U.S. city average, all items, not seasonally adjusted
const SERIES_ID = 'CUUR0000SA0'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    let startYear: number | undefined
    let endYear: number | undefined

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      startYear = Number(body?.startYear)
      endYear = Number(body?.endYear)
    } else {
      startYear = Number(url.searchParams.get('startYear'))
      endYear = Number(url.searchParams.get('endYear'))
    }

    const currentYear = new Date().getFullYear()
    if (!endYear || !Number.isFinite(endYear)) endYear = currentYear
    if (!startYear || !Number.isFinite(startYear)) startYear = endYear - 5

    if (startYear < 1913 || endYear < startYear || endYear - startYear > 9) {
      return new Response(
        JSON.stringify({ error: 'Intervalo inválido: informe até 10 anos (startYear/endYear).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch one extra year back so the first month has a previous index for the MoM change
    const fetchStart = startYear - 1

    const blsUrl = `https://api.bls.gov/publicAPI/v1/timeseries/data/${SERIES_ID}?startyear=${fetchStart}&endyear=${endYear}`
    console.log('Fetching BLS CPI:', blsUrl)

    const response = await fetch(blsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    const text = await response.text()
    if (!response.ok) {
      console.error('BLS error:', response.status, text.slice(0, 300))
      return new Response(
        JSON.stringify({ error: `BLS retornou ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      console.error('BLS non-JSON response:', text.slice(0, 300))
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do BLS' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (json?.status !== 'REQUEST_SUCCEEDED') {
      console.error('BLS status:', json?.status, json?.message)
      return new Response(
        JSON.stringify({ error: json?.message?.[0] ?? 'Falha na consulta ao BLS' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const raw: Array<{ year: string; period: string; value: string }> =
      json?.Results?.series?.[0]?.data ?? []

    // Monthly index values keyed by YYYY-MM (period M01..M12; M13 is the annual average -> ignore)
    const indexByKey = new Map<string, number>()
    raw.forEach((item) => {
      if (!/^M(0[1-9]|1[0-2])$/.test(item.period)) return
      const value = parseFloat(item.value)
      if (!Number.isFinite(value)) return
      indexByKey.set(`${item.year}-${item.period.slice(1)}`, value)
    })

    const monthly: Record<string, number> = {}
    for (const [key, value] of indexByKey.entries()) {
      const [yStr, mStr] = key.split('-')
      const year = Number(yStr)
      const month = Number(mStr)
      if (year < startYear) continue

      const prevYear = month === 1 ? year - 1 : year
      const prevMonth = month === 1 ? 12 : month - 1
      const prev = indexByKey.get(`${prevYear}-${String(prevMonth).padStart(2, '0')}`)
      if (!prev || prev <= 0) continue

      const competencia = `${String(month).padStart(2, '0')}/${year}`
      monthly[competencia] = value / prev - 1
    }

    console.log('CPI months returned:', Object.keys(monthly).length)

    return new Response(
      JSON.stringify({ series: SERIES_ID, monthly }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('get-us-cpi error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
