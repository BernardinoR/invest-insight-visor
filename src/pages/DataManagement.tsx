import { useParams, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Search, CheckSquare, Square, ChevronDown, FileCheck, CheckCircle2, AlertCircle, XCircle, Info, ExternalLink, ArrowRight, Filter as FilterIcon, ArrowUp, ArrowDown, SortAsc, Settings, Settings2, Tag, AlertTriangle, Copy, DollarSign, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCDIData } from '@/hooks/useCDIData';
import { usePTAXData } from '@/hooks/usePTAXData';
import { useMarketIndicators } from '@/hooks/useMarketIndicators';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Lista definitiva de classes de ativos válidas (usada no dropdown e validação)
const VALID_ASSET_CLASSES = [
  'CDI - Liquidez',
  'CDI - Titulos', 
  'CDI - Fundos',
  'Inflação - Titulos',
  'Inflação - Fundos',
  'Pré Fixado - Titulos',
  'Pré Fixado - Fundos',
  'Multimercado',
  'Imobiliário - Ativos',
  'Imobiliário - Fundos',
  'Ações - Ativos',
  'Ações - ETFs',
  'Ações - Fundos',
  'Ações - Long Biased',
  'Private Equity/Venture Capital/Special Sits',
  'Exterior - Renda Fixa',
  'Exterior - Ações',
  'COE',
  'Criptoativos',
  'Ouro'
] as const;

// Helper function to parse Brazilian number format
const parseBrazilianNumber = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  
  // Remove espaços
  let cleaned = value.trim();
  
  // Se tiver vírgula, assume formato brasileiro
  if (cleaned.includes(',')) {
    // Remove todos os pontos (separadores de milhares)
    cleaned = cleaned.replace(/\./g, '');
    // Substitui vírgula por ponto (decimal)
    cleaned = cleaned.replace(',', '.');
  }
  
  // Converte para número
  const numericValue = parseFloat(cleaned);
  return isNaN(numericValue) ? 0 : numericValue;
};

// Formata número para padrão brasileiro com separador de milhares
const formatBrazilianNumber = (value: number): string => {
  const parts = value.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];
  return `${integerPart},${decimalPart}`;
};

interface ConsolidadoData {
  id: number;
  "Patrimonio Inicial": number;
  "Movimentação": number;
  "Impostos": number;
  "Ganho Financeiro": number;
  "Patrimonio Final": number;
  "Rendimento": number;
  "Competencia": string;
  "Data": string;
  "Nome": string;
  "Instituicao": string;
  "Moeda": string;
  "nomeConta": string;
}

interface DadosData {
  id: number;
  "Posicao": number;
  "Vencimento": string;
  "Rendimento": number | string | null;
  "Taxa": string;
  "Ativo": string;
  "Emissor": string;
  "Classe do ativo": string;
  "Competencia": string;
  "Data": string;
  "Nome": string;
  "Instituicao": string;
  "Moeda": string;
  "nomeConta": string;
}

export default function DataManagement() {
  const { clientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cdiData } = useCDIData();
  const { getCotacaoByCompetencia } = usePTAXData();
  const { marketData: marketIndicators } = useMarketIndicators();
  
  const decodedClientName = clientName ? decodeURIComponent(clientName) : "";
  
  const [consolidadoData, setConsolidadoData] = useState<ConsolidadoData[]>([]);
  const [dadosData, setDadosData] = useState<DadosData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("consolidado");
  
  // Multi-selection state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<any>({});
  
  // Calculator dialog state
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorContext, setCalculatorContext] = useState<'bulk' | 'single'>('bulk');
  const [calculatorMode, setCalculatorMode] = useState<'auto' | 'manual' | 'custom' | 'market'>('auto');
  const [manualCalcData, setManualCalcData] = useState({
    competencia: '',
    indexador: 'CDI',
    percentual: 100,
    cdiOperacao: '%', // '%' ou '+'
    ipcaOperacao: '+' // Sempre '+' para IPCA
  });
  const [customCalcData, setCustomCalcData] = useState({
    valorInicial: 0,
    competencia: '', // MM/YYYY
    indexador: 'CDI' as 'CDI' | 'IPCA' | 'PRE' | 'MANUAL',
    cdiOperacao: '%' as '%' | '+', // Apenas para CDI
    percentual: 100, // Valor padrão
  });
  const [customCalcResults, setCustomCalcResults] = useState({
    percentual: 0,
    ganhoFinanceiro: 0,
    valorFinal: 0,
  });
  const [marketCalcData, setMarketCalcData] = useState({
    competencia: '',
    ticker: '',
  });
  const [marketCalcLoading, setMarketCalcLoading] = useState(false);
  const [marketCalcResult, setMarketCalcResult] = useState<{
    monthlyReturn: number;
    startPrice: number;
    endPrice: number;
    ticker: string;
  } | null>(null);
  
  // Estado para armazenar valores de texto dos campos numéricos durante edição
  const [numericFieldsText, setNumericFieldsText] = useState<{
    "Patrimonio Inicial": string;
    "Movimentação": string;
    "Impostos": string;
    "Ganho Financeiro": string;
    "Patrimonio Final": string;
    "Posicao": string;
  }>({
    "Patrimonio Inicial": '',
    "Movimentação": '',
    "Impostos": '',
    "Ganho Financeiro": '',
    "Patrimonio Final": '',
    "Posicao": ''
  });
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'Competência',
    'Instituição',
    'Nome da Conta',
    'Moeda',
    'Patrimônio Final',
    'Rendimento %',
    'Verificação',
    'Ações'
  ]));

  // Configurações de tolerância
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toleranceValue, setToleranceValue] = useState<number>(2500.00);
  const [tempToleranceValue, setTempToleranceValue] = useState<string>("2500.00");
  const [correctThreshold, setCorrectThreshold] = useState<number>(0.01);
  const [tempCorrectThreshold, setTempCorrectThreshold] = useState<string>("0.01");

  // Carregar configurações do banco ao montar o componente
  useEffect(() => {
    const loadVerificationSettings = async () => {
      const { data, error } = await supabase
        .from('verification_settings')
        .select('*')
        .single();
      
      if (data) {
        setCorrectThreshold(data.correct_threshold);
        setToleranceValue(data.tolerance_value);
        setTempCorrectThreshold(data.correct_threshold.toString());
        setTempToleranceValue(data.tolerance_value.toString());
      }
    };
    
    loadVerificationSettings();
  }, []);

  // Inicializar campos de texto quando o dialog abrir com item para edição
  useEffect(() => {
    if (editingItem && isDialogOpen) {
      setNumericFieldsText({
        "Patrimonio Inicial": editingItem["Patrimonio Inicial"] != null 
          ? formatBrazilianNumber(editingItem["Patrimonio Inicial"]) 
          : '',
        "Movimentação": editingItem["Movimentação"] != null 
          ? formatBrazilianNumber(editingItem["Movimentação"]) 
          : '',
        "Impostos": editingItem.Impostos != null 
          ? formatBrazilianNumber(editingItem.Impostos) 
          : '',
        "Ganho Financeiro": editingItem["Ganho Financeiro"] != null 
          ? formatBrazilianNumber(editingItem["Ganho Financeiro"]) 
          : '',
        "Patrimonio Final": editingItem["Patrimonio Final"] != null 
          ? formatBrazilianNumber(editingItem["Patrimonio Final"]) 
          : '',
        "Posicao": editingItem.Posicao != null 
          ? formatBrazilianNumber(editingItem.Posicao) 
          : ''
      });
    } else if (isDialogOpen) {
      // Resetar quando criar novo
      setNumericFieldsText({
        "Patrimonio Inicial": '',
        "Movimentação": '',
        "Impostos": '',
        "Ganho Financeiro": '',
        "Patrimonio Final": '',
        "Posicao": ''
      });
    }
  }, [editingItem, isDialogOpen]);

  // Todas as colunas disponíveis
  const availableColumns = [
    'Competência',
    'Instituição',
    'Nome da Conta',
    'Moeda',
    'Patrimônio Inicial',
    'Movimentação',
    'Impostos',
    'Ganho Financeiro',
    'Patrimônio Final',
    'Rendimento %',
    'Verificação',
    'Ações'
  ];

  // Helper function to get visible columns count
  const getVisibleColumnsCount = () => {
    return visibleColumns.size + 1; // +1 para o checkbox
  };

  // Advanced Filters and Sorting
  interface Filter {
    id: string;
    field: string;
    operator: string;
    value: string | number | string[];
  }

  interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
  }

  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [verifFilter, setVerifFilter] = useState<string>('all');
  const [visibleColumnsDetalhados, setVisibleColumnsDetalhados] = useState<Set<string>>(
    new Set(['Competência', 'Instituição', 'Nome da Conta', 'Moeda', 'Ativo', 'Emissor', 'Classe', 'Posição', 'Rendimento %', 'Verificação', 'Ações'])
  );
  const [showOnlyUnclassified, setShowOnlyUnclassified] = useState(false);
  const [showOnlyMissingYield, setShowOnlyMissingYield] = useState(false);

  // Ref para o input de upload de CSV
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para controlar o Dialog de exportação
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // Estado para controlar o Dialog de importação
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Estado para controlar o Dialog de exportação - Consolidado
  const [isExportDialogOpenConsolidado, setIsExportDialogOpenConsolidado] = useState(false);

  // Estado para controlar o Dialog de importação - Consolidado
  const [isImportDialogOpenConsolidado, setIsImportDialogOpenConsolidado] = useState(false);

  // Ref para o input de upload de CSV - Consolidado
  const csvFileInputRefConsolidado = useRef<HTMLInputElement>(null);

  // Mapeamento de colunas para campos do banco - Dados Consolidados
  const getFieldKeyFromColumn = (column: string): string | null => {
    const mapping: { [key: string]: string } = {
      'Competência': 'Competencia',
      'Instituição': 'Instituicao',
      'Nome da Conta': 'nomeConta',
      'Moeda': 'Moeda',
      'Patrimônio Inicial': 'Patrimonio Inicial',
      'Movimentação': 'Movimentação',
      'Impostos': 'Impostos',
      'Ganho Financeiro': 'Ganho Financeiro',
      'Patrimônio Final': 'Patrimonio Final',
      'Rendimento %': 'Rendimento',
    };
    return mapping[column] || null;
  };

  // Função para lidar com clique no header
  const handleColumnHeaderClick = (column: string) => {
    const fieldKey = getFieldKeyFromColumn(column);
    if (!fieldKey) return;
    
    if (!sortConfig || sortConfig.field !== fieldKey) {
      setSortConfig({ field: fieldKey, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field: fieldKey, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  // Função para obter o ícone de ordenação
  const getSortIcon = (column: string) => {
    const fieldKey = getFieldKeyFromColumn(column);
    if (!fieldKey || !sortConfig || sortConfig.field !== fieldKey) return null;
    
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 inline-block" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline-block" />
    );
  };

  // Função para verificar se a coluna é ordenável
  const isColumnSortable = (column: string): boolean => {
    return getFieldKeyFromColumn(column) !== null;
  };

  // Mapeamento de colunas para campos do banco - Dados Detalhados
  const getFieldKeyFromColumnDetalhados = (column: string): string | null => {
    const mapping: { [key: string]: string } = {
      'Competência': 'Competencia',
      'Instituição': 'Instituicao',
      'Nome da Conta': 'nomeConta',
      'Moeda': 'Moeda',
      'Ativo': 'Ativo',
      'Emissor': 'Emissor',
      'Classe': 'Classe do ativo',
      'Posição': 'Posicao',
      'Taxa': 'Taxa',
      'Vencimento': 'Vencimento',
      'Rendimento %': 'Rendimento',
    };
    return mapping[column] || null;
  };

  // Função para lidar com clique no header - Dados Detalhados
  const handleColumnHeaderClickDetalhados = (column: string) => {
    const fieldKey = getFieldKeyFromColumnDetalhados(column);
    if (!fieldKey) return;
    
    if (!sortConfig || sortConfig.field !== fieldKey) {
      setSortConfig({ field: fieldKey, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field: fieldKey, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  // Função para obter o ícone de ordenação - Dados Detalhados
  const getSortIconDetalhados = (column: string) => {
    const fieldKey = getFieldKeyFromColumnDetalhados(column);
    if (!fieldKey || !sortConfig || sortConfig.field !== fieldKey) return null;
    
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 inline-block" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline-block" />
    );
  };

  // Função para verificar se a coluna é ordenável - Dados Detalhados
  const isColumnSortableDetalhados = (column: string): boolean => {
    return getFieldKeyFromColumnDetalhados(column) !== null;
  };

  const handleAddFilter = (filter: Filter) => {
    setActiveFilters([...activeFilters, filter]);
  };

  const handleRemoveFilter = (id: string) => {
    if (id === 'all') {
      setActiveFilters([]);
    } else {
      setActiveFilters(activeFilters.filter(f => f.id !== id));
    }
  };
  
  // Get unique values for filtering - MEMOIZED
  const competencias = useMemo(() => 
    [...new Set([
      ...consolidadoData.map(item => item.Competencia),
      ...dadosData.map(item => item.Competencia)
    ])].filter(comp => comp && comp.trim() !== '').sort().reverse(),
    [consolidadoData, dadosData]
  );

  const instituicoes = useMemo(() =>
    [...new Set([
      ...consolidadoData.map(item => item.Instituicao),
      ...dadosData.map(item => item.Instituicao)
    ])].filter(inst => inst && inst.trim() !== '').sort(),
    [consolidadoData, dadosData]
  );

  // Get unique classes and emissores for filtering (dados detalhados) - MEMOIZED
  const classesAtivoUnique = useMemo(() => 
    [...new Set(dadosData.map(item => item["Classe do ativo"]))]
      .filter(classe => classe && classe.trim() !== '').sort(),
    [dadosData]
  );
  
  const emissores = useMemo(() =>
    [...new Set(dadosData.map(item => item.Emissor))]
      .filter(emissor => emissor && emissor.trim() !== '').sort(),
    [dadosData]
  );
  
  // Get unique values for Nome da Conta and Moeda - MEMOIZED
  const nomesContaUnique = useMemo(() =>
    [...new Set(consolidadoData.map(item => item.nomeConta))]
      .filter(nome => nome && nome.trim() !== '')
      .sort(),
    [consolidadoData]
  );

  const moedasUnique = useMemo(() =>
    [...new Set(consolidadoData.map(item => item.Moeda))]
      .filter(moeda => moeda && moeda.trim() !== '')
      .sort(),
    [consolidadoData]
  );

  const [selectedCompetencias, setSelectedCompetencias] = useState<string[]>([]);
  const [selectedInstituicoes, setSelectedInstituicoes] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedEmissores, setSelectedEmissores] = useState<string[]>([]);
  const [searchAtivo, setSearchAtivo] = useState<string>("");
  const [selectedConsolidado, setSelectedConsolidado] = useState<ConsolidadoData | null>(null);
  
  // Pagination states for Ativos tab
  const [currentPageAtivos, setCurrentPageAtivos] = useState(1);
  const [itemsPerPageAtivos, setItemsPerPageAtivos] = useState(100);
  const [classesAtivo, setClassesAtivo] = useState<string[]>([
    'CDI - Liquidez',
    'CDI - Títulos', 
    'CDI - Fundos',
    'Inflação - Títulos',
    'Inflação - Fundos',
    'Pré Fixado - Títulos',
    'Pré Fixado - Fundos',
    'Multimercado',
    'Imobiliário - Ativos',
    'Imobiliário - Fundos',
    'Ações - Ativos',
    'Ações - ETFs',
    'Ações - Fundos',
    'Ações - Long Biased',
    'Private Equity/Venture Capital/Special Sits',
    'Exterior - Renda Fixa',
    'Exterior - Ações',
    'COE',
    'Criptoativos',
    'Ouro'
  ]);

  useEffect(() => {
    fetchData();
    fetchClassesAtivo();
  }, [decodedClientName]);

  const fetchClassesAtivo = async () => {
    try {
      console.log('Classes de ativo carregadas:', VALID_ASSET_CLASSES);
      setClassesAtivo([...VALID_ASSET_CLASSES]);
    } catch (error) {
      console.error('Erro ao buscar classes de ativo:', error);
    }
  };

  // Verifica se o ativo tem rentabilidade preenchida e diferente de zero
  const hasValidYield = (rendimento: any): boolean => {
    // Verificar se está vazio, null, undefined
    if (rendimento == null) return false;
    
    // Se for string, verificar se está vazia ou é apenas "-"
    if (typeof rendimento === 'string') {
      const trimmed = rendimento.trim();
      if (trimmed === '' || trimmed === '-') return false;
    }
    
    // Converter para número se for string
    const numericValue = typeof rendimento === 'string' 
      ? parseBrazilianNumber(rendimento) 
      : rendimento;
    
    // Se for zero, considerar como inválido (sem rentabilidade)
    if (numericValue === 0) return false;
    
    return true;
  };

  const fetchData = async () => {
    if (!decodedClientName) return;

    try {
      setLoading(true);
      
      const [consolidadoResponse, dadosResponse] = await Promise.all([
        supabase
          .from('ConsolidadoPerformance')
          .select('*')
          .eq('Nome', decodedClientName)
          .order('Competencia', { ascending: false }),
        supabase
          .from('DadosPerformance')
          .select('*')
          .eq('Nome', decodedClientName)
          .order('Competencia', { ascending: false })
      ]);

      if (consolidadoResponse.error) throw consolidadoResponse.error;
      if (dadosResponse.error) throw dadosResponse.error;

      setConsolidadoData((consolidadoResponse.data || []) as any[]);
      setDadosData((dadosResponse.data || []) as any[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular rentabilidade ponderada automaticamente
  const calculateWeightedReturn = () => {
    let registrosParaCalcular: any[] = [];
    
    // Determinar quais registros consolidados usar baseado no contexto
    if (calculatorContext === 'bulk') {
      registrosParaCalcular = consolidadoData.filter(item => selectedItems.has(item.id));
      
      if (registrosParaCalcular.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum registro selecionado",
          variant: "destructive",
        });
        return null;
      }
    } else if (calculatorContext === 'single') {
      // No modo single, usar o registro sendo editado
      if (!editingItem || !editingItem.Competencia) {
        toast({
          title: "Erro",
          description: "Registro inválido para cálculo",
          variant: "destructive",
        });
        return null;
      }
      registrosParaCalcular = [editingItem];
    }

    let totalPosicao = 0;
    let weightedRendimento = 0;
    let totalAtivosEncontrados = 0;

    registrosParaCalcular.forEach(consolidado => {
      const matchingDetalhados = dadosData.filter(dado => 
        dado.Competencia === consolidado.Competencia &&
        dado.Instituicao === consolidado.Instituicao &&
        dado.nomeConta === consolidado.nomeConta
      );

      totalAtivosEncontrados += matchingDetalhados.length;

      matchingDetalhados.forEach(detalhado => {
        const posicao = detalhado.Posicao || 0;
        const rendimento = typeof detalhado.Rendimento === 'number' ? detalhado.Rendimento : 0;
        
        totalPosicao += posicao;
        weightedRendimento += posicao * rendimento;
      });
    });

    if (totalPosicao === 0) {
      toast({
        title: "Aviso",
        description: `Nenhum ativo detalhado encontrado para o${registrosParaCalcular.length > 1 ? 's' : ''} registro${registrosParaCalcular.length > 1 ? 's' : ''} ${calculatorContext === 'single' ? 'selecionado' : 'selecionados'}`,
        variant: "destructive",
      });
      return null;
    }

    const rendimentoPonderado = weightedRendimento / totalPosicao;
    
    toast({
      title: "Cálculo Realizado",
      description: `${totalAtivosEncontrados} ativo${totalAtivosEncontrados !== 1 ? 's' : ''} encontrado${totalAtivosEncontrados !== 1 ? 's' : ''}. Rentabilidade ponderada: ${(rendimentoPonderado * 100).toFixed(4)}%`,
    });

    return rendimentoPonderado;
  };

  // Função auxiliar para contar ativos vinculados
  const getLinkedAssetsCount = () => {
    if (calculatorContext === 'bulk') {
      const selectedConsolidados = consolidadoData.filter(item => selectedItems.has(item.id));
      let totalAtivos = 0;
      
      selectedConsolidados.forEach(consolidado => {
        const matchingDetalhados = dadosData.filter(dado => 
          dado.Competencia === consolidado.Competencia &&
          dado.Instituicao === consolidado.Instituicao &&
          dado.nomeConta === consolidado.nomeConta
        );
        totalAtivos += matchingDetalhados.length;
      });
      
      return totalAtivos;
    } else if (calculatorContext === 'single') {
      if (!editingItem || !editingItem.Competencia) return 0;
      
      const matchingDetalhados = dadosData.filter(dado => 
        dado.Competencia === editingItem.Competencia &&
        dado.Instituicao === editingItem.Instituicao &&
        dado.nomeConta === editingItem.nomeConta
      );
      
      return matchingDetalhados.length;
    }
    
    return 0;
  };

  // Função para calcular rentabilidade baseada em indexador
  const calculateManualReturn = () => {
    const { competencia, indexador, percentual } = manualCalcData;

    if (!competencia) {
      toast({
        title: "Erro",
        description: "Por favor, informe a competência",
        variant: "destructive",
      });
      return null;
    }

    const competenciaRegex = /^\d{2}\/\d{4}$/;
    if (!competenciaRegex.test(competencia)) {
      toast({
        title: "Erro",
        description: "Competência deve estar no formato MM/YYYY",
        variant: "destructive",
      });
      return null;
    }

    let baseReturn = 0;

    if (indexador === 'CDI') {
      const cdiRecord = cdiData.find(record => record.competencia === competencia);
      
      if (!cdiRecord) {
        toast({
          title: "Erro",
          description: `Dados do CDI não encontrados para ${competencia}`,
          variant: "destructive",
        });
        return null;
      }

      const cdiMensal = cdiRecord.cdiRate; // Taxa mensal do CDI
      
      if (manualCalcData.cdiOperacao === '%') {
        // Modo Percentual: X% do CDI
        baseReturn = cdiMensal * (percentual / 100);
        
        toast({
          title: "Cálculo Realizado",
          description: `${percentual}% do CDI em ${competencia}: ${(baseReturn * 100).toFixed(2)}%`,
        });
        
      } else {
        // Modo Soma: 100% do CDI + X% a.a.
        // Converter o spread anual para mensal
        const spreadAnual = percentual / 100;
        const spreadMensal = Math.pow(1 + spreadAnual, 1/12) - 1;
        
        // 100% do CDI + spread mensal
        baseReturn = cdiMensal + spreadMensal;
        
        toast({
          title: "Cálculo Realizado",
          description: `CDI (${(cdiMensal * 100).toFixed(2)}%) + ${percentual}% a.a. (${(spreadMensal * 100).toFixed(2)}% a.m.) = ${(baseReturn * 100).toFixed(2)}%`,
        });
      }
      
      return baseReturn;
      
    } else if (indexador === 'IPCA') {
      // Buscar taxa do IPCA para a competência
      const ipcaRecord = marketIndicators.find(record => record.competencia === competencia);
      
      if (!ipcaRecord || ipcaRecord.ipca === null) {
        toast({
          title: "Erro",
          description: `Dados do IPCA não encontrados para ${competencia}`,
          variant: "destructive",
        });
        return null;
      }

      const ipcaMensal = ipcaRecord.ipca; // Taxa mensal do IPCA
      
      // Modo Soma: 100% do IPCA + X% a.a.
      // Converter o spread anual para mensal
      const spreadAnual = percentual / 100;
      const spreadMensal = Math.pow(1 + spreadAnual, 1/12) - 1;
      
      // 100% do IPCA + spread mensal
      baseReturn = ipcaMensal + spreadMensal;
      
      toast({
        title: "Cálculo Realizado",
        description: `IPCA (${(ipcaMensal * 100).toFixed(2)}%) + ${percentual}% a.a. (${(spreadMensal * 100).toFixed(2)}% a.m.) = ${(baseReturn * 100).toFixed(2)}%`,
      });
      
      return baseReturn;
      
    } else if (indexador === 'PRE') {
      const taxaAnual = percentual / 100;
      const taxaMensal = Math.pow(1 + taxaAnual, 1/12) - 1;
      
      toast({
        title: "Cálculo Realizado",
        description: `Pré-fixado ${percentual}% a.a. = ${(taxaMensal * 100).toFixed(2)}% no mês`,
      });
      
      return taxaMensal;
    }

    return null;
  };

  const handleCreateFromRecord = (item: any, type: 'consolidado' | 'dados') => {
    if (type === 'consolidado') {
      // Criar novo registro Consolidado baseado no item
      setEditingItem({
        id: '',  // ID vazio indica novo registro
        Nome: clientName,
        Competencia: '',  // Competência em branco para ser preenchida
        Instituicao: item.Instituicao,
        nomeConta: item.nomeConta || '',
        Moeda: item.Moeda || '',
        "Patrimonio Inicial": item["Patrimonio Final"] || 0,
        "Movimentação": 0,
        Impostos: 0,
        "Ganho Financeiro": 0,
        "Patrimonio Final": 0,
        Rendimento: 0,
        type: 'consolidado'
      });
    } else {
      // Criar novo registro Dados Detalhados baseado no item
      setEditingItem({
        id: '',  // ID vazio indica novo registro
        Nome: clientName,
        Competencia: '',  // Competência em branco para ser preenchida
        Instituicao: item.Instituicao,
        nomeConta: item.nomeConta || '',
        Moeda: item.Moeda || '',
        Ativo: item.Ativo || '',
        Emissor: item.Emissor || '',
        "Classe do ativo": item["Classe do ativo"] || '',
        Posicao: item.Posicao || 0,
        Taxa: item.Taxa || '',
        Vencimento: item.Vencimento || '',
        Rendimento: 0,
        type: 'dados'
      });
    }
    
    setIsDialogOpen(true);
  };

  const calculateCustomReturn = () => {
    const { valorInicial, competencia, indexador, cdiOperacao, percentual } = customCalcData;
    
    // Validações
    if (valorInicial <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, informe um valor inicial válido",
        variant: "destructive",
      });
      return null;
    }
    
    if (!competencia) {
      toast({
        title: "Erro",
        description: "Por favor, informe a competência",
        variant: "destructive",
      });
      return null;
    }
    
    const competenciaRegex = /^\d{2}\/\d{4}$/;
    if (!competenciaRegex.test(competencia)) {
      toast({
        title: "Erro",
        description: "Competência deve estar no formato MM/YYYY",
        variant: "destructive",
      });
      return null;
    }
    
    let taxaMensal = 0; // Taxa mensal em decimal (ex: 0.0085 para 0.85%)
    let descricaoCalculo = '';
    
    // Cálculo conforme indexador (igual ao modo Manual)
    if (indexador === 'CDI') {
      const cdiRecord = cdiData.find(record => record.competencia === competencia);
      
      if (!cdiRecord) {
        toast({
          title: "Erro",
          description: `Dados do CDI não encontrados para ${competencia}`,
          variant: "destructive",
        });
        return null;
      }
      
      const cdiMensal = cdiRecord.cdiRate;
      
      if (cdiOperacao === '%') {
        taxaMensal = cdiMensal * (percentual / 100);
        descricaoCalculo = `${percentual}% do CDI (${(cdiMensal * 100).toFixed(2)}%) = ${(taxaMensal * 100).toFixed(2)}%`;
      } else {
        const spreadAnual = percentual / 100;
        const spreadMensal = Math.pow(1 + spreadAnual, 1/12) - 1;
        taxaMensal = cdiMensal + spreadMensal;
        descricaoCalculo = `CDI (${(cdiMensal * 100).toFixed(2)}%) + ${percentual}% a.a. (${(spreadMensal * 100).toFixed(2)}% a.m.) = ${(taxaMensal * 100).toFixed(2)}%`;
      }
      
    } else if (indexador === 'IPCA') {
      const ipcaRecord = marketIndicators.find(record => record.competencia === competencia);
      
      if (!ipcaRecord || ipcaRecord.ipca === null) {
        toast({
          title: "Erro",
          description: `Dados do IPCA não encontrados para ${competencia}`,
          variant: "destructive",
        });
        return null;
      }
      
      const ipcaMensal = ipcaRecord.ipca;
      const spreadAnual = percentual / 100;
      const spreadMensal = Math.pow(1 + spreadAnual, 1/12) - 1;
      taxaMensal = ipcaMensal + spreadMensal;
      descricaoCalculo = `IPCA (${(ipcaMensal * 100).toFixed(2)}%) + ${percentual}% a.a. (${(spreadMensal * 100).toFixed(2)}% a.m.) = ${(taxaMensal * 100).toFixed(2)}%`;
      
    } else if (indexador === 'MANUAL') {
      // Rentabilidade manual: usuário informa diretamente o percentual mensal
      taxaMensal = percentual / 100;
      descricaoCalculo = `Rentabilidade manual: ${percentual.toFixed(2)}% no mês`;
      
    } else if (indexador === 'PRE') {
      const taxaAnual = percentual / 100;
      taxaMensal = Math.pow(1 + taxaAnual, 1/12) - 1;
      descricaoCalculo = `Pré-fixado ${percentual}% a.a. = ${(taxaMensal * 100).toFixed(2)}% no mês`;
    }
    
    // Cálculos financeiros
    const ganhoFinanceiro = valorInicial * taxaMensal;
    const valorFinal = valorInicial + ganhoFinanceiro;
    const percentualDisplay = taxaMensal * 100; // Para exibir como %
    
    setCustomCalcResults({
      percentual: percentualDisplay,
      ganhoFinanceiro: ganhoFinanceiro,
      valorFinal: valorFinal,
    });
    
    toast({
      title: "Cálculo Realizado",
      description: (
        <div className="space-y-1">
          <p><strong>Competência:</strong> {competencia}</p>
          <p><strong>Cálculo:</strong> {descricaoCalculo}</p>
          <p><strong>Valor Inicial:</strong> R$ {valorInicial.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p><strong>Ganho Financeiro:</strong> R$ {ganhoFinanceiro.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p><strong>Valor Final:</strong> R$ {valorFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
      ),
    });
    
    // Retorna objeto completo com todos os dados calculados
    return {
      taxaMensal,
      valorInicial,
      ganhoFinanceiro,
      valorFinal,
      competencia
    };
  };

  // Função para buscar dados do mercado usando Yahoo Finance
  const handleFetchMarketData = async () => {
    if (!marketCalcData.ticker || !marketCalcData.competencia) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o ticker e a competência",
        variant: "destructive",
      });
      return;
    }

    setMarketCalcLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-stock-return', {
        body: {
          ticker: marketCalcData.ticker,
          competencia: marketCalcData.competencia,
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setMarketCalcResult({
        monthlyReturn: data.monthlyReturn,
        startPrice: data.startPrice,
        endPrice: data.endPrice,
        ticker: data.ticker,
      });

      toast({
        title: "Dados obtidos com sucesso!",
        description: `Rentabilidade de ${data.ticker}: ${data.monthlyReturn.toFixed(2)}%`,
      });

    } catch (error: any) {
      toast({
        title: "Erro ao buscar dados",
        description: error.message || "Verifique o ticker e tente novamente",
        variant: "destructive",
      });
      setMarketCalcResult(null);
    } finally {
      setMarketCalcLoading(false);
    }
  };


  // Função para confirmar e aplicar o cálculo ao campo Rendimento
  const handleCalculatorConfirm = () => {
    let calculatedReturn: number | null = null;
    let customData: any = null; // Para armazenar dados extras do modo Personalizado

    if (calculatorMode === 'auto') {
      calculatedReturn = calculateWeightedReturn();
    } else if (calculatorMode === 'manual') {
      calculatedReturn = calculateManualReturn();
    } else if (calculatorMode === 'custom') {
      const result = calculateCustomReturn();
      if (result) {
        calculatedReturn = result.taxaMensal;
        customData = result; // Armazena todos os dados calculados
      }
    } else if (calculatorMode === 'market') {
      // Usar o resultado já buscado
      if (marketCalcResult) {
        calculatedReturn = marketCalcResult.monthlyReturn / 100; // Converter de % para decimal
      } else {
        toast({
          title: "Busque os dados primeiro",
          description: "Clique em 'Buscar Rentabilidade' antes de confirmar",
          variant: "destructive",
        });
        return;
      }
    }


    if (calculatedReturn !== null) {
      // Arredondar para 4 casas decimais (resultará em 2 casas quando exibido como %)
      const roundedReturn = Math.round(calculatedReturn * 10000) / 10000;
      
      // Atualizar dependendo do contexto
      if (calculatorContext === 'bulk') {
        // Para edição em lote
        if (calculatorMode === 'custom' && customData) {
          setBulkEditData({
            ...bulkEditData, 
            Rendimento: roundedReturn,
            Competencia: customData.competencia,
            "Patrimonio Inicial": customData.valorInicial,
            "Ganho Financeiro": customData.ganhoFinanceiro,
            "Patrimonio Final": customData.valorFinal
          });
        } else {
          setBulkEditData({...bulkEditData, Rendimento: roundedReturn});
        }
        
      } else if (calculatorContext === 'single') {
        // Para edição/criação individual
        if (calculatorMode === 'custom' && customData) {
          // Verificar se estamos no formulário Consolidado ou Dados Detalhados
          const hasConsolidadoFields = 'Patrimonio Inicial' in editingItem || editingItem.type === 'consolidado';
          
          if (hasConsolidadoFields) {
            // Formulário Consolidado: preenche todos os campos
            setEditingItem({
              ...editingItem, 
              Rendimento: roundedReturn,
              Competencia: customData.competencia,
              "Patrimonio Inicial": customData.valorInicial,
              "Ganho Financeiro": customData.ganhoFinanceiro,
              "Patrimonio Final": customData.valorFinal
            });
          } else {
            // Formulário Dados Detalhados: preenche Rendimento, Competência e Posição
            setEditingItem({
              ...editingItem, 
              Rendimento: roundedReturn,
              Competencia: customData.competencia,
              Posicao: customData.valorFinal
            });
          }
        } else {
          setEditingItem({...editingItem, Rendimento: roundedReturn});
        }
      }
      
      setIsCalculatorOpen(false);
    }
  };

  const handleEdit = useCallback((item: any, type: 'consolidado' | 'dados') => {
    setEditingItem({ ...item, type });
    setIsDialogOpen(true);
  }, []);

  // Limpar filtros ao mudar de aba
  useEffect(() => {
    setActiveFilters([]);
    setSortConfig(null);
  }, [activeTab]);

  const handleCreate = (type: 'consolidado' | 'dados') => {
    const newItem = type === 'consolidado' 
      ? {
          "Patrimonio Inicial": 0,
          "Movimentação": 0,
          "Impostos": 0,
          "Ganho Financeiro": 0,
          "Patrimonio Final": 0,
          "Rendimento": 0,
          "Competencia": "",
          "Data": "",
          "Nome": decodedClientName,
          "Instituicao": "",
          type: 'consolidado'
        }
      : {
          "Posicao": 0,
          "Vencimento": "",
          "Rendimento": 0,
          "Taxa": "",
          "Ativo": "",
          "Emissor": "",
          "Classe do ativo": "",
          "Competencia": "",
          "Data": "",
          "Nome": decodedClientName,
          "Instituicao": "",
          type: 'dados'
        };
    
    setEditingItem(newItem);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;

    try {
      console.log('Saving item:', editingItem);
      const { type, ...itemData } = editingItem;
      const tableName = type === 'consolidado' ? 'ConsolidadoPerformance' : 'DadosPerformance';
      
      // Remove undefined values and prepare data properly
      const cleanedData = Object.fromEntries(
        Object.entries(itemData).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      console.log('Cleaned data:', cleanedData);
      console.log('Table name:', tableName);

      if (editingItem.id) {
        // Update existing
        console.log('Updating existing record with ID:', editingItem.id);
        const { data, error } = await supabase
          .from(tableName)
          .update(cleanedData)
          .eq('id', editingItem.id)
          .select();

        console.log('Update response:', { data, error });
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Registro atualizado com sucesso",
        });
      } else {
        // Create new
        console.log('Creating new record');
        // Ensure required fields are present
        cleanedData.Nome = decodedClientName;
        
        const { data, error } = await supabase
          .from(tableName)
          .insert([cleanedData])
          .select();

        console.log('Insert response:', { data, error });
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Registro criado com sucesso",
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      await fetchData(); // Wait for data to be fetched
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: `Erro ao salvar registro: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number, type: 'consolidado' | 'dados') => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const tableName = type === 'consolidado' ? 'ConsolidadoPerformance' : 'DadosPerformance';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro excluído com sucesso",
      });
      
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir registro",
        variant: "destructive",
      });
    }
  };

  // Multi-selection functions - OPTIMIZED
  const toggleItemSelection = useCallback((id: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);


  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleBulkEdit = () => {
    setIsBulkEditOpen(true);
    setBulkEditData({});
  };

  const handleBulkSave = async () => {
    if (selectedItems.size === 0) return;

    try {
      const tableName = activeTab === 'consolidado' ? 'ConsolidadoPerformance' : 'DadosPerformance';
      const cleanedData = Object.fromEntries(
        Object.entries(bulkEditData).filter(([_, value]) => 
          value !== undefined && value !== '' && value !== 'no-change'
        )
      );

      if (Object.keys(cleanedData).length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum campo foi preenchido para edição",
          variant: "destructive",
        });
        return;
      }

      const updatePromises = Array.from(selectedItems).map(id =>
        supabase
          .from(tableName)
          .update(cleanedData)
          .eq('id', id)
      );

      await Promise.all(updatePromises);

      toast({
        title: "Sucesso",
        description: `${selectedItems.size} registros atualizados com sucesso`,
      });

      setIsBulkEditOpen(false);
      setBulkEditData({});
      setSelectedItems(new Set());
      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar registros em lote",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.size} registros?`)) return;

    try {
      const tableName = activeTab === 'consolidado' ? 'ConsolidadoPerformance' : 'DadosPerformance';
      
      const deletePromises = Array.from(selectedItems).map(id =>
        supabase
          .from(tableName)
          .delete()
          .eq('id', id)
      );

      await Promise.all(deletePromises);

      toast({
        title: "Sucesso",
        description: `${selectedItems.size} registros excluídos com sucesso`,
      });

      setSelectedItems(new Set());
      await fetchData();
    } catch (error) {
      console.error('Erro ao excluir em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir registros em lote",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number, currency: string = 'Real') => {
    const currencyCode = currency === 'Dolar' ? 'USD' : 'BRL';
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    }).format(value || 0);
    
    // Substitui "US$" por "U$" para seguir formato brasileiro
    return formatted.replace('US$', 'U$');
  };

  const formatPercentage = (value: number) => {
    return ((value || 0) * 100).toFixed(2).replace('.', ',') + '%';
  };

  // Advanced filtering logic - Generic version
  const applyFiltersGeneric = <T extends Record<string, any>>(data: T[], filters: Filter[]) => {
    return data.filter(item => {
      return filters.every(filter => {
        const fieldValue = item[filter.field as keyof T];
        
        switch (filter.operator) {
          case 'equals':
            return fieldValue === filter.value;
          case 'notEquals':
            return fieldValue !== filter.value;
          case 'contains':
            if (Array.isArray(filter.value)) {
              return filter.value.some(val => 
                String(fieldValue).toLowerCase().includes(String(val).toLowerCase())
              );
            }
            return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'notContains':
            if (Array.isArray(filter.value)) {
              return !filter.value.some(val => 
                String(fieldValue).toLowerCase().includes(String(val).toLowerCase())
              );
            }
            return !String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greaterThan':
            return Number(fieldValue) > Number(filter.value);
          case 'greaterThanOrEqual':
            return Number(fieldValue) >= Number(filter.value);
          case 'lessThan':
            return Number(fieldValue) < Number(filter.value);
          case 'lessThanOrEqual':
            return Number(fieldValue) <= Number(filter.value);
          case 'isEmpty':
            return !fieldValue || fieldValue === '';
          case 'isNotEmpty':
            return fieldValue && fieldValue !== '';
          default:
            return true;
        }
      });
    });
  };

  // Sorting logic - Generic version
  const applySortingGeneric = <T extends Record<string, any>>(data: T[], sortConfig: SortConfig | null) => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.field as keyof T];
      const bValue = b[sortConfig.field as keyof T];
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      let comparison = 0;
      
      // Tratamento especial para campo Competencia (formato MM/YYYY)
      if (sortConfig.field === 'Competencia') {
        // Converter MM/YYYY para formato comparável YYYYMM
        const parseCompetencia = (comp: string) => {
          const [month, year] = String(comp).split('/');
          return `${year}${month.padStart(2, '0')}`;
        };
        
        const aComp = parseCompetencia(String(aValue));
        const bComp = parseCompetencia(String(bValue));
        comparison = aComp.localeCompare(bComp);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'pt-BR');
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Helper functions for filters
  const operatorsByFieldType: { [key: string]: Array<{ value: string; label: string }> } = {
    text: [
      { value: 'equals', label: 'é' },
      { value: 'notEquals', label: 'não é' },
      { value: 'contains', label: 'contém' },
      { value: 'notContains', label: 'não contém' },
      { value: 'isEmpty', label: 'está vazio' },
      { value: 'isNotEmpty', label: 'não está vazio' }
    ],
    number: [
      { value: 'equals', label: '=' },
      { value: 'notEquals', label: '≠' },
      { value: 'greaterThan', label: '>' },
      { value: 'greaterThanOrEqual', label: '≥' },
      { value: 'lessThan', label: '<' },
      { value: 'lessThanOrEqual', label: '≤' },
      { value: 'isEmpty', label: 'está vazio' },
      { value: 'isNotEmpty', label: 'não está vazio' }
    ]
  };

  // Campos filtráveis para aba CONSOLIDADO
  const filterableFieldsConsolidado = useMemo(() => [
    { key: 'Competencia', label: 'Competência', type: 'text', options: competencias },
    { key: 'Instituicao', label: 'Instituição', type: 'text', options: instituicoes },
    { key: 'nomeConta', label: 'Nome da Conta', type: 'text', options: nomesContaUnique },
    { key: 'Moeda', label: 'Moeda', type: 'text', options: moedasUnique },
    { key: 'Patrimonio Inicial', label: 'Patrimônio Inicial', type: 'number' },
    { key: 'Movimentação', label: 'Movimentação', type: 'number' },
    { key: 'Impostos', label: 'Impostos', type: 'number' },
    { key: 'Ganho Financeiro', label: 'Ganho Financeiro', type: 'number' },
    { key: 'Patrimonio Final', label: 'Patrimônio Final', type: 'number' },
    { key: 'Rendimento', label: 'Rendimento %', type: 'number' }
  ], [competencias, instituicoes, nomesContaUnique, moedasUnique]);

  // Campos filtráveis para aba ATIVOS
  const filterableFieldsAtivos = useMemo(() => [
    { key: 'Competencia', label: 'Competência', type: 'text', options: competencias },
    { key: 'Instituicao', label: 'Instituição', type: 'text', options: instituicoes },
    { key: 'nomeConta', label: 'Nome da Conta', type: 'text', options: nomesContaUnique },
    { key: 'Moeda', label: 'Moeda', type: 'text', options: moedasUnique },
    { key: 'Ativo', label: 'Ativo', type: 'text' },
    { key: 'Emissor', label: 'Emissor', type: 'text', options: emissores },
    { key: 'Classe do ativo', label: 'Classe', type: 'text', options: classesAtivoUnique },
    { key: 'Posicao', label: 'Posição', type: 'number' },
    { key: 'Taxa', label: 'Taxa', type: 'number' },
    { key: 'Vencimento', label: 'Vencimento', type: 'text' },
    { key: 'Rendimento', label: 'Rendimento %', type: 'number' }
  ], [competencias, instituicoes, nomesContaUnique, moedasUnique, emissores, classesAtivoUnique]);

  // Helper para obter os campos filtráveis baseado na aba ativa
  const getFilterableFields = () => {
    return activeTab === 'detalhados' ? filterableFieldsAtivos : filterableFieldsConsolidado;
  };

  const getFieldType = (fieldKey: string) => {
    const allFields = [...filterableFieldsConsolidado, ...filterableFieldsAtivos];
    const field = allFields.find(f => f.key === fieldKey);
    return field?.type || 'text';
  };

  const getFieldLabel = (fieldKey: string) => {
    const allFields = [...filterableFieldsConsolidado, ...filterableFieldsAtivos];
    const field = allFields.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  };

  const getOperatorLabel = (operator: string) => {
    const allOperators = [...operatorsByFieldType.text, ...operatorsByFieldType.number];
    const op = allOperators.find(o => o.value === operator);
    return op?.label || operator;
  };

  const formatFilterValue = (value: string | number | string[], fieldKey: string) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return '(vazio)';
      if (value.length === 1) return value[0];
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 2).join(', ')} +${value.length - 2}`;
    }
    
    const fieldType = getFieldType(fieldKey);
    if (fieldType === 'number' && typeof value === 'number') {
      return formatCurrency(value);
    }
    return String(value);
  };

  const getFieldOptions = (fieldKey: string) => {
    const allFields = [...filterableFieldsConsolidado, ...filterableFieldsAtivos];
    const field = allFields.find(f => f.key === fieldKey);
    return (field as any)?.options || null;
  };

interface VerificationResult {
  status: 'match' | 'tolerance' | 'mismatch' | 'no-data';
  consolidatedValue: number;
  detailedSum: number;
  difference: number;
  detailedCount: number;
  unclassifiedCount: number;
  hasUnclassified: boolean;
  missingYieldCount: number;
  hasMissingYield: boolean;
}

  // OPTIMIZED: Create index of assets by composite key - HUGE PERFORMANCE GAIN
  const dadosIndex = useMemo(() => {
    const index = new Map<string, DadosData[]>();
    dadosData.forEach(item => {
      const key = `${item.Competencia}-${item.Instituicao}-${item.nomeConta}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push(item);
    });
    return index;
  }, [dadosData]);

  // Valida se uma classe de ativo está na lista de opções válidas do dropdown
  const isValidAssetClass = useCallback((classe: string | null | undefined): boolean => {
    if (!classe || classe.trim() === '') return false;
    return VALID_ASSET_CLASSES.includes(classe as any);
  }, []);

  // OPTIMIZED: Verification function using index
  const verifyIntegrity = useCallback((
    competencia: string, 
    instituicao: string, 
    nomeConta: string,
    patrimonioFinal: number
  ): VerificationResult => {
    const key = `${competencia}-${instituicao}-${nomeConta}`;
    const relatedDetails = dadosIndex.get(key) || [];
    
    // Somar todas as posições
    const detailedSum = relatedDetails.reduce((sum, item) => sum + (item.Posicao || 0), 0);
    
    // Contar ativos não classificados ou com classes inválidas
    const unclassifiedCount = relatedDetails.filter(item => 
      !isValidAssetClass(item["Classe do ativo"])
    ).length;
    
    // Contar ativos sem rentabilidade preenchida
    const missingYieldCount = relatedDetails.filter(item => {
      const rendimento = item.Rendimento;
      
      // Verificar se está vazio, null, undefined, ou é apenas "-"
      if (rendimento == null) return true;
      
      // Se for string, verificar se está vazia, é "-", ou é "0"
      if (typeof rendimento === 'string') {
        const trimmed = rendimento.trim();
        if (trimmed === '' || trimmed === '-') return true;
        
        // Verificar se é "0", "0.0", "0.00", etc
        const numValue = parseFloat(trimmed);
        if (!isNaN(numValue) && numValue === 0) return true;
      }
      
      // Se for número, verificar se é exatamente 0
      if (typeof rendimento === 'number' && rendimento === 0) return true;
      
      return false;
    }).length;
    
    // Calcular diferença
    const difference = Math.abs(patrimonioFinal - detailedSum);
    
    // Determinar status
    let status: VerificationResult['status'];
    if (relatedDetails.length === 0) {
      status = 'no-data';
    } else if (difference < correctThreshold) {
      status = 'match';
    } else if (difference < toleranceValue) {
      status = 'tolerance';
    } else {
      status = 'mismatch';
    }
    
    return {
      status,
      consolidatedValue: patrimonioFinal,
      detailedSum,
      difference,
      detailedCount: relatedDetails.length,
      unclassifiedCount,
      hasUnclassified: unclassifiedCount > 0,
      missingYieldCount,
      hasMissingYield: missingYieldCount > 0
    };
  }, [dadosIndex, correctThreshold, toleranceValue]);

  // FASE 1: CACHE - Pré-calcular todas as verificações UMA ÚNICA VEZ
  const verificationsCache = useMemo(() => {
    const cache = new Map<string, VerificationResult>();
    
    consolidadoData.forEach(item => {
      const key = `${item.Competencia}-${item.Instituicao}-${item.nomeConta}`;
      cache.set(key, verifyIntegrity(
        item.Competencia,
        item.Instituicao,
        item.nomeConta,
        item["Patrimonio Final"]
      ));
    });
    
    return cache;
  }, [consolidadoData, verifyIntegrity]);

  // Helper para buscar verificação no cache
  const getVerification = useCallback((item: ConsolidadoData): VerificationResult => {
    const key = `${item.Competencia}-${item.Instituicao}-${item.nomeConta}`;
    return verificationsCache.get(key) || {
      status: 'no-data',
      consolidatedValue: item["Patrimonio Final"],
      detailedSum: 0,
      difference: 0,
      detailedCount: 0,
      unclassifiedCount: 0,
      hasUnclassified: false,
      missingYieldCount: 0,
      hasMissingYield: false
    };
  }, [verificationsCache]);

  // OPTIMIZED: Filter data with advanced filters - MEMOIZED + Using cache
  const filteredConsolidadoData = useMemo(() => {
    let data = consolidadoData;
    
    // Apply old filters for backward compatibility
    if (selectedCompetencias.length > 0) {
      data = data.filter(item => selectedCompetencias.includes(item.Competencia));
    }
    if (selectedInstituicoes.length > 0) {
      data = data.filter(item => selectedInstituicoes.includes(item.Instituicao));
    }
    
    // Apply advanced filters
    data = applyFiltersGeneric(data, activeFilters);
    
    // Apply verification filter - USING CACHE
    if (verifFilter !== 'all') {
      data = data.filter(item => {
        const verification = getVerification(item);
        return verification.status === verifFilter;
      });
    }
    
    // Apply sorting
    data = applySortingGeneric(data, sortConfig);
    
    return data;
  }, [consolidadoData, selectedCompetencias, selectedInstituicoes, activeFilters, verifFilter, sortConfig, getVerification]);

  const unclassifiedStats = useMemo(() => {
    return filteredConsolidadoData.reduce((acc, item) => {
      const verification = getVerification(item);
      if (verification.hasUnclassified) {
        acc.recordsWithUnclassified++;
        acc.totalUnclassified += verification.unclassifiedCount;
      }
      return acc;
    }, { recordsWithUnclassified: 0, totalUnclassified: 0 });
  }, [filteredConsolidadoData, getVerification]);

  // OPTIMIZED: Filter dados detalhados - MEMOIZED
  const filteredDadosData = useMemo(() => {
    let data = dadosData;
    
    if (selectedCompetencias.length > 0) {
      data = data.filter(item => selectedCompetencias.includes(item.Competencia));
    }
    if (selectedInstituicoes.length > 0) {
      data = data.filter(item => selectedInstituicoes.includes(item.Instituicao));
    }

    // Apply additional filters for dados detalhados
    if (selectedClasses.length > 0) {
      data = data.filter(item => selectedClasses.includes(item["Classe do ativo"]));
    }
    if (selectedEmissores.length > 0) {
      data = data.filter(item => selectedEmissores.includes(item.Emissor));
    }

    // Apply advanced filters
    data = applyFiltersGeneric(data, activeFilters);

    // Apply search filter for ativos
    if (searchAtivo.trim()) {
      const searchLower = searchAtivo.toLowerCase();
      data = data.filter(item => 
        item.Ativo?.toLowerCase().includes(searchLower) ||
        item.Emissor?.toLowerCase().includes(searchLower) ||
        item["Classe do ativo"]?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter for quality issues
    if (showOnlyUnclassified || showOnlyMissingYield) {
      data = data.filter(item => {
        const isUnclassified = showOnlyUnclassified && !isValidAssetClass(item["Classe do ativo"]);
        const hasMissingYield = showOnlyMissingYield && (() => {
          const rendimento = item.Rendimento;
          
          // Verificar se está vazio, null, undefined
          if (rendimento == null) return true;
          
          // Se for string
          if (typeof rendimento === 'string') {
            const trimmed = rendimento.trim();
            if (trimmed === '' || trimmed === '-') return true;
            
            // Verificar se é "0", "0.0", "0.00", etc
            const numValue = parseFloat(trimmed);
            if (!isNaN(numValue) && numValue === 0) return true;
          }
          
          // Se for número, verificar se é exatamente 0
          if (typeof rendimento === 'number' && rendimento === 0) return true;
          
          return false;
        })();
        
        // Se ambos filtros estão ativos, mostrar itens que atendem pelo menos um
        if (showOnlyUnclassified && showOnlyMissingYield) {
          return isUnclassified || hasMissingYield;
        }
        // Se apenas um filtro está ativo, retornar apenas esse
        return isUnclassified || hasMissingYield;
      });
    }
    
    // Apply sorting
    data = applySortingGeneric(data, sortConfig);
    
    return data;
  }, [dadosData, selectedCompetencias, selectedInstituicoes, selectedClasses, selectedEmissores, searchAtivo, showOnlyUnclassified, showOnlyMissingYield, activeFilters, sortConfig, isValidAssetClass]);

  // Contador de ativos não classificados na view atual (antes do filtro showOnlyUnclassified)
  const unclassifiedInCurrentView = useMemo(() => {
    let data = dadosData;
    
    if (selectedCompetencias.length > 0) {
      data = data.filter(item => selectedCompetencias.includes(item.Competencia));
    }
    if (selectedInstituicoes.length > 0) {
      data = data.filter(item => selectedInstituicoes.includes(item.Instituicao));
    }
    if (selectedClasses.length > 0) {
      data = data.filter(item => selectedClasses.includes(item["Classe do ativo"]));
    }
    if (selectedEmissores.length > 0) {
      data = data.filter(item => selectedEmissores.includes(item.Emissor));
    }
    if (searchAtivo.trim()) {
      const searchLower = searchAtivo.toLowerCase();
      data = data.filter(item => 
        item.Ativo?.toLowerCase().includes(searchLower) ||
        item.Emissor?.toLowerCase().includes(searchLower) ||
        item["Classe do ativo"]?.toLowerCase().includes(searchLower)
      );
    }
    
    return data.filter(item => !isValidAssetClass(item["Classe do ativo"])).length;
  }, [dadosData, selectedCompetencias, selectedInstituicoes, selectedClasses, selectedEmissores, searchAtivo, isValidAssetClass]);

  // Contador de ativos com rentabilidade faltando na view atual
  const missingYieldInCurrentView = useMemo(() => {
    let data = dadosData;
    
    if (selectedCompetencias.length > 0) {
      data = data.filter(item => selectedCompetencias.includes(item.Competencia));
    }
    if (selectedInstituicoes.length > 0) {
      data = data.filter(item => selectedInstituicoes.includes(item.Instituicao));
    }
    if (selectedClasses.length > 0) {
      data = data.filter(item => selectedClasses.includes(item["Classe do ativo"]));
    }
    if (selectedEmissores.length > 0) {
      data = data.filter(item => selectedEmissores.includes(item.Emissor));
    }
    if (searchAtivo.trim()) {
      const searchLower = searchAtivo.toLowerCase();
      data = data.filter(item => 
        item.Ativo?.toLowerCase().includes(searchLower) ||
        item.Emissor?.toLowerCase().includes(searchLower) ||
        item["Classe do ativo"]?.toLowerCase().includes(searchLower)
      );
    }
    
    return data.filter(item => {
      const rendimento = item.Rendimento;
      
      // Verificar se está vazio, null, undefined
      if (rendimento == null) return true;
      
      // Se for string
      if (typeof rendimento === 'string') {
        const trimmed = rendimento.trim();
        if (trimmed === '' || trimmed === '-') return true;
        
        // Verificar se é "0", "0.0", "0.00", etc
        const numValue = parseFloat(trimmed);
        if (!isNaN(numValue) && numValue === 0) return true;
      }
      
      // Se for número, verificar se é exatamente 0
      if (typeof rendimento === 'number' && rendimento === 0) return true;
      
      return false;
    }).length;
  }, [dadosData, selectedCompetencias, selectedInstituicoes, selectedClasses, selectedEmissores, searchAtivo]);

  // Função para abrir o dialog de exportação
  const exportToCSV = () => {
    setIsExportDialogOpen(true);
  };

  // Função genérica de exportação que aceita os dados como parâmetro
  const performCSVExport = (dataToExport: DadosData[], exportType: 'filtered' | 'all') => {
    try {
      if (!dataToExport || dataToExport.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há dados disponíveis para exportação.",
          variant: "destructive",
        });
        return;
      }

    // Definir colunas do CSV
    const headers = [
      'Nome',
      'Instituicao',
      'Data',
      'Ativo',
      'Posicao',
      'Classe do ativo',
      'Taxa',
      'Vencimento',
      'Emissor',
      'Competencia',
      'Rendimento',
      'Moeda',
      'Nome da conta'
    ];

      // Criar linhas do CSV
      const csvRows = [
        headers.join(','), // Cabeçalho
        ...dataToExport.map(item => {
          return [
            item.Nome || '',
            item.Instituicao || '',
            item.Data || '',
            item.Ativo || '',
            item.Posicao || '',
            item["Classe do ativo"] || '',
            item.Taxa || '',
            item.Vencimento || '',
            item.Emissor || '',
            item.Competencia || '',
            item.Rendimento || '',
            item.Moeda || '',
            item.nomeConta || ''
          ].map(value => {
            // Escapar vírgulas e aspas
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',');
        })
      ];

      // Criar blob e baixar
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = exportType === 'filtered' 
        ? `ativos_filtrados_${decodedClientName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        : `ativos_completo_${decodedClientName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: `${dataToExport.length} registro(s) exportado(s) com sucesso.`,
      });
      
      // Fechar o dialog após exportação
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao exportar os dados.",
        variant: "destructive",
      });
    }
  };

  // Função para importar CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é CSV
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            title: "Arquivo vazio",
            description: "O arquivo CSV não contém dados.",
            variant: "destructive",
          });
          return;
        }

        // Parse CSV
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || null;
          });
          
          data.push(row);
        }

        // Aqui você pode adicionar lógica para inserir os dados no Supabase
        // Por enquanto, vamos apenas mostrar um toast com o número de linhas
        toast({
          title: "CSV carregado",
          description: `${data.length} registro(s) encontrado(s). Implementar lógica de importação no Supabase.`,
        });

        console.log('Dados importados:', data);
        
      } catch (error) {
        console.error('Erro ao processar CSV:', error);
        toast({
          title: "Erro ao importar",
          description: "Ocorreu um erro ao processar o arquivo CSV.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file, 'UTF-8');
    
    // Limpar input
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  // Função para download do template Excel exemplo
  const downloadExcelTemplate = () => {
    try {
      // Dados de exemplo para o template
      const headers = [
        'Nome',
        'Instituicao',
        'Data',
        'Ativo',
        'Posicao',
        'Classe do ativo',
        'Taxa',
        'Vencimento',
        'Emissor',
        'Competencia',
        'Rendimento',
        'Moeda',
        'Nome da conta'
      ];

      // Linhas de exemplo
      const exampleRows = [
        [
          'Cliente Exemplo',
          'Banco Exemplo S.A.',
          '2025-01-15',
          'CDB',
          '50000.00',
          'CDI - Titulos',
          '110% CDI',
          '2026-01-15',
          'Banco Exemplo',
          '202501',
          '500.00',
          'BRL',
          'Conta Corrente 12345'
        ],
        [
          'Cliente Exemplo',
          'Corretora XYZ',
          '2025-01-15',
          'LCI',
          '100000.00',
          'Inflação - Titulos',
          'IPCA + 5.5%',
          '2027-03-20',
          'Banco ABC',
          '202501',
          '1200.00',
          'BRL',
          'Conta Investimento 67890'
        ]
      ];

      // Criar CSV (compatível com Excel)
      const csvRows = [
        headers.join(','),
        ...exampleRows.map(row => 
          row.map(value => {
            // Escapar valores com vírgulas ou aspas
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      
      // Criar blob com BOM para compatibilidade com Excel
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // Download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `template_importacao_ativos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Template baixado",
        description: "Arquivo exemplo baixado com sucesso. Use-o como referência para importar seus dados.",
      });
    } catch (error) {
      console.error('Erro ao gerar template:', error);
      toast({
        title: "Erro ao gerar template",
        description: "Ocorreu um erro ao criar o arquivo exemplo.",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // FUNÇÕES CSV - CONSOLIDADO
  // ============================================

  // Função para abrir o dialog de exportação - Consolidado
  const exportToCSVConsolidado = () => {
    setIsExportDialogOpenConsolidado(true);
  };

  // Função de exportação CSV - Consolidado
  const performCSVExportConsolidado = (dataToExport: ConsolidadoData[], exportType: 'filtered' | 'all') => {
    try {
      if (!dataToExport || dataToExport.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há dados consolidados disponíveis para exportação.",
          variant: "destructive",
        });
        return;
      }

      // Definir colunas do CSV na ordem CORRETA
      const headers = [
        'Nome',
        'Instituicao',
        'Data',
        'Competencia',
        'Patrimonio Inicial',
        'Movimentação',
        'Impostos',
        'Patrimonio Final',
        'Ganho Financeiro',
        'Rendimento',
        'Moeda',
        'Nome da conta'
      ];

      // Criar linhas do CSV com mapeamento CORRETO
      const csvRows = [
        headers.join(','), // Cabeçalho
        ...dataToExport.map(item => {
          return [
            item.Nome || '',
            item.Instituicao || '',
            item.Data || '',
            item.Competencia || '',
            item["Patrimonio Inicial"] || '',
            item["Movimentação"] || '',
            item.Impostos || '',
            item["Patrimonio Final"] || '',
            item["Ganho Financeiro"] || '',
            item.Rendimento || '',
            item.Moeda || '',
            item.nomeConta || ''
          ].map(value => {
            // Escapar vírgulas e aspas
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',');
        })
      ];

      // Criar blob e baixar
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = exportType === 'filtered' 
        ? `consolidado_filtrado_${decodedClientName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        : `consolidado_completo_${decodedClientName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: `${dataToExport.length} registro(s) consolidado(s) exportado(s) com sucesso.`,
      });
      
      // Fechar o dialog após exportação
      setIsExportDialogOpenConsolidado(false);
    } catch (error) {
      console.error('Erro ao exportar CSV consolidado:', error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao exportar os dados consolidados.",
        variant: "destructive",
      });
    }
  };

  // Função para importar CSV - Consolidado
  const handleImportCSVConsolidado = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é CSV
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            title: "Arquivo vazio",
            description: "O arquivo CSV não contém dados.",
            variant: "destructive",
          });
          return;
        }

        // Parse CSV
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || null;
          });
          
          data.push(row);
        }

        // Aqui você pode adicionar lógica para inserir os dados no Supabase
        toast({
          title: "CSV carregado",
          description: `${data.length} registro(s) consolidado(s) encontrado(s). Implementar lógica de importação no Supabase.`,
        });

        console.log('Dados consolidados importados:', data);
        
      } catch (error) {
        console.error('Erro ao processar CSV consolidado:', error);
        toast({
          title: "Erro ao importar",
          description: "Ocorreu um erro ao processar o arquivo CSV.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file, 'UTF-8');
    
    // Limpar input
    if (csvFileInputRefConsolidado.current) {
      csvFileInputRefConsolidado.current.value = '';
    }
  };

  // Função para download do template Excel - Consolidado
  const downloadExcelTemplateConsolidado = () => {
    try {
      const headers = [
        'Nome',
        'Instituicao',
        'Data',
        'Competencia',
        'Patrimonio Inicial',
        'Movimentação',
        'Impostos',
        'Patrimonio Final',
        'Ganho Financeiro',
        'Rendimento',
        'Moeda',
        'Nome da conta'
      ];

      // Linhas de exemplo
      const exampleRows = [
        [
          'Adriana de Farias',
          'XP Investimentos',
          '2024-11-30',
          '11/2024',
          '500000.00',
          '10000.00',
          '500.00',
          '514500.00',
          '5000.00',
          '0.01',
          'Real',
          'Conta 12345'
        ],
        [
          'Adriana de Farias',
          'BTG Pactual',
          '2024-11-30',
          '11/2024',
          '100000.00',
          '0.00',
          '100.00',
          '101400.00',
          '1500.00',
          '0.015',
          'Dolar',
          'Conta 67890'
        ]
      ];

      // Criar CSV
      const csvRows = [
        headers.join(','),
        ...exampleRows.map(row => 
          row.map(value => {
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `template_importacao_consolidado_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Template baixado",
        description: "Arquivo exemplo de dados consolidados baixado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao gerar template consolidado:', error);
      toast({
        title: "Erro ao gerar template",
        description: "Ocorreu um erro ao criar o arquivo exemplo.",
        variant: "destructive",
      });
    }
  };

  // Pagination for Ativos tab - Create paginated data
  const paginatedDadosData = useMemo(() => {
    const startIndex = (currentPageAtivos - 1) * itemsPerPageAtivos;
    const endIndex = startIndex + itemsPerPageAtivos;
    return filteredDadosData.slice(startIndex, endIndex);
  }, [filteredDadosData, currentPageAtivos, itemsPerPageAtivos]);

  // Calculate total pages
  const totalPagesAtivos = useMemo(() => {
    return Math.ceil(filteredDadosData.length / itemsPerPageAtivos);
  }, [filteredDadosData.length, itemsPerPageAtivos]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPageAtivos(1);
  }, [selectedCompetencias, selectedInstituicoes, selectedClasses, selectedEmissores, searchAtivo, activeFilters]);

  // OPTIMIZED: selectAllVisibleItems moved here after filtered data definitions
  const selectAllVisibleItems = useCallback(() => {
    const visibleItems = activeTab === 'consolidado' ? filteredConsolidadoData : filteredDadosData;
    const allIds = new Set(visibleItems.map(item => item.id));
    setSelectedItems(allIds);
  }, [activeTab, filteredConsolidadoData, filteredDadosData]);

  // Filter Builder Component
  const FilterBuilder = ({ onAddFilter }: { onAddFilter: (filter: Filter) => void }) => {
    const [field, setField] = useState('');
    const [operator, setOperator] = useState('');
    const [value, setValue] = useState<string | number | string[]>('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
      if (operator) {
        if (['contains', 'notContains'].includes(operator)) {
          setValue([]);
        } else {
          setValue('');
        }
      }
    }, [operator]);

    const getOperators = (type: string) => {
      return operatorsByFieldType[type] || operatorsByFieldType.text;
    };

    const handleAdd = () => {
      if (field && operator) {
        onAddFilter({
          id: crypto.randomUUID(),
          field,
          operator,
          value: operator === 'isEmpty' || operator === 'isNotEmpty' ? '' : value
        });
        setField('');
        setOperator('');
        setValue('');
        setOpen(false);
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Filtro
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <Label>Campo</Label>
              <Select value={field} onValueChange={(val) => { setField(val); setOperator(''); setValue(''); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um campo" />
                </SelectTrigger>
                <SelectContent>
                  {getFilterableFields().map(f => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {field && (
              <div>
                <Label>Operador</Label>
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um operador" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOperators(getFieldType(field)).map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {field && operator && !['isEmpty', 'isNotEmpty'].includes(operator) && (
              <div>
                <Label>Valor</Label>
                {(() => {
                  const fieldType = getFieldType(field);
                  const fieldOptions = getFieldOptions(field);
                  const isMultiSelectOperator = ['contains', 'notContains'].includes(operator);
                  
                  // Se o campo tem opções E o operador permite múltipla seleção
                  if (fieldOptions && fieldOptions.length > 0 && isMultiSelectOperator) {
                    return (
                      <div className="mt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              size="sm"
                            >
                              <span className="truncate">
                                {Array.isArray(value) && value.length > 0
                                  ? `${value.length} selecionado(s)`
                                  : "Selecione valores"}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <div className="max-h-64 overflow-y-auto p-2">
                              {fieldOptions.map((option: string) => {
                                const selectedValues = Array.isArray(value) ? value : [];
                                const isSelected = selectedValues.includes(option);
                                
                                return (
                                  <div
                                    key={option}
                                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                                    onClick={() => {
                                      const currentValues = Array.isArray(value) ? [...value] : [];
                                      if (isSelected) {
                                        setValue(currentValues.filter(v => v !== option));
                                      } else {
                                        setValue([...currentValues, option]);
                                      }
                                    }}
                                  >
                                    <Checkbox checked={isSelected} />
                                    <label className="flex-1 cursor-pointer text-sm">
                                      {option}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                            {Array.isArray(value) && value.length > 0 && (
                              <div className="border-t p-2 flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">
                                  {value.length} selecionado(s)
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setValue([])}
                                  className="h-6 text-xs"
                                >
                                  Limpar
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }
                  
                  // Se o campo tem opções mas NÃO é operador multi-select
                  if (fieldOptions && fieldOptions.length > 0) {
                    return (
                      <Select 
                        value={String(value)} 
                        onValueChange={(val) => setValue(val)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione um valor" />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }
                  
                  // Caso contrário, usar Input normal
                  return (
                    <Input
                      type={fieldType === 'number' ? 'number' : 'text'}
                      value={value}
                      onChange={(e) => setValue(fieldType === 'number' ? Number(e.target.value) : e.target.value)}
                      placeholder="Digite o valor"
                      className="mt-1"
                    />
                  );
                })()}
              </div>
            )}

            <Button 
              onClick={handleAdd}
              disabled={
                !field || 
                !operator || 
                (
                  !['isEmpty', 'isNotEmpty'].includes(operator) && 
                  (
                    (Array.isArray(value) && value.length === 0) || 
                    (!Array.isArray(value) && !value)
                  )
                )
              }
              className="w-full"
              size="sm"
            >
              Adicionar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Active Filters Display
  const ActiveFilters = ({ filters, onRemoveFilter }: { filters: Filter[]; onRemoveFilter: (id: string) => void }) => {
    if (filters.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md mb-4">
        <span className="text-sm text-muted-foreground font-medium">Filtros:</span>
        {filters.map(filter => (
          <div key={filter.id} className="flex items-center gap-1.5 bg-background border rounded-md px-2.5 py-1 text-sm shadow-sm">
            <span className="font-medium text-foreground">{getFieldLabel(filter.field)}</span>
            <span className="text-muted-foreground">{getOperatorLabel(filter.operator)}</span>
            {!['isEmpty', 'isNotEmpty'].includes(filter.operator) && (
              <span className="font-medium text-foreground">{formatFilterValue(filter.value, filter.field)}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10"
              onClick={() => onRemoveFilter(filter.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemoveFilter('all')}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          Limpar todos
        </Button>
      </div>
    );
  };

  // Sort Button Component
  const SortButton = ({ sortConfig, onSort }: { sortConfig: SortConfig | null; onSort: (config: SortConfig | null) => void }) => {
    const sortableFields = getFilterableFields();

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            {sortConfig ? (
              <>
                <SortAsc className="mr-2 h-4 w-4" />
                {getFieldLabel(sortConfig.field)}
                {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
              </>
            ) : (
              <>
                <SortAsc className="mr-2 h-4 w-4" />
                Ordenar
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Ordenar por</Label>
              {sortConfig && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort(null)}
                  className="h-6 text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {sortableFields.map(field => (
                <div key={field.key} className="flex items-center gap-1">
                  <Button
                    variant={sortConfig?.field === field.key && sortConfig?.direction === 'asc' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onSort({ field: field.key, direction: 'asc' })}
                    className="flex-1 justify-start h-8 text-xs"
                  >
                    <ArrowUp className="mr-2 h-3 w-3" />
                    {field.label}
                  </Button>
                  <Button
                    variant={sortConfig?.field === field.key && sortConfig?.direction === 'desc' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onSort({ field: field.key, direction: 'desc' })}
                    className="flex-1 justify-start h-8 text-xs"
                  >
                    <ArrowDown className="mr-2 h-3 w-3" />
                    {field.label}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/dashboard/${encodeURIComponent(decodedClientName)}`)}
              className="bg-card/50 border-primary/20 hover:bg-primary/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Gerenciar Dados - {decodedClientName}
              </h1>
              <p className="text-muted-foreground">
                Edite, crie e exclua dados organizados por competência
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/prova-real/${encodeURIComponent(decodedClientName)}`)}
              className="flex items-center gap-2 bg-card/50 border-primary/20 hover:bg-primary/10"
            >
              <FileCheck className="h-4 w-4" />
              Prova Real
            </Button>
            
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-card/50 border-primary/20 hover:bg-primary/10"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações de Verificação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="correctThreshold">
              Limite para "Correto" (R$)
            </Label>
            <div className="text-sm text-muted-foreground mb-2">
              Diferenças abaixo deste valor serão marcadas como "Correto" (verde).
            </div>
            <Input
              id="correctThreshold"
              type="number"
              step="0.01"
              min="0"
              value={tempCorrectThreshold}
              onChange={(e) => setTempCorrectThreshold(e.target.value)}
              placeholder="Ex: 0.01"
              className="w-full"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Valor atual: R$ {correctThreshold.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tolerance">
              Limite para "Tolerância" (R$)
            </Label>
            <div className="text-sm text-muted-foreground mb-2">
              Diferenças abaixo deste valor serão marcadas como "Tolerância" (amarelo) ao invés de "Inconsistente" (vermelho).
            </div>
            <Input
              id="tolerance"
              type="number"
              step="0.01"
              min="0"
              value={tempToleranceValue}
              onChange={(e) => setTempToleranceValue(e.target.value)}
              placeholder="Ex: 2500.00"
              className="w-full"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Valor atual: R$ {toleranceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-md text-sm space-y-1">
            <p><strong>Como funciona:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Diferença {'<'} R$ {parseFloat(tempCorrectThreshold || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}: <span className="text-green-600 font-medium">✓ Correto</span></li>
              <li>Diferença {'<'} R$ {parseFloat(tempToleranceValue || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}: <span className="text-yellow-600 font-medium">⚠️ Tolerância</span></li>
              <li>Diferença ≥ R$ {parseFloat(tempToleranceValue || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}: <span className="text-red-600 font-medium">✗ Inconsistente</span></li>
            </ul>
          </div>
        </div>
                
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTempCorrectThreshold(correctThreshold.toString());
              setTempToleranceValue(toleranceValue.toString());
              setIsSettingsOpen(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              const newToleranceValue = parseFloat(tempToleranceValue);
              const newCorrectThreshold = parseFloat(tempCorrectThreshold);
              
              // Validações
              if (isNaN(newToleranceValue) || newToleranceValue < 0) {
                toast({
                  title: "Valor Inválido",
                  description: "Por favor, insira um valor de tolerância válido maior ou igual a zero.",
                  variant: "destructive",
                });
                return;
              }
              
              if (isNaN(newCorrectThreshold) || newCorrectThreshold < 0) {
                toast({
                  title: "Valor Inválido",
                  description: "Por favor, insira um limite de 'Correto' válido maior ou igual a zero.",
                  variant: "destructive",
                });
                return;
              }
              
              // Validação lógica: limite "correto" deve ser menor que "tolerância"
              if (newCorrectThreshold >= newToleranceValue) {
                toast({
                  title: "Configuração Inválida",
                  description: "O limite 'Correto' deve ser menor que o limite 'Tolerância'.",
                  variant: "destructive",
                });
                return;
              }

              // Salvar no banco (atualiza o registro com id = 1)
              const { error } = await supabase
                .from('verification_settings')
                .update({
                  correct_threshold: newCorrectThreshold,
                  tolerance_value: newToleranceValue
                })
                .eq('id', 1);
              
              if (error) {
                toast({
                  title: "Erro ao salvar",
                  description: error.message,
                  variant: "destructive",
                });
                return;
              }
              
              // Salvar ambos os valores no estado
              setCorrectThreshold(newCorrectThreshold);
              setToleranceValue(newToleranceValue);
              
              toast({
                title: "Configurações salvas",
                description: `Correto: ≤ R$ ${newCorrectThreshold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Tolerância: ≤ R$ ${newToleranceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              });
              
              setIsSettingsOpen(false);
            }}
          >
            Salvar
          </Button>
        </div>
              </DialogContent>
            </Dialog>
            
            <ThemeToggle />
          </div>
        </div>


        {/* Painel de Resumo de Verificação - OPTIMIZED: Using memoized stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo de Verificação de Integridade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // FASE 1: Usar cache para calcular estatísticas
                const stats = filteredConsolidadoData.reduce((acc, item) => {
                  const verification = getVerification(item);
                  acc[verification.status]++;
                  
                  // Contar registros com rentabilidade faltando
                  if (verification.hasMissingYield) {
                    acc.missingYieldRecords++;
                    acc.missingYieldTotal += verification.missingYieldCount;
                  }
                  
                  return acc;
                }, { 
                  match: 0, 
                  tolerance: 0, 
                  mismatch: 0, 
                  'no-data': 0,
                  missingYieldRecords: 0,
                  missingYieldTotal: 0
                });
                
                return (
                  <>
                    {/* Primeira linha: 3 colunas */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.match}</p>
                          <p className="text-sm text-muted-foreground">Corretos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.tolerance}</p>
                          <p className="text-sm text-muted-foreground">Tolerância</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.mismatch}</p>
                          <p className="text-sm text-muted-foreground">Inconsistentes</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Segunda linha: 3 colunas */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats['no-data']}</p>
                          <p className="text-sm text-muted-foreground">Sem Dados</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="text-2xl font-bold">{unclassifiedStats.recordsWithUnclassified}</p>
                          <p className="text-sm text-muted-foreground">
                            Com Não Classificados
                            <span className="block text-xs text-orange-600 mt-0.5">
                              {unclassifiedStats.totalUnclassified} ativos
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.missingYieldRecords}</p>
                          <p className="text-sm text-muted-foreground">
                            Com Rentabilidade Faltando
                            <span className="block text-xs text-purple-600 mt-0.5">
                              {stats.missingYieldTotal} ativos
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          if (value !== 'detalhados') {
            setSelectedConsolidado(null);
            setSelectedCompetencias([]);
            setSelectedInstituicoes([]);
          }
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
            <TabsTrigger value="detalhados">Ativos</TabsTrigger>
          </TabsList>

          <TabsContent value="consolidado">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <CardTitle>Consolidado</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Performance consolidada por competência e instituição
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Barra de Ferramentas */}
                <div className="flex items-center gap-2 mb-3">
                  <FilterBuilder onAddFilter={handleAddFilter} />
                  
                  {/* Filtro rápido de verificação */}
                  <Select
                    value={verifFilter}
                    onValueChange={(value) => setVerifFilter(value)}
                  >
                    <SelectTrigger className={`w-[180px] h-8 ${
                      verifFilter !== 'all' 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-card/50 border-primary/20'
                    }`}>
                      <SelectValue placeholder="Filtrar por verif." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          <span>Todos</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="match">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>Correto</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tolerance">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span>Tolerância</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="mismatch">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>Inconsistente</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="no-data">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-gray-400" />
                          <span>Sem Ativos</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Botões CSV - Importar/Exportar - CONSOLIDADO */}
                  <div className="flex items-center gap-1">
                    {/* Input file escondido */}
                    <input
                      ref={csvFileInputRefConsolidado}
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSVConsolidado}
                      className="hidden"
                    />
                    
                    {/* Botão Importar CSV */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setIsImportDialogOpenConsolidado(true)}
                      title="Importar CSV"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    
                    {/* Dialog de Escolha de Exportação - Consolidado */}
                    <Dialog open={isExportDialogOpenConsolidado} onOpenChange={setIsExportDialogOpenConsolidado}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Exportar Dados Consolidados para CSV</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            Escolha qual conjunto de dados consolidados você deseja exportar:
                          </p>
                          
                          <div className="space-y-3">
                            {/* Opção: Exportar com filtro atual */}
                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto py-4 px-4"
                              onClick={() => performCSVExportConsolidado(filteredConsolidadoData, 'filtered')}
                            >
                              <div className="flex flex-col items-start w-full">
                                <div className="flex items-center gap-2 font-medium">
                                  <FilterIcon className="h-4 w-4" />
                                  Exportar dados filtrados
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {filteredConsolidadoData.length} registro(s) com os filtros atuais aplicados
                                </div>
                              </div>
                            </Button>

                            {/* Opção: Exportar todos os dados */}
                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto py-4 px-4"
                              onClick={() => performCSVExportConsolidado(consolidadoData, 'all')}
                            >
                              <div className="flex flex-col items-start w-full">
                                <div className="flex items-center gap-2 font-medium">
                                  <BarChart3 className="h-4 w-4" />
                                  Exportar todos os dados
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {consolidadoData.length} registro(s) sem aplicar filtros
                                </div>
                              </div>
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Dialog de Importação CSV - Consolidado */}
                    <Dialog open={isImportDialogOpenConsolidado} onOpenChange={setIsImportDialogOpenConsolidado}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Importar Dados Consolidados de CSV</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            Escolha uma das opções abaixo para importar dados consolidados:
                          </p>
                          
                          <div className="space-y-3">
                            {/* Opção 1: Download do Template Excel */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                  <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">1. Baixar arquivo exemplo</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Baixe um arquivo CSV exemplo com o formato correto das colunas de dados consolidados.
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={downloadExcelTemplateConsolidado}
                              >
                                <ArrowDown className="mr-2 h-4 w-4" />
                                Baixar Template CSV
                              </Button>
                            </div>

                            {/* Opção 2: Upload do CSV */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                  <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">2. Importar seu arquivo CSV</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Após preencher o arquivo, faça o upload do CSV para importar os dados consolidados.
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="default"
                                className="w-full"
                                onClick={() => {
                                  setIsImportDialogOpenConsolidado(false);
                                  csvFileInputRefConsolidado.current?.click();
                                }}
                              >
                                <ArrowUp className="mr-2 h-4 w-4" />
                                Selecionar arquivo CSV
                              </Button>
                            </div>
                          </div>

                          {/* Informação adicional */}
                          <div className="bg-muted/50 rounded-lg p-3 mt-4">
                            <div className="flex gap-2">
                              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-muted-foreground">
                                <p className="font-medium mb-1">Ordem das colunas:</p>
                                <p className="text-[10px] leading-relaxed">
                                  Nome → Instituicao → Data → Competencia → Patrimonio Inicial → Movimentação → 
                                  Impostos → Patrimonio Final → Ganho Financeiro → Rendimento → Moeda → Nome da conta
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Botão Exportar CSV */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={exportToCSVConsolidado}
                      title="Exportar CSV"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1" />
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Colunas
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm mb-3">Selecionar Colunas</h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {availableColumns.map(column => (
                            <div key={column} className="flex items-center space-x-2">
                              <Checkbox
                                id={`column-${column}`}
                                checked={visibleColumns.has(column)}
                                onCheckedChange={(checked) => {
                                  const newVisible = new Set(visibleColumns);
                                  if (checked) {
                                    newVisible.add(column);
                                  } else {
                                    if (column !== 'Ações') {
                                      newVisible.delete(column);
                                    }
                                  }
                                  setVisibleColumns(newVisible);
                                }}
                                disabled={column === 'Ações'}
                              />
                              <label
                                htmlFor={`column-${column}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {column}
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setVisibleColumns(new Set(availableColumns))}
                          >
                            Selecionar Todas
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {selectedItems.size > 0 && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={handleBulkEdit}
                        className="h-8"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Editar {selectedItems.size}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={handleBulkDelete}
                        className="h-8"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Excluir {selectedItems.size}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={clearSelection}
                        className="h-8"
                      >
                        <X className="mr-1 h-3 w-3" />
                      </Button>
                    </>
                  )}
                  
                  <Button size="sm" onClick={() => handleCreate('consolidado')} className="h-8">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo
                  </Button>
                </div>

                {/* Active Filters */}
                <ActiveFilters filters={activeFilters} onRemoveFilter={handleRemoveFilter} />
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="w-12">
                           <Checkbox
                             checked={selectedItems.size === filteredConsolidadoData.length && filteredConsolidadoData.length > 0}
                             onCheckedChange={(checked) => {
                               if (checked) {
                                 selectAllVisibleItems();
                               } else {
                                 clearSelection();
                               }
                             }}
                           />
                         </TableHead>
                         {visibleColumns.has('Competência') && (
                           <TableHead 
                             className={`w-24 ${isColumnSortable('Competência') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Competência') && handleColumnHeaderClick('Competência')}
                           >
                             <div className="flex items-center">
                               Competência
                               {getSortIcon('Competência')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Instituição') && (
                           <TableHead 
                             className={`w-28 ${isColumnSortable('Instituição') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Instituição') && handleColumnHeaderClick('Instituição')}
                           >
                             <div className="flex items-center">
                               Instituição
                               {getSortIcon('Instituição')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Nome da Conta') && (
                           <TableHead 
                             className={`w-32 ${isColumnSortable('Nome da Conta') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Nome da Conta') && handleColumnHeaderClick('Nome da Conta')}
                           >
                             <div className="flex items-center">
                               Nome da Conta
                               {getSortIcon('Nome da Conta')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Moeda') && (
                           <TableHead 
                             className={`w-20 ${isColumnSortable('Moeda') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Moeda') && handleColumnHeaderClick('Moeda')}
                           >
                             <div className="flex items-center">
                               Moeda
                               {getSortIcon('Moeda')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Patrimônio Inicial') && (
                           <TableHead 
                             className={`text-right w-32 ${isColumnSortable('Patrimônio Inicial') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Patrimônio Inicial') && handleColumnHeaderClick('Patrimônio Inicial')}
                           >
                             <div className="flex items-center justify-end">
                               Patrim. Inicial
                               {getSortIcon('Patrimônio Inicial')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Movimentação') && (
                           <TableHead 
                             className={`text-right w-28 ${isColumnSortable('Movimentação') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Movimentação') && handleColumnHeaderClick('Movimentação')}
                           >
                             <div className="flex items-center justify-end">
                               Movimentação
                               {getSortIcon('Movimentação')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Impostos') && (
                           <TableHead 
                             className={`text-right w-24 ${isColumnSortable('Impostos') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Impostos') && handleColumnHeaderClick('Impostos')}
                           >
                             <div className="flex items-center justify-end">
                               Impostos
                               {getSortIcon('Impostos')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Ganho Financeiro') && (
                           <TableHead 
                             className={`text-right w-28 ${isColumnSortable('Ganho Financeiro') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Ganho Financeiro') && handleColumnHeaderClick('Ganho Financeiro')}
                           >
                             <div className="flex items-center justify-end">
                               Ganho Financ.
                               {getSortIcon('Ganho Financeiro')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Patrimônio Final') && (
                           <TableHead 
                             className={`text-right w-32 ${isColumnSortable('Patrimônio Final') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Patrimônio Final') && handleColumnHeaderClick('Patrimônio Final')}
                           >
                             <div className="flex items-center justify-end">
                               Patrim. Final
                               {getSortIcon('Patrimônio Final')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Rendimento %') && (
                           <TableHead 
                             className={`text-right w-24 ${isColumnSortable('Rendimento %') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                             onClick={() => isColumnSortable('Rendimento %') && handleColumnHeaderClick('Rendimento %')}
                           >
                             <div className="flex items-center justify-end">
                               Rend. %
                               {getSortIcon('Rendimento %')}
                             </div>
                           </TableHead>
                         )}
                         {visibleColumns.has('Verificação') && (
                           <TableHead className="text-center w-20">
                             Verif.
                           </TableHead>
                         )}
                         {visibleColumns.has('Ações') && (
                           <TableHead className="w-36">
                             Ações
                           </TableHead>
                         )}
                       </TableRow>
                     </TableHeader>
                    <TableBody>
                       {loading ? (
                         <TableRow>
                           <TableCell colSpan={getVisibleColumnsCount()} className="text-center">
                             Carregando...
                           </TableCell>
                         </TableRow>
                        ) : filteredConsolidadoData.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={getVisibleColumnsCount()} className="text-center">
                              Nenhum dado encontrado
                            </TableCell>
                         </TableRow>
                       ) : (
                         filteredConsolidadoData.map((item) => (
                           <TableRow key={item.id}>
                             <TableCell>
                               <Checkbox
                                 checked={selectedItems.has(item.id)}
                                 onCheckedChange={() => toggleItemSelection(item.id)}
                               />
                             </TableCell>
                             {visibleColumns.has('Competência') && <TableCell>{item.Competencia}</TableCell>}
                             {visibleColumns.has('Instituição') && <TableCell>{item.Instituicao}</TableCell>}
                             {visibleColumns.has('Nome da Conta') && <TableCell>{item.nomeConta || '-'}</TableCell>}
                             {visibleColumns.has('Moeda') && <TableCell>{item.Moeda || '-'}</TableCell>}
                             {visibleColumns.has('Patrimônio Inicial') && <TableCell className="text-right">{formatCurrency(item["Patrimonio Inicial"], item.Moeda)}</TableCell>}
                             {visibleColumns.has('Movimentação') && <TableCell className="text-right">{formatCurrency(item["Movimentação"], item.Moeda)}</TableCell>}
                             {visibleColumns.has('Impostos') && <TableCell className="text-right">{formatCurrency(item.Impostos, item.Moeda)}</TableCell>}
                             {visibleColumns.has('Ganho Financeiro') && <TableCell className="text-right">{formatCurrency(item["Ganho Financeiro"], item.Moeda)}</TableCell>}
                             {visibleColumns.has('Patrimônio Final') && <TableCell className="text-right">{formatCurrency(item["Patrimonio Final"], item.Moeda)}</TableCell>}
                             {visibleColumns.has('Rendimento %') && <TableCell className="text-right">{formatPercentage(item.Rendimento)}</TableCell>}
                              {visibleColumns.has('Verificação') && (
                                <TableCell className="text-center">
                                  {(() => {
                                    const verification = getVerification(item);
                                   
                                   return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-1 flex items-center justify-center gap-1 mx-auto">
                              {/* PRIMEIRA BOLINHA: Status de Integridade Numérica */}
                              {verification.status === 'match' && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              {verification.status === 'tolerance' && (
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              )}
                              {verification.status === 'mismatch' && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              {verification.status === 'no-data' && (
                                <Info className="h-4 w-4 text-blue-500" />
                              )}
                              
                              {/* SEGUNDA BOLINHA: Status de Classificação */}
                              {verification.hasUnclassified ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              
                              {/* TERCEIRA BOLINHA: Status de Rentabilidade */}
                              {verification.hasMissingYield ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                          </PopoverTrigger>
                                       <PopoverContent className="w-80">
                                         <div className="space-y-2">
                                           <div>
                                             <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                               <BarChart3 className="h-4 w-4" />
                                               Verificação de Integridade
                                             </h4>
                                             <div className="text-sm space-y-1">
                                               <div className="flex justify-between">
                                                 <span className="text-muted-foreground">Patrimônio Final:</span>
                                                 <span className="font-medium">{formatCurrency(verification.consolidatedValue, item.Moeda)}</span>
                                               </div>
                                               <div className="flex justify-between">
                                                 <span className="text-muted-foreground">Soma Detalhada:</span>
                                                 <span className="font-medium">{formatCurrency(verification.detailedSum, item.Moeda)}</span>
                                               </div>
                                               <div className="flex justify-between">
                                                 <span className="text-muted-foreground">Diferença:</span>
                                                 <span className={`font-medium ${
                                                   verification.status === 'mismatch' ? 'text-red-500' : 
                                                   verification.status === 'tolerance' ? 'text-yellow-500' : 
                                                   'text-green-500'
                                                 }`}>
                                                   {formatCurrency(verification.difference, item.Moeda)}
                                                </span>
                                              </div>
                                               <div className="flex justify-between">
                                                 <span className="text-muted-foreground">Registros Detalhados:</span>
                                                 <span className="font-medium">{verification.detailedCount}</span>
                                               </div>
                                               {verification.status === 'mismatch' && (
                                                 <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-700 dark:text-red-400">
                                                   ⚠️ Diferença significativa detectada. Verifique os ativos.
                                                 </div>
                                               )}
                                               {verification.status === 'no-data' && (
                                                 <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-blue-700 dark:text-blue-400">
                                                   ℹ️ Nenhum dado detalhado encontrado para esta combinação.
                                                 </div>
                                               )}
                                             </div>
                                           </div>
                                           
                                           <Separator className="my-2" />
                                           <div>
                                             <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                               <Tag className="h-4 w-4" />
                                               Verificação de Classificação
                                             </h4>
                                             <div className="flex justify-between">
                                               <span className="text-muted-foreground">Classificados:</span>
                                               <span className={`font-medium ${
                                                 !verification.hasUnclassified ? 'text-green-500' : 'text-muted-foreground'
                                               }`}>
                                                 {verification.detailedCount - verification.unclassifiedCount}
                                                 {!verification.hasUnclassified && (
                                                   <CheckCircle2 className="h-3 w-3 ml-1 inline" />
                                                 )}
                                               </span>
                                             </div>
                                             <div className="flex justify-between">
                                               <span className="text-muted-foreground">Não Classificados:</span>
                                               <span className={`font-medium ${
                                                 verification.hasUnclassified ? 'text-red-500' : 'text-green-500'
                                               }`}>
                                                 {verification.unclassifiedCount}
                                                 {verification.hasUnclassified && (
                                                   <XCircle className="h-3 w-3 ml-1 inline" />
                                                 )}
                                               </span>
                                             </div>
                                             {verification.hasUnclassified && (
                                               <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-700 dark:text-red-400">
                                                 🏷️ {verification.unclassifiedCount} ativo{verification.unclassifiedCount > 1 ? 's' : ''} com classe inválida ou não classificada detectado{verification.unclassifiedCount > 1 ? 's' : ''}.
                                                 <div className="mt-1 text-[10px] opacity-80">
                                                   Certifique-se de que a classe está na lista de opções válidas do dropdown.
                                                 </div>
                                               </div>
                                             )}
                                           </div>
                                           
                                           <Separator className="my-2" />
                                            <div>
                                              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Verificação de Rentabilidade
                                              </h4>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Com Rentabilidade:</span>
                                                <span className={`font-medium ${
                                                  !verification.hasMissingYield ? 'text-green-500' : 'text-muted-foreground'
                                                }`}>
                                                  {verification.detailedCount - verification.missingYieldCount}
                                                  {!verification.hasMissingYield && (
                                                    <CheckCircle2 className="h-3 w-3 ml-1 inline" />
                                                  )}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Sem Rentabilidade:</span>
                                                <span className={`font-medium ${
                                                  verification.hasMissingYield ? 'text-red-500' : 'text-green-500'
                                                }`}>
                                                  {verification.missingYieldCount}
                                                  {verification.hasMissingYield ? (
                                                    <XCircle className="h-3 w-3 ml-1 inline" />
                                                  ) : (
                                                    <CheckCircle2 className="h-3 w-3 ml-1 inline" />
                                                  )}
                                                </span>
                                              </div>
                                              {verification.hasMissingYield && (
                                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-700 dark:text-red-400">
                                                  💰 {verification.missingYieldCount} ativo{verification.missingYieldCount > 1 ? 's' : ''} sem campo "Rendimento" preenchido.
                                                  <div className="mt-1 text-[10px] opacity-80">
                                                    Preencha o campo "Rendimento" para todos os ativos.
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                         </div>
                                       </PopoverContent>
                                     </Popover>
                                   );
                                 })()}
                               </TableCell>
                             )}
                             {visibleColumns.has('Ações') && (
                               <TableCell>
                                 <div className="flex items-center gap-1">
                                    {(() => {
                                      const verification = getVerification(item);
                                     
                                     return (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 hover:bg-primary/10 text-primary"
                                          onClick={() => {
                                            setSelectedConsolidado(item);
                                            setActiveTab('detalhados');
                                            setSelectedCompetencias([item.Competencia]);
                                            setSelectedInstituicoes([item.Instituicao]);
                                            setTimeout(() => {
                                              document.querySelector('[value="detalhados"]')?.scrollIntoView({ 
                                                behavior: 'smooth' 
                                              });
                                            }, 100);
                                          }}
                                          title={`Ver ${verification.detailedCount || 0} ativos detalhados`}
                                        >
                                         <ArrowRight className="h-4 w-4" />
                                         <span className="ml-1 text-xs font-medium">{verification.detailedCount || 0}</span>
                                       </Button>
                                     );
                                    })()}
                                   
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-8 w-8 p-0 text-primary hover:text-primary"
                                     onClick={() => handleCreateFromRecord(item, 'consolidado')}
                                     title="Criar novo registro com base neste"
                                   >
                                     <Copy className="h-4 w-4" />
                                   </Button>
                                   
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-8 w-8 p-0"
                                     onClick={() => handleEdit(item, 'consolidado')}
                                     title="Editar"
                                   >
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                     onClick={() => handleDelete(item.id, 'consolidado')}
                                     title="Excluir"
                                   >
                                     <Trash2 className="h-4 w-4" />
                                   </Button>
                                 </div>
                               </TableCell>
                             )}
                           </TableRow>
                         ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detalhados">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Ativos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dados detalhados de ativos por competência
                </p>
              </CardHeader>
              <CardContent>
                {/* Card de Comparação - OPTIMIZED */}
                {selectedConsolidado && (() => {
                  // MEMOIZED: Usar dados já filtrados ao invés de recalcular
                  const assetsSum = filteredDadosData.reduce((sum, item) => sum + (item.Posicao || 0), 0);

                  // Calcular ativos não classificados nos dados filtrados
                  const unclassifiedInComparison = filteredDadosData.filter(item => 
                    !isValidAssetClass(item["Classe do ativo"])
                  ).length;

                  // Calcular ativos com rentabilidade faltando nos dados filtrados
                  const missingYieldInComparison = filteredDadosData.filter(item => {
                    const rendimento = item.Rendimento;
                    
                    // Verificar se está vazio, null, undefined, ou é apenas "-"
                    if (rendimento == null) return true;
                    
                    // Se for string, verificar se está vazia ou é apenas "-"
                    if (typeof rendimento === 'string') {
                      const trimmed = rendimento.trim();
                      if (trimmed === '' || trimmed === '-') return true;
                    }
                    
                    // Se for número, aceitar qualquer valor (incluindo 0)
                    return false;
                  }).length;

                  const consolidadoValue = selectedConsolidado["Patrimonio Final"] || 0;
                  const difference = Math.abs(consolidadoValue - assetsSum);
                  const percentDiff = consolidadoValue !== 0 
                    ? (difference / Math.abs(consolidadoValue)) * 100 
                    : 0;
                  
                  let status: 'match' | 'tolerance' | 'mismatch';
                  if (difference <= correctThreshold) {
                    status = 'match';
                  } else if (difference <= toleranceValue) {
                    status = 'tolerance';
                  } else {
                    status = 'mismatch';
                  }
                  
                  const statusConfig = {
                    match: {
                      color: 'text-green-600 dark:text-green-400',
                      bgColor: 'bg-green-50 dark:bg-green-950/20',
                      borderColor: 'border-green-200 dark:border-green-800',
                      icon: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
                      label: 'Correto'
                    },
                    tolerance: {
                      color: 'text-yellow-600 dark:text-yellow-400',
                      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
                      borderColor: 'border-yellow-200 dark:border-yellow-800',
                      icon: <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
                      label: 'Tolerância'
                    },
                    mismatch: {
                      color: 'text-red-600 dark:text-red-400',
                      bgColor: 'bg-red-50 dark:bg-red-950/20',
                      borderColor: 'border-red-200 dark:border-red-800',
                      icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
                      label: 'Inconsistente'
                    }
                  };
                  
                  const config = statusConfig[status];
                  
                  return (
                    <Card className="mb-4 border-2 border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">Comparação: Consolidado vs Ativos</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedConsolidado.Competencia} - {selectedConsolidado.Instituicao}
                              {selectedConsolidado.nomeConta && selectedConsolidado.nomeConta !== '-' && ` - ${selectedConsolidado.nomeConta}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedConsolidado(null);
                              setSelectedCompetencias([]);
                              setSelectedInstituicoes([]);
                            }}
                            title="Limpar comparação"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Patrimônio Final (Consolidado)</p>
                              <p className="text-lg font-bold">
                                {formatCurrency(consolidadoValue)}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Soma dos Ativos Filtrados</p>
                              <p className="text-lg font-bold">
                                {formatCurrency(assetsSum)}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Diferença Absoluta</p>
                              <p className={`text-lg font-bold ${config.color}`}>
                                {formatCurrency(difference)}
                                <span className="text-xs ml-2">
                                  ({percentDiff.toFixed(2)}%)
                                </span>
                              </p>
                            </div>
                            
                            <div className="space-y-1 flex flex-col items-start justify-center">
                              <p className="text-xs text-muted-foreground font-medium">Status</p>
                              <div className="flex items-center gap-2">
                                {config.icon}
                                <span className={`font-semibold ${config.color}`}>
                                  {config.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {status === 'mismatch' && (
                            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                              <p className="text-xs text-red-700 dark:text-red-400">
                                ⚠️ <strong>Atenção:</strong> Diferença significativa detectada entre o consolidado e a soma dos ativos. Verifique se há ativos faltantes ou valores incorretos.
                              </p>
                            </div>
                          )}
                          
                          {status === 'tolerance' && (
                            <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                ℹ️ Diferença dentro da tolerância configurada (≤ {formatCurrency(toleranceValue)}).
                              </p>
                            </div>
                          )}
                          
                          {/* Seção de Verificações Adicionais */}
                          {(unclassifiedInComparison > 0 || missingYieldInComparison > 0) && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-3">Alertas de Qualidade dos Dados</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                
                                {/* Ativos Não Classificados */}
                                {unclassifiedInComparison > 0 && (
                                  <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                                    <Tag className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                                        {unclassifiedInComparison} {unclassifiedInComparison === 1 ? 'ativo' : 'ativos'}
                                      </p>
                                      <p className="text-xs text-orange-700 dark:text-orange-300">
                                        Não classificado{unclassifiedInComparison === 1 ? '' : 's'} ou com classe inválida
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Rentabilidade Faltando */}
                                {missingYieldInComparison > 0 && (
                                  <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                                    <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                                        {missingYieldInComparison} {missingYieldInComparison === 1 ? 'ativo' : 'ativos'}
                                      </p>
                                      <p className="text-xs text-purple-700 dark:text-purple-300">
                                        Sem rentabilidade preenchida
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
                
                {/* Barra de Ferramentas */}
                <div className="flex items-center gap-2 mb-3">
                  <FilterBuilder onAddFilter={handleAddFilter} />
                  
                  {/* Filtros de Qualidade */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant={(showOnlyUnclassified || showOnlyMissingYield) ? "default" : "outline"}
                        size="sm" 
                        className="h-8"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Filtros de Qualidade
                        {(unclassifiedInCurrentView > 0 || missingYieldInCurrentView > 0) && (
                          <Badge 
                            variant={(showOnlyUnclassified || showOnlyMissingYield) ? "secondary" : "destructive"} 
                            className="ml-2 px-1.5 py-0 text-[10px]"
                          >
                            {unclassifiedInCurrentView + missingYieldInCurrentView}
                          </Badge>
                        )}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-foreground mb-2">
                          Mostrar apenas ativos com:
                        </div>
                        
                        {/* Não Classificados */}
                        <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                          <Checkbox 
                            id="filter-unclassified"
                            checked={showOnlyUnclassified}
                            onCheckedChange={(checked) => setShowOnlyUnclassified(checked as boolean)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <label 
                              htmlFor="filter-unclassified" 
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                            >
                              <Tag className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                              Classe não classificada
                              {unclassifiedInCurrentView > 0 && (
                                <Badge variant="outline" className="ml-auto px-1.5 py-0 text-[10px] bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
                                  {unclassifiedInCurrentView}
                                </Badge>
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Ativos sem classificação válida
                            </p>
                          </div>
                        </div>
                        
                        {/* Rentabilidade Faltando */}
                        <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                          <Checkbox 
                            id="filter-missing-yield"
                            checked={showOnlyMissingYield}
                            onCheckedChange={(checked) => setShowOnlyMissingYield(checked as boolean)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <label 
                              htmlFor="filter-missing-yield" 
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                            >
                              <DollarSign className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                              Rentabilidade faltando
                              {missingYieldInCurrentView > 0 && (
                                <Badge variant="outline" className="ml-auto px-1.5 py-0 text-[10px] bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                                  {missingYieldInCurrentView}
                                </Badge>
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Ativos sem rentabilidade preenchida
                            </p>
                          </div>
                        </div>
                        
                        {/* Ações */}
                        {(showOnlyUnclassified || showOnlyMissingYield) && (
                          <>
                            <Separator className="my-2" />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full h-7 text-xs"
                              onClick={() => {
                                setShowOnlyUnclassified(false);
                                setShowOnlyMissingYield(false);
                              }}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Limpar filtros
                            </Button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Botões CSV - Importar/Exportar */}
                  <div className="flex items-center gap-1">
                    {/* Input file escondido */}
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      className="hidden"
                    />
                    
                    {/* Botão Importar CSV */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setIsImportDialogOpen(true)}
                      title="Importar CSV"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    
                    {/* Dialog de Escolha de Exportação */}
                    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Exportar Dados para CSV</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            Escolha qual conjunto de dados você deseja exportar:
                          </p>
                          
                          <div className="space-y-3">
                            {/* Opção: Exportar com filtro atual */}
                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto py-4 px-4"
                              onClick={() => performCSVExport(filteredDadosData, 'filtered')}
                            >
                              <div className="flex flex-col items-start w-full">
                                <div className="flex items-center gap-2 font-medium">
                                  <FilterIcon className="h-4 w-4" />
                                  Exportar dados filtrados
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {filteredDadosData.length} registro(s) com os filtros atuais aplicados
                                </div>
                              </div>
                            </Button>

                            {/* Opção: Exportar todos os dados */}
                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto py-4 px-4"
                              onClick={() => performCSVExport(dadosData, 'all')}
                            >
                              <div className="flex flex-col items-start w-full">
                                <div className="flex items-center gap-2 font-medium">
                                  <BarChart3 className="h-4 w-4" />
                                  Exportar todos os dados
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {dadosData.length} registro(s) sem aplicar filtros
                                </div>
                              </div>
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Dialog de Importação CSV */}
                    <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Importar Dados de CSV</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            Escolha uma das opções abaixo para importar seus dados:
                          </p>
                          
                          <div className="space-y-3">
                            {/* Opção 1: Download do Template Excel */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                  <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">1. Baixar arquivo exemplo</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Baixe um arquivo Excel exemplo com o formato correto das colunas e dados de exemplo.
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={downloadExcelTemplate}
                              >
                                <ArrowDown className="mr-2 h-4 w-4" />
                                Baixar Template Excel
                              </Button>
                            </div>

                            {/* Opção 2: Upload do CSV */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                  <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">2. Importar seu arquivo CSV</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Após preencher o arquivo, faça o upload do CSV para importar os dados.
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="default"
                                className="w-full"
                                onClick={() => {
                                  setIsImportDialogOpen(false);
                                  csvFileInputRef.current?.click();
                                }}
                              >
                                <ArrowUp className="mr-2 h-4 w-4" />
                                Selecionar arquivo CSV
                              </Button>
                            </div>
                          </div>

                          {/* Informação adicional */}
                          <div className="bg-muted/50 rounded-lg p-3 mt-4">
                            <div className="flex gap-2">
                              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-muted-foreground">
                                <p className="font-medium mb-1">Ordem das colunas:</p>
                                <p className="text-[10px] leading-relaxed">
                                  Nome → Instituicao → Data → Ativo → Posicao → Classe do ativo → 
                                  Taxa → Vencimento → Emissor → Competencia → Rendimento → Moeda → Nome da conta
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Botão Exportar CSV */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={exportToCSV}
                      title="Exportar CSV"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1" />
                  
                  {/* Campo de Busca */}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por ativo, emissor ou classe..."
                      value={searchAtivo}
                      onChange={(e) => setSearchAtivo(e.target.value)}
                      className="pl-10 h-8"
                    />
                  </div>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Colunas
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm mb-2">Colunas Visíveis</h4>
                        
                        {['Competência', 'Instituição', 'Nome da Conta', 'Moeda', 'Ativo', 'Emissor', 'Classe', 'Posição', 'Taxa', 'Vencimento', 'Rendimento %', 'Verificação', 'Ações'].map((col) => (
                          <div key={col} className="flex items-center space-x-2">
                            <Checkbox
                              id={`col-det-${col}`}
                              checked={visibleColumnsDetalhados.has(col)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(visibleColumnsDetalhados);
                                if (checked) {
                                  newSet.add(col);
                                } else {
                                  newSet.delete(col);
                                }
                                setVisibleColumnsDetalhados(newSet);
                              }}
                            />
                            <label
                              htmlFor={`col-det-${col}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {col}
                            </label>
                          </div>
                        ))}
                        
                        <Separator className="my-2" />
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setVisibleColumnsDetalhados(new Set(['Competência', 'Instituição', 'Nome da Conta', 'Moeda', 'Ativo', 'Emissor', 'Classe', 'Posição', 'Taxa', 'Vencimento', 'Rendimento %', 'Verificação', 'Ações']))}
                            className="flex-1"
                          >
                            Todas
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setVisibleColumnsDetalhados(new Set(['Ações']))}
                            className="flex-1"
                          >
                            Nenhuma
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Button size="sm" onClick={() => handleCreate('dados')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo
                  </Button>
                </div>

                {/* Filtros Ativos */}
                <ActiveFilters filters={activeFilters} onRemoveFilter={handleRemoveFilter} />


                {/* Informações de Seleção */}
                {activeTab === 'detalhados' && selectedItems.size > 0 && (
                  <div className="flex items-center gap-2 mb-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <span className="text-sm text-muted-foreground">
                      {selectedItems.size} item(s) selecionado(s)
                    </span>
                    <Button 
                      size="sm" 
                      onClick={handleBulkEdit}
                      className="h-7"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={handleBulkDelete}
                      className="h-7"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Excluir
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={clearSelection}
                      className="h-7"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Limpar
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 whitespace-nowrap">
                            <Checkbox
                              checked={selectedItems.size === filteredDadosData.length && filteredDadosData.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllVisibleItems();
                                } else {
                                  clearSelection();
                                }
                              }}
                          />
                        </TableHead>
                        {visibleColumnsDetalhados.has('Competência') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Competência') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Competência') && handleColumnHeaderClickDetalhados('Competência')}
                          >
                            <div className="flex items-center">
                              Competência
                              {getSortIconDetalhados('Competência')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Instituição') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Instituição') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Instituição') && handleColumnHeaderClickDetalhados('Instituição')}
                          >
                            <div className="flex items-center">
                              Instituição
                              {getSortIconDetalhados('Instituição')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Nome da Conta') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Nome da Conta') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Nome da Conta') && handleColumnHeaderClickDetalhados('Nome da Conta')}
                          >
                            <div className="flex items-center">
                              Nome da Conta
                              {getSortIconDetalhados('Nome da Conta')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Moeda') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Moeda') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Moeda') && handleColumnHeaderClickDetalhados('Moeda')}
                          >
                            <div className="flex items-center">
                              Moeda
                              {getSortIconDetalhados('Moeda')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Ativo') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Ativo') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Ativo') && handleColumnHeaderClickDetalhados('Ativo')}
                          >
                            <div className="flex items-center">
                              Ativo
                              {getSortIconDetalhados('Ativo')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Emissor') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Emissor') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Emissor') && handleColumnHeaderClickDetalhados('Emissor')}
                          >
                            <div className="flex items-center">
                              Emissor
                              {getSortIconDetalhados('Emissor')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Classe') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Classe') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Classe') && handleColumnHeaderClickDetalhados('Classe')}
                          >
                            <div className="flex items-center">
                              Classe
                              {getSortIconDetalhados('Classe')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Posição') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Posição') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Posição') && handleColumnHeaderClickDetalhados('Posição')}
                          >
                            <div className="flex items-center">
                              Posição
                              {getSortIconDetalhados('Posição')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Taxa') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Taxa') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Taxa') && handleColumnHeaderClickDetalhados('Taxa')}
                          >
                            <div className="flex items-center">
                              Taxa
                              {getSortIconDetalhados('Taxa')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Vencimento') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Vencimento') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Vencimento') && handleColumnHeaderClickDetalhados('Vencimento')}
                          >
                            <div className="flex items-center">
                              Vencimento
                              {getSortIconDetalhados('Vencimento')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Rendimento %') && (
                          <TableHead 
                            className={`whitespace-nowrap ${isColumnSortableDetalhados('Rendimento %') ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                            onClick={() => isColumnSortableDetalhados('Rendimento %') && handleColumnHeaderClickDetalhados('Rendimento %')}
                          >
                            <div className="flex items-center">
                              Rendimento %
                              {getSortIconDetalhados('Rendimento %')}
                            </div>
                          </TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Verificação') && (
                          <TableHead className="w-20 text-center whitespace-nowrap">Verif.</TableHead>
                        )}
                        {visibleColumnsDetalhados.has('Ações') && (
                          <TableHead className="whitespace-nowrap">Ações</TableHead>
                        )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={13} className="text-center">
                              Carregando...
                            </TableCell>
                          </TableRow>
                        ) : filteredDadosData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={13} className="text-center">
                              Nenhum dado encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedDadosData.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedItems.has(item.id)}
                                  onCheckedChange={() => toggleItemSelection(item.id)}
                                />
                              </TableCell>
                              {visibleColumnsDetalhados.has('Competência') && <TableCell>{item.Competencia}</TableCell>}
                              {visibleColumnsDetalhados.has('Instituição') && <TableCell>{item.Instituicao}</TableCell>}
                              {visibleColumnsDetalhados.has('Nome da Conta') && <TableCell>{item.nomeConta || '-'}</TableCell>}
                              {visibleColumnsDetalhados.has('Moeda') && <TableCell>{item.Moeda || '-'}</TableCell>}
                              {visibleColumnsDetalhados.has('Ativo') && <TableCell>{item.Ativo}</TableCell>}
                              {visibleColumnsDetalhados.has('Emissor') && <TableCell>{item.Emissor}</TableCell>}
                              {visibleColumnsDetalhados.has('Classe') && <TableCell>{item["Classe do ativo"]}</TableCell>}
                              {visibleColumnsDetalhados.has('Posição') && <TableCell>{formatCurrency(item.Posicao, item.Moeda)}</TableCell>}
                              {visibleColumnsDetalhados.has('Taxa') && <TableCell>{item.Taxa}</TableCell>}
                              {visibleColumnsDetalhados.has('Vencimento') && <TableCell>{item.Vencimento}</TableCell>}
                              {visibleColumnsDetalhados.has('Rendimento %') && <TableCell>{typeof item.Rendimento === 'number' ? formatPercentage(item.Rendimento) : item.Rendimento || '-'}</TableCell>}
                              {visibleColumnsDetalhados.has('Verificação') && (
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Verificação da Classe */}
                                    {!isValidAssetClass(item["Classe do ativo"]) ? (
                                      <div title="Classe inválida ou não classificada">
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      </div>
                                    ) : (
                                      <div title="Classe válida">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      </div>
                                    )}
                                    
                                    {/* Verificação da Rentabilidade */}
                                    {!hasValidYield(item.Rendimento) ? (
                                      <div title="Rentabilidade não preenchida">
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      </div>
                                    ) : (
                                      <div title="Rentabilidade preenchida">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                              {visibleColumnsDetalhados.has('Ações') && (
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-primary hover:text-primary"
                                      onClick={() => handleCreateFromRecord(item, 'dados')}
                                      title="Criar novo registro com base neste"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEdit(item, 'dados')}
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(item.id, 'dados')}
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                       )}
                     </TableBody>
                   </Table>
                   
                   {/* Pagination Controls - Ativos */}
                   {filteredDadosData.length > 0 && (
                     <div className="mt-4 flex items-center justify-between border-t pt-4">
                       {/* Results Information */}
                       <div className="flex items-center gap-4">
                         <p className="text-sm text-muted-foreground">
                           Mostrando{' '}
                           <span className="font-medium">
                             {(currentPageAtivos - 1) * itemsPerPageAtivos + 1}
                           </span>
                           {' '}-{' '}
                           <span className="font-medium">
                             {Math.min(currentPageAtivos * itemsPerPageAtivos, filteredDadosData.length)}
                           </span>
                           {' '}de{' '}
                           <span className="font-medium">{filteredDadosData.length}</span>
                           {' '}ativos
                         </p>
                         
                         {/* Items per Page Selector */}
                         <div className="flex items-center gap-2">
                           <span className="text-sm text-muted-foreground">Itens por página:</span>
                           <Select
                             value={itemsPerPageAtivos.toString()}
                             onValueChange={(value) => {
                               setItemsPerPageAtivos(Number(value));
                               setCurrentPageAtivos(1);
                             }}
                           >
                             <SelectTrigger className="w-24 h-8">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="100">100</SelectItem>
                               <SelectItem value="500">500</SelectItem>
                               <SelectItem value="1000">1000</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>

                       {/* Page Navigation */}
                       <Pagination>
                         <PaginationContent>
                           <PaginationItem>
                             <PaginationPrevious
                               onClick={() => setCurrentPageAtivos(prev => Math.max(1, prev - 1))}
                               className={currentPageAtivos === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                             />
                           </PaginationItem>
                           
                           {/* First Page */}
                           {currentPageAtivos > 2 && (
                             <>
                               <PaginationItem>
                                 <PaginationLink
                                   onClick={() => setCurrentPageAtivos(1)}
                                   className="cursor-pointer"
                                 >
                                   1
                                 </PaginationLink>
                               </PaginationItem>
                               {currentPageAtivos > 3 && <PaginationEllipsis />}
                             </>
                           )}
                           
                           {/* Previous Page */}
                           {currentPageAtivos > 1 && (
                             <PaginationItem>
                               <PaginationLink
                                 onClick={() => setCurrentPageAtivos(currentPageAtivos - 1)}
                                 className="cursor-pointer"
                               >
                                 {currentPageAtivos - 1}
                               </PaginationLink>
                             </PaginationItem>
                           )}
                           
                           {/* Current Page */}
                           <PaginationItem>
                             <PaginationLink isActive>
                               {currentPageAtivos}
                             </PaginationLink>
                           </PaginationItem>
                           
                           {/* Next Page */}
                           {currentPageAtivos < totalPagesAtivos && (
                             <PaginationItem>
                               <PaginationLink
                                 onClick={() => setCurrentPageAtivos(currentPageAtivos + 1)}
                                 className="cursor-pointer"
                               >
                                 {currentPageAtivos + 1}
                               </PaginationLink>
                             </PaginationItem>
                           )}
                           
                           {/* Last Page */}
                           {currentPageAtivos < totalPagesAtivos - 1 && (
                             <>
                               {currentPageAtivos < totalPagesAtivos - 2 && <PaginationEllipsis />}
                               <PaginationItem>
                                 <PaginationLink
                                   onClick={() => setCurrentPageAtivos(totalPagesAtivos)}
                                   className="cursor-pointer"
                                 >
                                   {totalPagesAtivos}
                                 </PaginationLink>
                               </PaginationItem>
                             </>
                           )}
                           
                           <PaginationItem>
                             <PaginationNext
                               onClick={() => setCurrentPageAtivos(prev => Math.min(totalPagesAtivos, prev + 1))}
                               className={currentPageAtivos === totalPagesAtivos ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                             />
                           </PaginationItem>
                         </PaginationContent>
                       </Pagination>
                     </div>
                   )}
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
        </Tabs>
      </div>

      {/* Edit/Create Dialog - FASE 2: LAZY RENDER */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {isDialogOpen && editingItem && (
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem?.id ? 'Editar' : 'Criar'} {editingItem?.type === 'consolidado' ? 'Dado Consolidado' : 'Dado Detalhado'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {editingItem.type === 'consolidado' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="competencia">Competência</Label>
                      <Input
                        id="competencia"
                        value={editingItem.Competencia || ''}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          if (value.length >= 2) {
                            value = value.substring(0, 2) + '/' + value.substring(2, 6);
                          }
                          setEditingItem({...editingItem, Competencia: value});
                        }}
                        placeholder="MM/YYYY"
                        maxLength={7}
                      />
                    </div>
                    <div>
                      <Label htmlFor="instituicao">Instituição</Label>
                      <Input
                        id="instituicao"
                        value={editingItem.Instituicao || ''}
                        onChange={(e) => setEditingItem({...editingItem, Instituicao: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nomeConta">Nome da Conta</Label>
                      <Input
                        id="nomeConta"
                        value={editingItem.nomeConta || ''}
                        onChange={(e) => setEditingItem({...editingItem, nomeConta: e.target.value})}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="moeda">Moeda</Label>
                    <Select
                      value={editingItem.Moeda || 'Real'}
                      onValueChange={(value) => setEditingItem({...editingItem, Moeda: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Real">Real (BRL)</SelectItem>
                        <SelectItem value="Dolar">Dólar (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patrimonioInicial">Patrimônio Inicial</Label>
                      <Input
                        id="patrimonioInicial"
                        type="text"
                        value={numericFieldsText["Patrimonio Inicial"]}
                        onChange={(e) => {
                          const text = e.target.value;
                          setNumericFieldsText({...numericFieldsText, "Patrimonio Inicial": text});
                        }}
                        onBlur={() => {
                          const text = numericFieldsText["Patrimonio Inicial"];
                          const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
                          setEditingItem({...editingItem, "Patrimonio Inicial": numericValue});
                          const formatted = formatBrazilianNumber(numericValue);
                          setNumericFieldsText({...numericFieldsText, "Patrimonio Inicial": formatted});
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="movimentacao">Movimentação</Label>
                      <Input
                        id="movimentacao"
                        type="text"
                        value={numericFieldsText["Movimentação"]}
                        onChange={(e) => {
                          const text = e.target.value;
                          setNumericFieldsText({...numericFieldsText, "Movimentação": text});
                        }}
                        onBlur={() => {
                          const text = numericFieldsText["Movimentação"];
                          const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
                          setEditingItem({...editingItem, "Movimentação": numericValue});
                          const formatted = formatBrazilianNumber(numericValue);
                          setNumericFieldsText({...numericFieldsText, "Movimentação": formatted});
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="impostos">Impostos</Label>
                      <Input
                        id="impostos"
                        type="text"
                        value={numericFieldsText.Impostos}
                        onChange={(e) => {
                          const text = e.target.value;
                          setNumericFieldsText({...numericFieldsText, Impostos: text});
                        }}
                        onBlur={() => {
                          const text = numericFieldsText.Impostos;
                          const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
                          setEditingItem({...editingItem, Impostos: numericValue});
                          const formatted = formatBrazilianNumber(numericValue);
                          setNumericFieldsText({...numericFieldsText, Impostos: formatted});
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ganhoFinanceiro">Ganho Financeiro</Label>
                      <Input
                        id="ganhoFinanceiro"
                        type="text"
                        value={numericFieldsText["Ganho Financeiro"]}
                        onChange={(e) => {
                          const text = e.target.value;
                          setNumericFieldsText({...numericFieldsText, "Ganho Financeiro": text});
                        }}
                        onBlur={() => {
                          const text = numericFieldsText["Ganho Financeiro"];
                          const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
                          setEditingItem({...editingItem, "Ganho Financeiro": numericValue});
                          const formatted = formatBrazilianNumber(numericValue);
                          setNumericFieldsText({...numericFieldsText, "Ganho Financeiro": formatted});
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patrimonioFinal">Patrimônio Final</Label>
                      <Input
                        id="patrimonioFinal"
                        type="text"
                        value={numericFieldsText["Patrimonio Final"]}
                        onChange={(e) => {
                          const text = e.target.value;
                          setNumericFieldsText({...numericFieldsText, "Patrimonio Final": text});
                        }}
                        onBlur={() => {
                          const text = numericFieldsText["Patrimonio Final"];
                          const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
                          setEditingItem({...editingItem, "Patrimonio Final": numericValue});
                          const formatted = formatBrazilianNumber(numericValue);
                          setNumericFieldsText({...numericFieldsText, "Patrimonio Final": formatted});
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rendimento">Rendimento (%)</Label>
                      <div className="relative">
                        <Input
                          id="rendimento"
                          type="number"
                          step="0.0001"
                          value={(editingItem.Rendimento || 0) * 100}
                          onChange={(e) => setEditingItem({...editingItem, Rendimento: (parseFloat(e.target.value) || 0) / 100})}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCalculatorContext('single');
                          // Preencher automaticamente os campos da calculadora personalizada
                          if (editingItem["Patrimonio Inicial"]) {
                            setCustomCalcData({
                              ...customCalcData,
                              valorInicial: editingItem["Patrimonio Inicial"] || 0,
                              competencia: editingItem.Competencia || ''
                            });
                          }
                          setIsCalculatorOpen(true);
                        }}
                        className="mt-2 w-full"
                      >
                        Calcular
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="competencia">Competência</Label>
                      <Input
                        id="competencia"
                        value={editingItem.Competencia || ''}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          if (value.length >= 2) {
                            value = value.substring(0, 2) + '/' + value.substring(2, 6);
                          }
                          setEditingItem({...editingItem, Competencia: value});
                        }}
                        placeholder="MM/YYYY"
                        maxLength={7}
                      />
                    </div>
                    <div>
                      <Label htmlFor="instituicao">Instituição</Label>
                      <Input
                        id="instituicao"
                        value={editingItem.Instituicao || ''}
                        onChange={(e) => setEditingItem({...editingItem, Instituicao: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nomeConta">Nome da Conta</Label>
                      <Input
                        id="nomeConta"
                        value={editingItem.nomeConta || ''}
                        onChange={(e) => setEditingItem({...editingItem, nomeConta: e.target.value})}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="moeda">Moeda</Label>
                    <Select
                      value={editingItem.Moeda || 'Real'}
                      onValueChange={(value) => setEditingItem({...editingItem, Moeda: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Real">Real (BRL)</SelectItem>
                        <SelectItem value="Dolar">Dólar (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ativo">Ativo</Label>
                      <Input
                        id="ativo"
                        value={editingItem.Ativo || ''}
                        onChange={(e) => setEditingItem({...editingItem, Ativo: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emissor">Emissor</Label>
                      <Input
                        id="emissor"
                        value={editingItem.Emissor || ''}
                        onChange={(e) => setEditingItem({...editingItem, Emissor: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="classe">Classe do Ativo</Label>
                      <Select 
                        value={editingItem["Classe do ativo"] || ''} 
                        onValueChange={(value) => setEditingItem({...editingItem, "Classe do ativo": value})}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a classe do ativo" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border z-50 max-h-[200px] overflow-y-auto">
                          {classesAtivo.length > 0 ? classesAtivo.map((classe) => (
                            <SelectItem key={classe} value={classe}>
                              {classe}
                            </SelectItem>
                          )) : (
                            <SelectItem value="carregando" disabled>
                              Carregando classes...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="posicao">Posição</Label>
                      <Input
                        id="posicao"
                        type="text"
                        value={numericFieldsText.Posicao}
                        onChange={(e) => {
                          const text = e.target.value;
                          setNumericFieldsText({...numericFieldsText, Posicao: text});
                        }}
                        onBlur={() => {
                          const text = numericFieldsText.Posicao;
                          const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
                          setEditingItem({...editingItem, Posicao: numericValue});
                          const formatted = formatBrazilianNumber(numericValue);
                          setNumericFieldsText({...numericFieldsText, Posicao: formatted});
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="taxa">Taxa</Label>
                      <Input
                        id="taxa"
                        value={editingItem.Taxa || ''}
                        onChange={(e) => setEditingItem({...editingItem, Taxa: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vencimento">Vencimento</Label>
                      <Input
                        id="vencimento"
                        type="date"
                        value={editingItem.Vencimento || ''}
                        onChange={(e) => setEditingItem({...editingItem, Vencimento: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="rendimento">Rendimento (%)</Label>
                    <div className="relative">
                      <Input
                        id="rendimento"
                        type="number"
                        step="0.0001"
                        value={(editingItem.Rendimento || 0) * 100}
                        onChange={(e) => setEditingItem({...editingItem, Rendimento: (parseFloat(e.target.value) || 0) / 100})}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCalculatorContext('single');
                        // Preencher automaticamente os campos da calculadora personalizada para Dados Detalhados
                        if (editingItem.Posicao) {
                          setCustomCalcData({
                            ...customCalcData,
                            valorInicial: editingItem.Posicao || 0,
                            competencia: editingItem.Competencia || ''
                          });
                        }
                        setIsCalculatorOpen(true);
                      }}
                      className="mt-2 w-full"
                    >
                      Calcular
                    </Button>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar {selectedItems.size} Registros em Lote
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Preencha apenas os campos que deseja alterar. Campos vazios não serão modificados.
            </div>
            
            {activeTab === 'consolidado' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-competencia">Competência</Label>
                    <Input
                      id="bulk-competencia"
                      value={bulkEditData.Competencia || ''}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.substring(0, 2) + '/' + value.substring(2, 6);
                        }
                        setBulkEditData({...bulkEditData, Competencia: value});
                      }}
                      placeholder="MM/YYYY"
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-instituicao">Instituição</Label>
                    <Input
                      id="bulk-instituicao"
                      value={bulkEditData.Instituicao || ''}
                      onChange={(e) => setBulkEditData({...bulkEditData, Instituicao: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-nomeConta">Nome da Conta</Label>
                    <Input
                      id="bulk-nomeConta"
                      value={bulkEditData.nomeConta || ''}
                      onChange={(e) => setBulkEditData({...bulkEditData, nomeConta: e.target.value})}
                      placeholder="Digite o nome da conta"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-rendimento">Rendimento (%)</Label>
                    <div className="relative">
                      <Input
                        id="bulk-rendimento"
                        type="number"
                        step="0.0001"
                        value={bulkEditData.Rendimento ? (bulkEditData.Rendimento * 100) : ''}
                        onChange={(e) => setBulkEditData({...bulkEditData, Rendimento: e.target.value ? (parseFloat(e.target.value) / 100) : undefined})}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCalculatorContext('bulk');
                        setIsCalculatorOpen(true);
                      }}
                      className="mt-2 w-full"
                    >
                      Calcular
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-competencia">Competência</Label>
                    <Input
                      id="bulk-competencia"
                      value={bulkEditData.Competencia || ''}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.substring(0, 2) + '/' + value.substring(2, 6);
                        }
                        setBulkEditData({...bulkEditData, Competencia: value});
                      }}
                      placeholder="MM/YYYY"
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-instituicao">Instituição</Label>
                    <Input
                      id="bulk-instituicao"
                      value={bulkEditData.Instituicao || ''}
                      onChange={(e) => setBulkEditData({...bulkEditData, Instituicao: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-emissor">Emissor</Label>
                    <Input
                      id="bulk-emissor"
                      value={bulkEditData.Emissor || ''}
                      onChange={(e) => setBulkEditData({...bulkEditData, Emissor: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-classe">Classe do Ativo</Label>
                    <Select 
                      value={bulkEditData["Classe do ativo"] || ''} 
                      onValueChange={(value) => setBulkEditData({...bulkEditData, "Classe do ativo": value})}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a classe do ativo" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border z-50 max-h-[200px] overflow-y-auto">
                        <SelectItem value="no-change">Não alterar</SelectItem>
                        {classesAtivo.map((classe) => (
                          <SelectItem key={classe} value={classe}>
                            {classe}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-taxa">Taxa</Label>
                    <Input
                      id="bulk-taxa"
                      value={bulkEditData.Taxa || ''}
                      onChange={(e) => setBulkEditData({...bulkEditData, Taxa: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-rendimento">Rendimento (%)</Label>
                    <div className="relative">
                      <Input
                        id="bulk-rendimento"
                        type="number"
                        step="0.0001"
                        value={bulkEditData.Rendimento ? (bulkEditData.Rendimento * 100) : ''}
                        onChange={(e) => setBulkEditData({...bulkEditData, Rendimento: e.target.value ? (parseFloat(e.target.value) / 100) : undefined})}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsBulkEditOpen(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleBulkSave}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calcular Rendimento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Seleção do modo */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={calculatorMode === 'auto' ? 'default' : 'outline'}
                onClick={() => setCalculatorMode('auto')}
              >
                Automático
              </Button>
              <Button
                variant={calculatorMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setCalculatorMode('manual')}
              >
                Manual
              </Button>
              <Button
                variant={calculatorMode === 'custom' ? 'default' : 'outline'}
                onClick={() => setCalculatorMode('custom')}
              >
                Personalizado
              </Button>
              <Button
                variant={calculatorMode === 'market' ? 'default' : 'outline'}
                onClick={() => setCalculatorMode('market')}
              >
                Mercado
              </Button>
            </div>

            {/* Modo Automático */}
            {calculatorMode === 'auto' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Calcula a rentabilidade ponderada dos ativos detalhados vinculados aos registros selecionados.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Critério:</strong> Mesma Competência, Instituição e Nome da Conta.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  {calculatorContext === 'bulk' ? (
                    <>
                      <p className="text-sm font-medium">Registros consolidados selecionados: {selectedItems.size}</p>
                      <p className="text-sm font-medium">Ativos vinculados: {getLinkedAssetsCount()}</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium">Ativos vinculados: {getLinkedAssetsCount()}</p>
                  )}
                </div>
              </div>
            )}

            {/* Modo Manual */}
            {calculatorMode === 'manual' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="calc-competencia">Competência</Label>
                  <Input
                    id="calc-competencia"
                    value={manualCalcData.competencia}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 6);
                      }
                      setManualCalcData({...manualCalcData, competencia: value});
                    }}
                    placeholder="MM/YYYY"
                    maxLength={7}
                  />
                </div>

                <div>
                  <Label htmlFor="calc-indexador">Indexador</Label>
                  <Select 
                    value={manualCalcData.indexador} 
                    onValueChange={(value) => {
                      if (value === 'CDI') {
                        setManualCalcData({...manualCalcData, indexador: value, cdiOperacao: '%', percentual: 100});
                      } else if (value === 'IPCA') {
                        setManualCalcData({...manualCalcData, indexador: value, ipcaOperacao: '+', percentual: 5});
                      } else if (value === 'PRE') {
                        setManualCalcData({...manualCalcData, indexador: value, percentual: 10});
                      } else {
                        setManualCalcData({...manualCalcData, indexador: value, percentual: 100});
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="IPCA">IPCA</SelectItem>
                      <SelectItem value="PRE">Pré-fixado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="calc-percentual">
                    {manualCalcData.indexador === 'PRE' 
                      ? 'Taxa Anual (%)' 
                      : manualCalcData.indexador === 'CDI' && manualCalcData.cdiOperacao === '%'
                        ? 'Percentual do CDI (%)'
                        : manualCalcData.indexador === 'CDI' && manualCalcData.cdiOperacao === '+'
                          ? 'Spread ao ano (%)'
                          : manualCalcData.indexador === 'IPCA'
                            ? 'Spread ao ano (%)'
                            : `Percentual do ${manualCalcData.indexador} (%)`
                    }
                  </Label>
                  
                  <div className="flex gap-2">
                    {/* Toggle % ou + (apenas para CDI) */}
                    {manualCalcData.indexador === 'CDI' && (
                      <div className="flex border rounded-md overflow-hidden">
                        <Button
                          type="button"
                          variant={manualCalcData.cdiOperacao === '%' ? 'default' : 'outline'}
                          onClick={() => setManualCalcData({...manualCalcData, cdiOperacao: '%', percentual: 100})}
                          className="rounded-none px-4"
                          size="sm"
                        >
                          %
                        </Button>
                        <Button
                          type="button"
                          variant={manualCalcData.cdiOperacao === '+' ? 'default' : 'outline'}
                          onClick={() => setManualCalcData({...manualCalcData, cdiOperacao: '+', percentual: 0})}
                          className="rounded-none px-4"
                          size="sm"
                        >
                          +
                        </Button>
                      </div>
                    )}
                    
                    <Input
                      id="calc-percentual"
                      type="number"
                      step="0.01"
                      value={manualCalcData.percentual}
                      onChange={(e) => setManualCalcData({...manualCalcData, percentual: parseFloat(e.target.value) || 0})}
                      className="flex-1"
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {manualCalcData.indexador === 'PRE' 
                      ? 'Ex: 12 para 12% ao ano'
                      : manualCalcData.indexador === 'CDI' && manualCalcData.cdiOperacao === '%'
                        ? 'Ex: 80 para 80% do CDI'
                        : manualCalcData.indexador === 'CDI' && manualCalcData.cdiOperacao === '+'
                          ? 'Ex: 2 para CDI + 2% a.a.'
                          : manualCalcData.indexador === 'IPCA'
                            ? 'Ex: 5 para IPCA + 5% a.a.'
                            : `Ex: 80 para 80% do ${manualCalcData.indexador}`}
                  </p>
                </div>
              </div>
            )}

            {/* Modo Personalizado */}
            {calculatorMode === 'custom' && (
              <div className="space-y-3">
                {/* Valor Inicial */}
                <div>
                  <Label htmlFor="calc-valor-inicial">Valor Inicial (R$)</Label>
                  <Input
                    id="calc-valor-inicial"
                    type="number"
                    step="0.01"
                    min="0"
                    value={customCalcData.valorInicial || ''}
                    onChange={(e) => setCustomCalcData({...customCalcData, valorInicial: parseFloat(e.target.value) || 0})}
                    placeholder="Ex: 10000.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Informe o valor do investimento inicial
                  </p>
                </div>

                {/* Competência */}
                <div>
                  <Label htmlFor="calc-custom-competencia">Competência</Label>
                  <Input
                    id="calc-custom-competencia"
                    value={customCalcData.competencia}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 6);
                      }
                      setCustomCalcData({...customCalcData, competencia: value});
                    }}
                    placeholder="MM/YYYY"
                    maxLength={7}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 10/2024 para outubro de 2024
                  </p>
                </div>

                {/* Indexador */}
                <div>
                  <Label htmlFor="calc-custom-indexador">Indexador</Label>
                  <Select 
                    value={customCalcData.indexador} 
                    onValueChange={(value) => {
                      if (value === 'CDI') {
                        setCustomCalcData({...customCalcData, indexador: value, cdiOperacao: '%', percentual: 100});
                      } else if (value === 'IPCA') {
                        setCustomCalcData({...customCalcData, indexador: value, percentual: 5});
                      } else if (value === 'PRE') {
                        setCustomCalcData({...customCalcData, indexador: value, percentual: 10});
                      } else if (value === 'MANUAL') {
                        setCustomCalcData({...customCalcData, indexador: value, percentual: 1.0});
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="IPCA">IPCA</SelectItem>
                      <SelectItem value="PRE">Pré-fixado</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Percentual/Taxa */}
                <div>
                  <Label htmlFor="calc-custom-percentual">
                    {customCalcData.indexador === 'MANUAL'
                      ? 'Rentabilidade do Mês (%)'
                      : customCalcData.indexador === 'PRE' 
                        ? 'Taxa Anual (%)' 
                        : customCalcData.indexador === 'CDI' && customCalcData.cdiOperacao === '%'
                          ? 'Percentual do CDI (%)'
                          : customCalcData.indexador === 'CDI' && customCalcData.cdiOperacao === '+'
                            ? 'Spread ao ano (%)'
                            : customCalcData.indexador === 'IPCA'
                              ? 'Spread ao ano (%)'
                              : `Percentual (%)`
                    }
                  </Label>
                  
                  <div className="flex gap-2">
                    {/* Toggle % ou + (apenas para CDI) */}
                    {customCalcData.indexador === 'CDI' && (
                      <div className="flex border rounded-md overflow-hidden">
                        <Button
                          type="button"
                          variant={customCalcData.cdiOperacao === '%' ? 'default' : 'outline'}
                          onClick={() => setCustomCalcData({...customCalcData, cdiOperacao: '%', percentual: 100})}
                          className="rounded-none px-4"
                          size="sm"
                        >
                          %
                        </Button>
                        <Button
                          type="button"
                          variant={customCalcData.cdiOperacao === '+' ? 'default' : 'outline'}
                          onClick={() => setCustomCalcData({...customCalcData, cdiOperacao: '+', percentual: 0})}
                          className="rounded-none px-4"
                          size="sm"
                        >
                          +
                        </Button>
                      </div>
                    )}
                    
                    <Input
                      id="calc-custom-percentual"
                      type="number"
                      step="0.01"
                      value={customCalcData.percentual}
                      onChange={(e) => setCustomCalcData({...customCalcData, percentual: parseFloat(e.target.value) || 0})}
                      className="flex-1"
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {customCalcData.indexador === 'MANUAL'
                      ? 'Ex: 1.5 para 1,5% de rentabilidade no mês'
                      : customCalcData.indexador === 'PRE' 
                        ? 'Ex: 12 para 12% ao ano'
                        : customCalcData.indexador === 'CDI' && customCalcData.cdiOperacao === '%'
                          ? 'Ex: 80 para 80% do CDI'
                          : customCalcData.indexador === 'CDI' && customCalcData.cdiOperacao === '+'
                            ? 'Ex: 2 para CDI + 2% a.a.'
                            : customCalcData.indexador === 'IPCA'
                              ? 'Ex: 5 para IPCA + 5% a.a.'
                              : `Ex: 80 para 80%`}
                  </p>
                </div>

                {/* Exibir resultados se já calculados */}
                {customCalcResults.valorFinal > 0 && (
                  <div className="bg-muted p-4 rounded-md space-y-2 border border-primary/20">
                    <h4 className="font-semibold text-sm">Resultado do Cálculo:</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Valor Percentual:</p>
                        <p className="font-medium">{customCalcResults.percentual.toFixed(4)}%</p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Ganho Financeiro:</p>
                        <p className="font-medium text-green-600">
                          R$ {customCalcResults.ganhoFinanceiro.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      </div>
                      
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Valor Final:</p>
                        <p className="font-medium text-lg">
                          R$ {customCalcResults.valorFinal.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modo Mercado */}
            {calculatorMode === 'market' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Busca automaticamente a rentabilidade real de um ativo em um mês específico usando dados de mercado do Yahoo Finance.
                </p>
                
                <div>
                  <Label htmlFor="calc-market-competencia">Competência</Label>
                  <Input
                    id="calc-market-competencia"
                    value={marketCalcData.competencia}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 6);
                      }
                      setMarketCalcData({...marketCalcData, competencia: value});
                    }}
                    placeholder="MM/YYYY"
                    maxLength={7}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 10/2024 para outubro de 2024
                  </p>
                </div>

                <div>
                  <Label htmlFor="calc-market-ticker">Ativo (Ticker)</Label>
                  <Input
                    id="calc-market-ticker"
                    value={marketCalcData.ticker}
                    onChange={(e) => setMarketCalcData({...marketCalcData, ticker: e.target.value.toUpperCase()})}
                    placeholder="Ex: PETR4.SA, AAPL, ^BVSP"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Para ações BR use .SA (ex: PETR4.SA). Para EUA apenas o símbolo (ex: AAPL)
                  </p>
                </div>

                {/* Botão Buscar */}
                <Button
                  onClick={handleFetchMarketData}
                  disabled={!marketCalcData.ticker || !marketCalcData.competencia || marketCalcLoading}
                  className="w-full"
                  variant="secondary"
                >
                  {marketCalcLoading ? 'Buscando...' : 'Buscar Rentabilidade'}
                </Button>

                {/* Exibir resultados se já buscados */}
                {marketCalcResult && (
                  <div className="bg-muted p-4 rounded-md space-y-2 border border-primary/20">
                    <h4 className="font-semibold text-sm">Resultado da Consulta:</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ticker:</p>
                        <p className="font-medium">{marketCalcResult.ticker}</p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Rentabilidade:</p>
                        <p className="font-medium text-green-600">
                          {marketCalcResult.monthlyReturn.toFixed(4)}%
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Preço Inicial:</p>
                        <p className="font-medium">
                          ${marketCalcResult.startPrice.toFixed(2)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Preço Final:</p>
                        <p className="font-medium">
                          ${marketCalcResult.endPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground italic mt-2">
                      ℹ️ Ao confirmar, este valor será usado como Rendimento
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCalculatorOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCalculatorConfirm}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
