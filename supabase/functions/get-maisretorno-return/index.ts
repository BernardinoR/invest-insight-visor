// Edge function: busca rentabilidade mensal de um ativo via API Mais Retorno
// Calcula (cota_final / cota_inicial - 1) * 100 dentro do mês da competência.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MR_BASE = 'https://data.maisretorno.com/mr-data/v4/api';

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('MAISRETORNO_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'MAISRETORNO_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const identifier: string = (body?.identifier ?? '').toString().trim();
    const competencia: string = (body?.competencia ?? '').toString().trim();

    if (!identifier || !/^[^:]+:[a-z]+$/i.test(identifier)) {
      return new Response(
        JSON.stringify({ error: 'identifier inválido. Esperado formato "ativo:mercado" (ex.: 12345678000190:fi, tesouro-selic-18-06-2008:td).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!/^\d{2}\/\d{4}$/.test(competencia)) {
      return new Response(
        JSON.stringify({ error: 'competencia inválida. Use MM/YYYY.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const [mm, yyyy] = competencia.split('/');
    const month = parseInt(mm, 10);
    const year = parseInt(yyyy, 10);
    const startDate = `${yyyy}-${mm}-01`;
    const endDay = String(lastDayOfMonth(year, month)).padStart(2, '0');
    const endDate = `${yyyy}-${mm}-${endDay}`;

    const url = `${MR_BASE}/quotes/${encodeURIComponent(identifier)}?start_date=${startDate}&end_date=${endDate}`;
    console.log('Mais Retorno GET', url);

    const resp = await fetch(url, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error('Mais Retorno error', resp.status, text.slice(0, 500));
      return new Response(
        JSON.stringify({
          error: `Mais Retorno respondeu ${resp.status}`,
          detail: text.slice(0, 500),
        }),
        { status: resp.status === 401 || resp.status === 403 ? 401 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da API Mais Retorno (não-JSON)' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const quotes: Array<{ d: string; c: number }> = Array.isArray(payload?.quotes) ? payload.quotes : [];
    const valid = quotes
      .filter((q) => q && typeof q.c === 'number' && !isNaN(q.c) && q.c > 0 && typeof q.d === 'string')
      .sort((a, b) => a.d.localeCompare(b.d));

    if (valid.length < 2) {
      return new Response(
        JSON.stringify({
          error: `Cotações insuficientes para ${identifier} em ${competencia} (encontradas: ${valid.length}).`,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const primeira = valid[0];
    const ultima = valid[valid.length - 1];
    const rentabilidadeMensal = ((ultima.c - primeira.c) / primeira.c) * 100;

    return new Response(
      JSON.stringify({
        identifier,
        nicename: payload?.nicename ?? null,
        shortname: payload?.shortname ?? null,
        competencia,
        cotacaoInicial: primeira.c,
        cotacaoFinal: ultima.c,
        dataInicial: primeira.d,
        dataFinal: ultima.d,
        rentabilidadeMensal,
        dias: valid.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('get-maisretorno-return erro:', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
