import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TESOURO_CSV_URL = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv';

// URLs dos arquivos XLS para Educa+ e Renda+
const EDUCA_XLS_URL = (ano: string) => 
  `https://cdntesouro.z15.web.core.windows.net/sistemas-internos/apex/producao/sistemas/sistd/${ano}/Tesouro_Educa+_${ano}.xls`;

const RENDA_XLS_URL = (ano: string) => 
  `https://cdntesouro.z15.web.core.windows.net/sistemas-internos/apex/producao/sistemas/sistd/${ano}/Tesouro_Renda+_Aposentadoria_Extra_${ano}.xls`;

// Detecta se é título Educa+ ou Renda+
const isEducaOuRenda = (tipoTitulo: string): 'educa' | 'renda' | null => {
  const upper = tipoTitulo.toUpperCase();
  if (upper.includes('EDUCA')) return 'educa';
  if (upper.includes('RENDA')) return 'renda';
  return null;
};

// Busca dados do XLS para Educa+ e Renda+
const fetchEducaRendaData = async (
  tipoTitulo: string,
  vencimento: string,
  competencia: string
): Promise<{
  titulo: string;
  vencimento: string;
  competencia: string;
  rentabilidadeMensal: number;
  puInicial: number;
  puFinal: number;
  diasUteis: number;
}> => {
  const [month, year] = competencia.split('/');
  const targetMonth = parseInt(month);
  const targetYear = parseInt(year);
  
  const tipo = isEducaOuRenda(tipoTitulo);
  const url = tipo === 'educa' ? EDUCA_XLS_URL(year) : RENDA_XLS_URL(year);
  
  console.log(`Baixando XLS de ${tipo === 'educa' ? 'Educa+' : 'Renda+'}: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao baixar XLS (${response.status}): ${url}. O arquivo para ${year} pode não existir ainda.`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  
  console.log('Abas disponíveis no XLS:', workbook.SheetNames);
  
  // Encontrar a aba correta baseada no vencimento
  // O vencimento vem como "2026", "2030", etc.
  // As abas têm nomes como "NTN-B1 151230" onde 151230 = 15/12/30 (15 dez 2030)
  let targetSheet: XLSX.WorkSheet | null = null;
  let sheetName = '';
  
  // Mapeamento de vencimento para código da aba
  const vencimentoMap: Record<string, string[]> = {
    // Educa+ - o ano de pagamento é diferente do vencimento real
    '2026': ['NTN-B1 150826', 'NTN-B1 151226', '2026'],
    '2027': ['NTN-B1 150827', 'NTN-B1 151227', '2027'],
    '2028': ['NTN-B1 150828', 'NTN-B1 151228', '2028'],
    '2029': ['NTN-B1 150829', 'NTN-B1 151229', '2029'],
    '2030': ['NTN-B1 150830', 'NTN-B1 151230', '2030'],
    '2031': ['NTN-B1 150831', 'NTN-B1 151231', '2031'],
    '2032': ['NTN-B1 150832', 'NTN-B1 151232', '2032'],
    '2033': ['NTN-B1 150833', 'NTN-B1 151233', '2033'],
    '2034': ['NTN-B1 150834', 'NTN-B1 151234', '2034'],
    '2035': ['NTN-B1 150835', 'NTN-B1 151235', '2035'],
    '2036': ['NTN-B1 150836', 'NTN-B1 151236', '2036'],
    '2037': ['NTN-B1 150837', 'NTN-B1 151237', '2037'],
    '2038': ['NTN-B1 150838', 'NTN-B1 151238', '2038'],
    '2039': ['NTN-B1 150839', 'NTN-B1 151239', '2039'],
    '2040': ['NTN-B1 150840', 'NTN-B1 151240', '2040'],
    '2041': ['NTN-B1 150841', 'NTN-B1 151241', '2041'],
    '2042': ['NTN-B1 150842', 'NTN-B1 151242', '2042'],
    '2045': ['NTN-B1 150845', 'NTN-B1 151245', '2045'],
    '2050': ['NTN-B1 150850', 'NTN-B1 151250', '2050'],
    '2055': ['NTN-B1 150855', 'NTN-B1 151255', '2055'],
    '2060': ['NTN-B1 150860', 'NTN-B1 151260', '2060'],
    '2065': ['NTN-B1 150865', 'NTN-B1 151265', '2065'],
  };
  
  const possibleNames = vencimentoMap[vencimento] || [vencimento];
  
  for (const name of workbook.SheetNames) {
    const nameLower = name.toLowerCase();
    for (const possible of possibleNames) {
      if (nameLower.includes(possible.toLowerCase()) || name.includes(possible)) {
        targetSheet = workbook.Sheets[name];
        sheetName = name;
        break;
      }
    }
    if (targetSheet) break;
  }
  
  if (!targetSheet) {
    throw new Error(`Aba para vencimento ${vencimento} não encontrada. Abas disponíveis: ${workbook.SheetNames.join(', ')}`);
  }
  
  console.log(`Usando aba: ${sheetName}`);
  
  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(targetSheet, { header: 1 }) as any[][];
  
  if (data.length < 2) {
    throw new Error('XLS sem dados suficientes');
  }
  
  // Encontrar índices das colunas
  const headers = data[0] as string[];
  console.log('Headers do XLS:', headers);
  
  const dataBaseIdx = headers.findIndex(h => 
    h && (h.toString().toLowerCase().includes('data base') || h.toString().toLowerCase().includes('data'))
  );
  const puBaseIdx = headers.findIndex(h => 
    h && (h.toString().toLowerCase().includes('pu base') || h.toString().toLowerCase().includes('pu'))
  );
  
  if (dataBaseIdx === -1 || puBaseIdx === -1) {
    // Tentar usar índices padrão se não encontrar headers
    console.log('Headers não encontrados, usando índices padrão (0=data, 1=pu)');
  }
  
  const dateColIdx = dataBaseIdx !== -1 ? dataBaseIdx : 0;
  const puColIdx = puBaseIdx !== -1 ? puBaseIdx : 1;
  
  // Filtrar dados pelo mês/ano
  const filteredData: Array<{ dataBase: string; pu: number; day: number }> = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    let dataBase = row[dateColIdx];
    const puValue = row[puColIdx];
    
    if (!dataBase || !puValue) continue;
    
    // Converter data do Excel (número de série) para string DD/MM/YYYY
    let dateStr: string;
    if (typeof dataBase === 'number') {
      // Data do Excel é número de dias desde 30/12/1899
      const excelDate = new Date((dataBase - 25569) * 86400 * 1000);
      const day = excelDate.getUTCDate().toString().padStart(2, '0');
      const monthNum = (excelDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const yearNum = excelDate.getUTCFullYear();
      dateStr = `${day}/${monthNum}/${yearNum}`;
    } else {
      dateStr = dataBase.toString();
    }
    
    // Parse da data
    const dateParts = dateStr.split('/');
    if (dateParts.length !== 3) continue;
    
    const dataDay = parseInt(dateParts[0]);
    const dataMonth = parseInt(dateParts[1]);
    const dataYear = parseInt(dateParts[2]);
    
    // Converter PU para número
    let pu: number;
    if (typeof puValue === 'number') {
      pu = puValue;
    } else {
      pu = parseFloat(puValue.toString().replace(',', '.'));
    }
    
    if (isNaN(pu) || pu === 0) continue;
    
    if (dataMonth === targetMonth && dataYear === targetYear) {
      filteredData.push({
        dataBase: dateStr,
        pu,
        day: dataDay
      });
    }
  }
  
  console.log(`Registros filtrados para ${competencia}: ${filteredData.length}`);
  
  if (filteredData.length === 0) {
    throw new Error(`Nenhum dado encontrado para ${tipoTitulo} ${vencimento} em ${competencia} no arquivo XLS`);
  }
  
  // Ordenar por dia e calcular rentabilidade
  filteredData.sort((a, b) => a.day - b.day);
  
  const primeiro = filteredData[0];
  const ultimo = filteredData[filteredData.length - 1];
  
  const puInicial = primeiro.pu;
  const puFinal = ultimo.pu;
  const rentabilidadeMensal = ((puFinal - puInicial) / puInicial) * 100;
  
  console.log('Resultado calculado (XLS):', {
    titulo: tipoTitulo,
    vencimento,
    puInicial,
    puFinal,
    rentabilidadeMensal,
    diasUteis: filteredData.length
  });
  
  return {
    titulo: tipoTitulo,
    vencimento,
    competencia,
    rentabilidadeMensal,
    puInicial,
    puFinal,
    diasUteis: filteredData.length
  };
};

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
    
    // Verificar se é Educa+ ou Renda+ - usar XLS do Azure CDN
    if (isEducaOuRenda(tipoTitulo)) {
      const result = await fetchEducaRendaData(tipoTitulo, vencimento || '', competencia);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Para outros títulos, usar CSV do Tesouro Transparente
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
