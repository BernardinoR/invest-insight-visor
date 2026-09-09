import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// CPI-U, U.S. city average, all items, not seasonally adjusted
const BLS_SERIES_ID = 'CUUR0000SA0'
const FRED_SERIES_ID = 'CPIAUCNS'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

/**
 * Build monthly MoM changes (keyed by MM/YYYY) from an index map keyed by YYYY-MM.
 * Months without a published index (e.g. Oct/2025, skipped during the US government
 * shutdown) are bridged: the change between the two published indexes around the gap
 * is spread geometrically across the missing months, so the series has no holes.
 */
function toMonthlyChanges(indexByKey: Map<string, number>, startYear: number) {
  const monthly: Record<string, number> = {}

  const toIdx = (key: string) => {
    const [y, m] = key.split('-').map(Number)
    return y * 12 + (m - 1)
  }
  const fromIdx = (idx: number) => {
    const year = Math.floor(idx / 12)
    const month = (idx % 12) + 1
    return { year, competencia: `${String(month).padStart(2, '0')}/${year}` }
  }

  const points = Array.from(indexByKey.entries())
    .map(([key, value]) => ({ idx: toIdx(key), value }))
    .filter((p) => Number.isFinite(p.value) && p.value > 0)
    .sort((a, b) => a.idx - b.idx)

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const gap = curr.idx - prev.idx
    if (gap <= 0) continue

    // Geometric monthly rate covering the (possibly multi-month) gap
    const rate = Math.pow(curr.value / prev.value, 1 / gap) - 1

    for (let step = 1; step <= gap; step++) {
      const { year, competencia } = fromIdx(prev.idx + step)
      if (year < startYear) continue
      monthly[competencia] = rate
    }
  }

  return monthly
}


async function fetchFred(fetchStart: number, endYear: number) {
  const fredUrl =
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${FRED_SERIES_ID}` +
    `&cosd=${fetchStart}-01-01&coed=${endYear}-12-31`
  console.log('Fetching FRED CPI:', fredUrl)

  const response = await fetch(fredUrl, {
    headers: { 'User-Agent': UA, Accept: 'text/csv,text/plain,*/*' },
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`FRED retornou ${response.status}: ${text.slice(0, 200)}`)
  }

  const indexByKey = new Map<string, number>()
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const [dateRaw, valueRaw] = line.split(',')
    if (!dateRaw || !valueRaw) continue
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateRaw.trim())
    if (!match) continue
    const value = parseFloat(valueRaw.trim())
    if (!Number.isFinite(value)) continue
    indexByKey.set(`${match[1]}-${match[2]}`, value)
  }

  if (indexByKey.size === 0) {
    throw new Error('CSV do FRED sem linhas válidas')
  }

  return indexByKey
}

async function fetchBls(fetchStart: number, endYear: number) {
  const blsUrl = `https://api.bls.gov/publicAPI/v1/timeseries/data/${BLS_SERIES_ID}?startyear=${fetchStart}&endyear=${endYear}`
  console.log('Fetching BLS CPI:', blsUrl)

  const response = await fetch(blsUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`BLS retornou ${response.status}: ${text.slice(0, 200)}`)
  }

  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Resposta inválida do BLS: ${text.slice(0, 200)}`)
  }

  if (json?.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(json?.message?.[0] ?? 'Falha na consulta ao BLS')
  }

  const raw: Array<{ year: string; period: string; value: string }> =
    json?.Results?.series?.[0]?.data ?? []

  const indexByKey = new Map<string, number>()
  raw.forEach((item) => {
    // M01..M12 are months; M13 is the annual average -> ignore
    if (!/^M(0[1-9]|1[0-2])$/.test(item.period)) return
    const value = parseFloat(item.value)
    if (!Number.isFinite(value)) return
    indexByKey.set(`${item.year}-${item.period.slice(1)}`, value)
  })

  if (indexByKey.size === 0) {
    throw new Error('BLS sem dados na série')
  }

  return indexByKey
}

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

    let indexByKey: Map<string, number> | null = null
    let source = 'FRED'
    let series = FRED_SERIES_ID

    try {
      indexByKey = await fetchFred(fetchStart, endYear)
    } catch (fredError) {
      console.error('FRED falhou, caindo para BLS:', fredError instanceof Error ? fredError.message : fredError)
      indexByKey = await fetchBls(fetchStart, endYear)
      source = 'BLS'
      series = BLS_SERIES_ID
    }

    const monthly = toMonthlyChanges(indexByKey, startYear)
    console.log(`CPI months returned (${source}):`, Object.keys(monthly).length)

    return new Response(
      JSON.stringify({ series, source, monthly }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('get-us-cpi error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro inesperado' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
