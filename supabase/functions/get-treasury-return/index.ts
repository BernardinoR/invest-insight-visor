import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TESOURO_CSV_URL = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { tipoTitulo, vencimento, competencia } = await req.json()
    
    console.log('Buscando dados do Tesouro:', { tipoTitulo, vencimento, competencia })
    
    if (!tipoTitulo || !competencia) {
      throw new Error('Parâmetros tipoTitulo e competencia são obrigatórios')
    }
    
    // Parse competencia (MM/YYYY)
    const [month, year] = competencia.split('/')
    const targetMonth = parseInt(month)
    const targetYear = parseInt(year)
    
    if (isNaN(targetMonth) || isNaN(targetYear)) {
      throw new Error('Formato de competência inválido. Use MM/YYYY')
    }
    
    console.log('Baixando CSV do Tesouro Transparente...')
    
    // Baixar CSV do Tesouro Transparente
    const response = await fetch(TESOURO_CSV_URL)
    if (!response.ok) {
      throw new Error(`Erro ao baixar dados do Tesouro: ${response.status}`)
    }
    
    const csvText = await response.text()
    console.log(`CSV baixado, tamanho: ${csvText.length} caracteres`)
    
    // Parsear CSV
    const lines = csvText.split('\n')
    console.log(`Total de linhas no CSV: ${lines.length}`)
    
    // O CSV tem as colunas:
    // Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha
    const headers = lines[0].split(';')
    console.log('Headers do CSV:', headers)
    
    // Filtrar linhas pelo título e vencimento
    const filteredData: Array<{
      titulo: string;
      dataVencimento: string;
      dataBase: string;
      puVenda: number;
      day: number;
    }> = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';')
      if (values.length < 7) continue
      
      const titulo = values[0]?.trim() // Tipo Titulo
      const dataVencimento = values[1]?.trim() // Data Vencimento
      const dataBase = values[2]?.trim() // Data Base
      
      // PU Base Manha é a coluna 7 (índice 7), mas às vezes pode ser PU Venda Manha (índice 6)
      // Vamos usar PU Base Manha que é mais confiável
      let puVenda = parseFloat(values[7]?.replace(',', '.') || '0') // PU Base Manha
      if (isNaN(puVenda) || puVenda === 0) {
        puVenda = parseFloat(values[6]?.replace(',', '.') || '0') // PU Venda Manha como fallback
      }
      
      if (!titulo || !dataBase || isNaN(puVenda) || puVenda === 0) continue
      
      // Filtrar por tipo de título (busca parcial)
      if (!titulo.toLowerCase().includes(tipoTitulo.toLowerCase())) continue
      
      // Filtrar por vencimento se especificado
      if (vencimento && vencimento.trim() !== '') {
        // dataVencimento está no formato DD/MM/YYYY
        const anoVencimento = dataVencimento.split('/')[2]
        if (anoVencimento !== vencimento) continue
      }
      
      // Extrair mês/ano da data base (formato DD/MM/YYYY)
      const dataParts = dataBase.split('/')
      if (dataParts.length !== 3) continue
      
      const dataDay = parseInt(dataParts[0])
      const dataMonth = parseInt(dataParts[1])
      const dataYear = parseInt(dataParts[2])
      
      if (dataMonth === targetMonth && dataYear === targetYear) {
        filteredData.push({
          titulo,
          dataVencimento,
          dataBase,
          puVenda,
          day: dataDay
        })
      }
    }
    
    console.log(`Registros filtrados: ${filteredData.length}`)
    
    if (filteredData.length === 0) {
      throw new Error(`Nenhum dado encontrado para ${tipoTitulo}${vencimento ? ` ${vencimento}` : ''} em ${competencia}`)
    }
    
    // Ordenar por dia e pegar primeiro e último
    filteredData.sort((a, b) => a.day - b.day)
    
    const primeiro = filteredData[0]
    const ultimo = filteredData[filteredData.length - 1]
    
    const puInicial = primeiro.puVenda
    const puFinal = ultimo.puVenda
    const rentabilidadeMensal = ((puFinal - puInicial) / puInicial) * 100
    
    console.log('Resultado calculado:', { 
      titulo: primeiro.titulo,
      puInicial, 
      puFinal, 
      rentabilidadeMensal,
      diasUteis: filteredData.length 
    })
    
    return new Response(
      JSON.stringify({
        titulo: primeiro.titulo,
        vencimento: primeiro.dataVencimento,
        competencia,
        rentabilidadeMensal,
        puInicial,
        puFinal,
        diasUteis: filteredData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('Erro em get-treasury-return:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
