import { useParams, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Search, CheckSquare, Square, ChevronDown, FileCheck, CheckCircle2, AlertCircle, XCircle, Info, ExternalLink, ArrowRight, Filter as FilterIcon, ArrowUp, ArrowDown, SortAsc, Settings, Settings2 } from "lucide-react";
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
  "Rendimento": number;
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
  const [calculatorMode, setCalculatorMode] = useState<'auto' | 'manual'>('auto');
  const [manualCalcData, setManualCalcData] = useState({
    competencia: '',
    indexador: 'CDI',
    percentual: 100,
    cdiOperacao: '%', // '%' ou '+'
    ipcaOperacao: '+' // Sempre '+' para IPCA
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
    new Set(['Competência', 'Instituição', 'Nome da Conta', 'Moeda', 'Ativo', 'Emissor', 'Classe', 'Posição', 'Rendimento %', 'Ações'])
  );

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
      // Define a list of asset classes based on PoliticaInvestimentos table structure
      const classesAtivoStatic = [
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
      ];
      console.log('Classes de ativo carregadas:', classesAtivoStatic);
      setClassesAtivo(classesAtivoStatic);
    } catch (error) {
      console.error('Erro ao buscar classes de ativo:', error);
    }
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
        const rendimento = detalhado.Rendimento || 0;
        
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

  // Função para confirmar e aplicar o cálculo ao campo Rendimento
  const handleCalculatorConfirm = () => {
    let calculatedReturn: number | null = null;

    if (calculatorMode === 'auto') {
      calculatedReturn = calculateWeightedReturn();
    } else {
      calculatedReturn = calculateManualReturn();
    }

    if (calculatedReturn !== null) {
      // Arredondar para 4 casas decimais (resultará em 2 casas quando exibido como %)
      const roundedReturn = Math.round(calculatedReturn * 10000) / 10000;
      
      // Atualizar dependendo do contexto
      if (calculatorContext === 'bulk') {
        setBulkEditData({...bulkEditData, Rendimento: roundedReturn});
      } else if (calculatorContext === 'single') {
        setEditingItem({...editingItem, Rendimento: roundedReturn});
      }
      
      setIsCalculatorOpen(false);
    }
  };

  const handleEdit = useCallback((item: any, type: 'consolidado' | 'dados') => {
    setEditingItem({ ...item, type });
    setIsDialogOpen(true);
  }, []);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercentage = (value: number) => {
    return ((value || 0) * 100).toFixed(2).replace('.', ',') + '%';
  };

  // Advanced filtering logic
  const applyFilters = (data: ConsolidadoData[], filters: Filter[]) => {
    return data.filter(item => {
      return filters.every(filter => {
        const fieldValue = item[filter.field as keyof ConsolidadoData];
        
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

  // Sorting logic
  const applySorting = (data: ConsolidadoData[], sortConfig: SortConfig | null) => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.field as keyof ConsolidadoData];
      const bValue = b[sortConfig.field as keyof ConsolidadoData];
      
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

  const filterableFields = useMemo(() => [
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

  const getFieldType = (fieldKey: string) => {
    const field = filterableFields.find(f => f.key === fieldKey);
    return field?.type || 'text';
  };

  const getFieldLabel = (fieldKey: string) => {
    const field = filterableFields.find(f => f.key === fieldKey);
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
    const field = filterableFields.find(f => f.key === fieldKey);
    return (field as any)?.options || null;
  };

  interface VerificationResult {
    status: 'match' | 'tolerance' | 'mismatch' | 'no-data';
    consolidatedValue: number;
    detailedSum: number;
    difference: number;
    detailedCount: number;
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
      detailedCount: relatedDetails.length
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
      detailedCount: 0
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
    data = applyFilters(data, activeFilters);
    
    // Apply verification filter - USING CACHE
    if (verifFilter !== 'all') {
      data = data.filter(item => {
        const verification = getVerification(item);
        return verification.status === verifFilter;
      });
    }
    
    // Apply sorting
    data = applySorting(data, sortConfig);
    
    return data;
  }, [consolidadoData, selectedCompetencias, selectedInstituicoes, activeFilters, verifFilter, sortConfig, getVerification]);

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

    // Apply search filter for ativos
    if (searchAtivo.trim()) {
      const searchLower = searchAtivo.toLowerCase();
      data = data.filter(item => 
        item.Ativo?.toLowerCase().includes(searchLower) ||
        item.Emissor?.toLowerCase().includes(searchLower) ||
        item["Classe do ativo"]?.toLowerCase().includes(searchLower)
      );
    }
    
    return data;
  }, [dadosData, selectedCompetencias, selectedInstituicoes, selectedClasses, selectedEmissores, searchAtivo]);

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
                  {filterableFields.map(f => (
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
    const sortableFields = filterableFields;

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
            <div className="grid grid-cols-4 gap-4">
              {(() => {
                // FASE 1: Usar cache para calcular estatísticas
                const stats = filteredConsolidadoData.reduce((acc, item) => {
                  const verification = getVerification(item);
                  acc[verification.status]++;
                  return acc;
                }, { match: 0, tolerance: 0, mismatch: 0, 'no-data': 0 });
                
                return (
                  <>
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
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{stats['no-data']}</p>
                        <p className="text-sm text-muted-foreground">Sem Dados</p>
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
                             {visibleColumns.has('Patrimônio Inicial') && <TableCell className="text-right">{formatCurrency(item["Patrimonio Inicial"])}</TableCell>}
                             {visibleColumns.has('Movimentação') && <TableCell className="text-right">{formatCurrency(item["Movimentação"])}</TableCell>}
                             {visibleColumns.has('Impostos') && <TableCell className="text-right">{formatCurrency(item.Impostos)}</TableCell>}
                             {visibleColumns.has('Ganho Financeiro') && <TableCell className="text-right">{formatCurrency(item["Ganho Financeiro"])}</TableCell>}
                             {visibleColumns.has('Patrimônio Final') && <TableCell className="text-right">{formatCurrency(item["Patrimonio Final"])}</TableCell>}
                             {visibleColumns.has('Rendimento %') && <TableCell className="text-right">{formatPercentage(item.Rendimento)}</TableCell>}
                              {visibleColumns.has('Verificação') && (
                                <TableCell className="text-center">
                                  {(() => {
                                    const verification = getVerification(item);
                                   
                                   return (
                                     <Popover>
                                       <PopoverTrigger asChild>
                                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                           {verification.status === 'match' && (
                                             <CheckCircle2 className="h-5 w-5 text-green-500" />
                                           )}
                                           {verification.status === 'tolerance' && (
                                             <AlertCircle className="h-5 w-5 text-yellow-500" />
                                           )}
                                           {verification.status === 'mismatch' && (
                                             <XCircle className="h-5 w-5 text-red-500" />
                                           )}
                                           {verification.status === 'no-data' && (
                                             <Info className="h-5 w-5 text-blue-500" />
                                           )}
                                         </Button>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-80">
                                         <div className="space-y-2">
                                           <h4 className="font-medium text-sm">Verificação de Integridade</h4>
                                           <div className="text-sm space-y-1">
                                             <div className="flex justify-between">
                                               <span className="text-muted-foreground">Patrimônio Final:</span>
                                               <span className="font-medium">{formatCurrency(verification.consolidatedValue)}</span>
                                             </div>
                                             <div className="flex justify-between">
                                               <span className="text-muted-foreground">Soma Detalhada:</span>
                                               <span className="font-medium">{formatCurrency(verification.detailedSum)}</span>
                                             </div>
                                             <div className="flex justify-between">
                                               <span className="text-muted-foreground">Diferença:</span>
                                               <span className={`font-medium ${
                                                 verification.status === 'mismatch' ? 'text-red-500' : 
                                                 verification.status === 'tolerance' ? 'text-yellow-500' : 
                                                 'text-green-500'
                                               }`}>
                                                 {formatCurrency(verification.difference)}
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
                
                {/* Barra de Ferramentas */}
                <div className="flex items-center gap-2 mb-3">
                  <FilterBuilder onAddFilter={handleAddFilter} />
                  
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
                        
                        {['Competência', 'Instituição', 'Nome da Conta', 'Moeda', 'Ativo', 'Emissor', 'Classe', 'Posição', 'Taxa', 'Vencimento', 'Rendimento %', 'Ações'].map((col) => (
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
                            onClick={() => setVisibleColumnsDetalhados(new Set(['Competência', 'Instituição', 'Nome da Conta', 'Moeda', 'Ativo', 'Emissor', 'Classe', 'Posição', 'Taxa', 'Vencimento', 'Rendimento %', 'Ações']))}
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
                              {visibleColumnsDetalhados.has('Posição') && <TableCell>{formatCurrency(item.Posicao)}</TableCell>}
                              {visibleColumnsDetalhados.has('Taxa') && <TableCell>{item.Taxa}</TableCell>}
                              {visibleColumnsDetalhados.has('Vencimento') && <TableCell>{item.Vencimento}</TableCell>}
                              {visibleColumnsDetalhados.has('Rendimento %') && <TableCell>{formatPercentage(item.Rendimento)}</TableCell>}
                              {visibleColumnsDetalhados.has('Ações') && (
                                <TableCell>
                                  <div className="flex items-center gap-1">
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
                        value={editingItem["Patrimonio Inicial"] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Se contém vírgula, trata como formato brasileiro
                          if (value.includes(',')) {
                            const numericValue = parseFloat(value.replace(',', '.')) || 0;
                            setEditingItem({...editingItem, "Patrimonio Inicial": numericValue});
                          } else {
                            // Se não contém vírgula, trata como número normal
                            const numericValue = parseFloat(value) || 0;
                            setEditingItem({...editingItem, "Patrimonio Inicial": numericValue});
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="movimentacao">Movimentação</Label>
                      <Input
                        id="movimentacao"
                        type="text"
                        value={editingItem["Movimentação"] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Se contém vírgula, trata como formato brasileiro
                          if (value.includes(',')) {
                            const numericValue = parseFloat(value.replace(',', '.')) || 0;
                            setEditingItem({...editingItem, "Movimentação": numericValue});
                          } else {
                            // Se não contém vírgula, trata como número normal
                            const numericValue = parseFloat(value) || 0;
                            setEditingItem({...editingItem, "Movimentação": numericValue});
                          }
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
                        value={editingItem.Impostos || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Se contém vírgula, trata como formato brasileiro
                          if (value.includes(',')) {
                            const numericValue = parseFloat(value.replace(',', '.')) || 0;
                            setEditingItem({...editingItem, Impostos: numericValue});
                          } else {
                            // Se não contém vírgula, trata como número normal
                            const numericValue = parseFloat(value) || 0;
                            setEditingItem({...editingItem, Impostos: numericValue});
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ganhoFinanceiro">Ganho Financeiro</Label>
                      <Input
                        id="ganhoFinanceiro"
                        type="text"
                        value={editingItem["Ganho Financeiro"] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Se contém vírgula, trata como formato brasileiro
                          if (value.includes(',')) {
                            const numericValue = parseFloat(value.replace(',', '.')) || 0;
                            setEditingItem({...editingItem, "Ganho Financeiro": numericValue});
                          } else {
                            // Se não contém vírgula, trata como número normal
                            const numericValue = parseFloat(value) || 0;
                            setEditingItem({...editingItem, "Ganho Financeiro": numericValue});
                          }
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
                        value={editingItem["Patrimonio Final"] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Se contém vírgula, trata como formato brasileiro
                          if (value.includes(',')) {
                            const numericValue = parseFloat(value.replace(',', '.')) || 0;
                            setEditingItem({...editingItem, "Patrimonio Final": numericValue});
                          } else {
                            // Se não contém vírgula, trata como número normal
                            const numericValue = parseFloat(value) || 0;
                            setEditingItem({...editingItem, "Patrimonio Final": numericValue});
                          }
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
                        value={editingItem.Posicao || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Se contém vírgula, trata como formato brasileiro
                          if (value.includes(',')) {
                            const numericValue = parseFloat(value.replace(',', '.')) || 0;
                            setEditingItem({...editingItem, Posicao: numericValue});
                          } else {
                            // Se não contém vírgula, trata como número normal
                            const numericValue = parseFloat(value) || 0;
                            setEditingItem({...editingItem, Posicao: numericValue});
                          }
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
            <div className="flex gap-2">
              <Button
                variant={calculatorMode === 'auto' ? 'default' : 'outline'}
                onClick={() => setCalculatorMode('auto')}
                className="flex-1"
              >
                Automático
              </Button>
              <Button
                variant={calculatorMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setCalculatorMode('manual')}
                className="flex-1"
              >
                Manual
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
