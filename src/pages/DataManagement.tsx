import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Search, CheckSquare, Square, ChevronDown, FileCheck, CheckCircle2, AlertCircle, XCircle, Info, ExternalLink, ArrowRight, Filter as FilterIcon, ArrowUp, ArrowDown, SortAsc } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCDIData } from '@/hooks/useCDIData';
import { usePTAXData } from '@/hooks/usePTAXData';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [calculatorMode, setCalculatorMode] = useState<'auto' | 'manual'>('auto');
  const [manualCalcData, setManualCalcData] = useState({
    competencia: '',
    indexador: 'CDI',
    percentual: 100
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
  
  // Get unique values for filtering
  const competencias = [...new Set([
    ...consolidadoData.map(item => item.Competencia),
    ...dadosData.map(item => item.Competencia)
  ])].filter(comp => comp && comp.trim() !== '').sort().reverse();

  const instituicoes = [...new Set([
    ...consolidadoData.map(item => item.Instituicao),
    ...dadosData.map(item => item.Instituicao)
  ])].filter(inst => inst && inst.trim() !== '').sort();

  // Get unique classes and emissores for filtering (dados detalhados)
  const classesAtivoUnique = [...new Set(dadosData.map(item => item["Classe do ativo"]))].filter(classe => classe && classe.trim() !== '').sort();
  const emissores = [...new Set(dadosData.map(item => item.Emissor))].filter(emissor => emissor && emissor.trim() !== '').sort();
  
  // Get unique values for Nome da Conta and Moeda
  const nomesContaUnique = [...new Set(consolidadoData.map(item => item.nomeConta))]
    .filter(nome => nome && nome.trim() !== '')
    .sort();

  const moedasUnique = [...new Set(consolidadoData.map(item => item.Moeda))]
    .filter(moeda => moeda && moeda.trim() !== '')
    .sort();

  const [selectedCompetencias, setSelectedCompetencias] = useState<string[]>([]);
  const [selectedInstituicoes, setSelectedInstituicoes] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedEmissores, setSelectedEmissores] = useState<string[]>([]);
  const [searchAtivo, setSearchAtivo] = useState<string>("");
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
    const selectedConsolidados = consolidadoData.filter(item => selectedItems.has(item.id));
    
    if (selectedConsolidados.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum registro selecionado",
        variant: "destructive",
      });
      return null;
    }

    let totalPosicao = 0;
    let weightedRendimento = 0;

    selectedConsolidados.forEach(consolidado => {
      const matchingDetalhados = dadosData.filter(dado => 
        dado.Competencia === consolidado.Competencia &&
        dado.Instituicao === consolidado.Instituicao &&
        dado.nomeConta === consolidado.nomeConta
      );

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
        description: "Nenhum ativo detalhado encontrado para os registros selecionados",
        variant: "destructive",
      });
      return null;
    }

    const rendimentoPonderado = weightedRendimento / totalPosicao;
    
    toast({
      title: "Cálculo Realizado",
      description: `Rentabilidade ponderada: ${(rendimentoPonderado * 100).toFixed(4)}%`,
    });

    return rendimentoPonderado;
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

      baseReturn = cdiRecord.cdiRate;
      const rendimentoFinal = baseReturn * (percentual / 100);

      toast({
        title: "Cálculo Realizado",
        description: `${percentual}% do ${indexador} em ${competencia}: ${(rendimentoFinal * 100).toFixed(4)}%`,
      });

      return rendimentoFinal;
      
    } else if (indexador === 'IPCA') {
      toast({
        title: "Aviso",
        description: "Cálculo baseado em IPCA ainda não implementado. Use CDI ou Pré-fixado.",
        variant: "destructive",
      });
      return null;
      
    } else if (indexador === 'PRE') {
      const taxaAnual = percentual / 100;
      const taxaMensal = Math.pow(1 + taxaAnual, 1/12) - 1;
      
      toast({
        title: "Cálculo Realizado",
        description: `Pré-fixado ${percentual}% a.a. = ${(taxaMensal * 100).toFixed(4)}% no mês`,
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
      setBulkEditData({...bulkEditData, Rendimento: calculatedReturn});
      setIsCalculatorOpen(false);
    }
  };

  const handleEdit = (item: any, type: 'consolidado' | 'dados') => {
    setEditingItem({ ...item, type });
    setIsDialogOpen(true);
  };

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

  // Multi-selection functions
  const toggleItemSelection = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAllVisibleItems = () => {
    const visibleItems = activeTab === 'consolidado' ? filteredConsolidadoData : filteredDadosData;
    const allIds = new Set(visibleItems.map(item => item.id));
    setSelectedItems(allIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

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
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
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

  const verifyIntegrity = (
    competencia: string, 
    instituicao: string, 
    nomeConta: string,
    patrimonioFinal: number
  ): VerificationResult => {
    // Filtrar dados detalhados com a mesma chave
    const relatedDetails = dadosData.filter(item => 
      item.Competencia === competencia &&
      item.Instituicao === instituicao &&
      item.nomeConta === nomeConta
    );
    
    // Somar todas as posições
    const detailedSum = relatedDetails.reduce((sum, item) => sum + (item.Posicao || 0), 0);
    
    // Calcular diferença
    const difference = Math.abs(patrimonioFinal - detailedSum);
    
    // Determinar status
    let status: VerificationResult['status'];
    if (relatedDetails.length === 0) {
      status = 'no-data';
    } else if (difference < 0.01) { // Menos de 1 centavo
      status = 'match';
    } else if (difference < 1.00) { // Menos de R$ 1,00
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
  };

  // Filter data with advanced filters
  let filteredConsolidadoData = consolidadoData;
  
  // Apply old filters for backward compatibility
  if (selectedCompetencias.length > 0) {
    filteredConsolidadoData = filteredConsolidadoData.filter(item => 
      selectedCompetencias.includes(item.Competencia)
    );
  }
  if (selectedInstituicoes.length > 0) {
    filteredConsolidadoData = filteredConsolidadoData.filter(item => 
      selectedInstituicoes.includes(item.Instituicao)
    );
  }
  
  // Apply advanced filters
  filteredConsolidadoData = applyFilters(filteredConsolidadoData, activeFilters);
  
  // Apply sorting
  filteredConsolidadoData = applySorting(filteredConsolidadoData, sortConfig);

  let filteredDadosData = dadosData;
  if (selectedCompetencias.length > 0) {
    filteredDadosData = filteredDadosData.filter(item => 
      selectedCompetencias.includes(item.Competencia)
    );
  }
  if (selectedInstituicoes.length > 0) {
    filteredDadosData = filteredDadosData.filter(item => 
      selectedInstituicoes.includes(item.Instituicao)
    );
  }

  // Apply additional filters for dados detalhados
  if (selectedClasses.length > 0) {
    filteredDadosData = filteredDadosData.filter(item => 
      selectedClasses.includes(item["Classe do ativo"])
    );
  }
  if (selectedEmissores.length > 0) {
    filteredDadosData = filteredDadosData.filter(item => 
      selectedEmissores.includes(item.Emissor)
    );
  }

  // Apply search filter for ativos
  if (searchAtivo.trim()) {
    filteredDadosData = filteredDadosData.filter(item => 
      item.Ativo?.toLowerCase().includes(searchAtivo.toLowerCase()) ||
      item.Emissor?.toLowerCase().includes(searchAtivo.toLowerCase()) ||
      item["Classe do ativo"]?.toLowerCase().includes(searchAtivo.toLowerCase())
    );
  }

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
            <ThemeToggle />
          </div>
        </div>


        {/* Painel de Resumo de Verificação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo de Verificação de Integridade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {(() => {
                const stats = filteredConsolidadoData.reduce((acc, item) => {
                  const verification = verifyIntegrity(
                    item.Competencia,
                    item.Instituicao,
                    item.nomeConta,
                    item["Patrimonio Final"]
                  );
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consolidado">Dados Consolidados</TabsTrigger>
            <TabsTrigger value="detalhados">Dados Detalhados</TabsTrigger>
          </TabsList>

          <TabsContent value="consolidado">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <CardTitle>Dados Consolidados</CardTitle>
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
                  <SortButton sortConfig={sortConfig} onSort={setSortConfig} />
                  
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
                         {visibleColumns.has('Competência') && <TableHead className="w-24">Competência</TableHead>}
                         {visibleColumns.has('Instituição') && <TableHead className="w-28">Instituição</TableHead>}
                         {visibleColumns.has('Nome da Conta') && <TableHead className="w-32">Nome da Conta</TableHead>}
                         {visibleColumns.has('Moeda') && <TableHead className="w-20">Moeda</TableHead>}
                         {visibleColumns.has('Patrimônio Inicial') && <TableHead className="text-right w-32">Patrim. Inicial</TableHead>}
                         {visibleColumns.has('Movimentação') && <TableHead className="text-right w-28">Movimentação</TableHead>}
                         {visibleColumns.has('Impostos') && <TableHead className="text-right w-24">Impostos</TableHead>}
                         {visibleColumns.has('Ganho Financeiro') && <TableHead className="text-right w-28">Ganho Financ.</TableHead>}
                         {visibleColumns.has('Patrimônio Final') && <TableHead className="text-right w-32">Patrim. Final</TableHead>}
                         {visibleColumns.has('Rendimento %') && <TableHead className="text-right w-24">Rend. %</TableHead>}
                         {visibleColumns.has('Verificação') && <TableHead className="text-center w-20">Verif.</TableHead>}
                         {visibleColumns.has('Ações') && <TableHead className="w-36">Ações</TableHead>}
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
                                   const verification = verifyIntegrity(
                                     item.Competencia,
                                     item.Instituicao,
                                     item.nomeConta,
                                     item["Patrimonio Final"]
                                   );
                                   
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
                                                 ⚠️ Diferença significativa detectada. Verifique os dados detalhados.
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
                                     const verification = verifyIntegrity(
                                       item.Competencia,
                                       item.Instituicao,
                                       item.nomeConta,
                                       item["Patrimonio Final"]
                                     );
                                     
                                     return (
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         className="h-8 px-2 hover:bg-primary/10 text-primary"
                                         onClick={() => {
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dados Detalhados</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Dados detalhados de ativos por competência
                  </p>
                  {activeTab === 'detalhados' && selectedItems.size > 0 && (
                    <div className="flex items-center gap-2 mt-2">
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
                </div>
                <div className="flex items-center gap-4">
                  {activeTab === 'detalhados' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={selectAllVisibleItems}
                      className="h-8"
                    >
                      <CheckSquare className="mr-1 h-3 w-3" />
                      Selecionar Todos
                    </Button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por ativo, emissor ou classe..."
                      value={searchAtivo}
                      onChange={(e) => setSearchAtivo(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button onClick={() => handleCreate('dados')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Registro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
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
                          <TableHead>Competência</TableHead>
                          <TableHead>Instituição</TableHead>
                          <TableHead>Nome da Conta</TableHead>
                          <TableHead>Moeda</TableHead>
                          <TableHead>Ativo</TableHead>
                          <TableHead>Emissor</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Posição</TableHead>
                          <TableHead>Taxa</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Rendimento %</TableHead>
                          <TableHead>Ações</TableHead>
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
                          filteredDadosData.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedItems.has(item.id)}
                                  onCheckedChange={() => toggleItemSelection(item.id)}
                                />
                              </TableCell>
                              <TableCell>{item.Competencia}</TableCell>
                              <TableCell>{item.Instituicao}</TableCell>
                              <TableCell>{item.nomeConta || '-'}</TableCell>
                              <TableCell>{item.Moeda || '-'}</TableCell>
                              <TableCell>{item.Ativo}</TableCell>
                              <TableCell>{item.Emissor}</TableCell>
                              <TableCell>{item["Classe do ativo"]}</TableCell>
                              <TableCell>{formatCurrency(item.Posicao)}</TableCell>
                              <TableCell>{item.Taxa}</TableCell>
                              <TableCell>{item.Vencimento}</TableCell>
                              <TableCell>{formatPercentage(item.Rendimento)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(item, 'dados')}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(item.id, 'dados')}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                       )}
                     </TableBody>
                   </Table>
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
        </Tabs>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar' : 'Criar'} {editingItem?.type === 'consolidado' ? 'Dado Consolidado' : 'Dado Detalhado'}
            </DialogTitle>
          </DialogHeader>
          
          {editingItem && (
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
          )}
        </DialogContent>
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
                      onClick={() => setIsCalculatorOpen(true)}
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
                  <p className="text-sm font-medium">Registros selecionados: {selectedItems.size}</p>
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
                    onValueChange={(value) => setManualCalcData({...manualCalcData, indexador: value})}
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
                    {manualCalcData.indexador === 'PRE' ? 'Taxa Anual (%)' : `Percentual do ${manualCalcData.indexador} (%)`}
                  </Label>
                  <Input
                    id="calc-percentual"
                    type="number"
                    step="0.01"
                    value={manualCalcData.percentual}
                    onChange={(e) => setManualCalcData({...manualCalcData, percentual: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {manualCalcData.indexador === 'PRE' 
                      ? 'Ex: 12 para 12% ao ano'
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
