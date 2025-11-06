import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Search, CheckSquare, Square, ChevronDown, FileCheck, CheckCircle2, AlertCircle, XCircle, Info, ExternalLink, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
    
    setLoading(true);
    try {
      // Fetch consolidated data
      const { data: consolidadoResponse, error: consolidadoError } = await supabase
        .from('ConsolidadoPerformance')
        .select('*')
        .eq('Nome', decodedClientName)
        .order('Competencia', { ascending: false });

      if (consolidadoError) throw consolidadoError;

      // Fetch detailed data
      const { data: dadosResponse, error: dadosError } = await supabase
        .from('DadosPerformance')
        .select('*')
        .eq('Nome', decodedClientName)
        .order('Competencia', { ascending: false });

      if (dadosError) throw dadosError;

      setConsolidadoData(consolidadoResponse || []);
      setDadosData(dadosResponse || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Filter data by selected filters
  let filteredConsolidadoData = consolidadoData;
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

  // Multi-Select Component
  const MultiSelectFilter = ({ 
    label, 
    options, 
    selected, 
    onChange 
  }: { 
    label: string; 
    options: string[]; 
    selected: string[]; 
    onChange: (values: string[]) => void 
  }) => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Label>{label}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              {selected.length === 0 
                ? `Todos ${label.toLowerCase()}` 
                : selected.length === 1 
                  ? selected[0] 
                  : `${selected.length} selecionados`
              }
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
              <div className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                <Checkbox
                  checked={selected.length === 0}
                  onCheckedChange={() => {
                    onChange([]);
                    // Não fechar o popover aqui
                  }}
                />
                <span className="text-sm">Todos</span>
              </div>
              {options.map((option) => (
                <div key={option} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                  <Checkbox
                    checked={selected.includes(option)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selected, option]);
                      } else {
                        onChange(selected.filter(item => item !== option));
                      }
                      // Não fechar o popover aqui
                    }}
                  />
                  <span className="text-sm">{option}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
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

        {/* Multi-Select Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MultiSelectFilter
                label="Competências"
                options={competencias}
                selected={selectedCompetencias}
                onChange={setSelectedCompetencias}
              />
              <MultiSelectFilter
                label="Instituições"
                options={instituicoes}
                selected={selectedInstituicoes}
                onChange={setSelectedInstituicoes}
              />
              <MultiSelectFilter
                label="Classes de Ativo"
                options={classesAtivoUnique}
                selected={selectedClasses}
                onChange={setSelectedClasses}
              />
              <MultiSelectFilter
                label="Emissores"
                options={emissores}
                selected={selectedEmissores}
                onChange={setSelectedEmissores}
              />
            </div>
          </CardContent>
        </Card>

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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dados Consolidados</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Performance consolidada por competência e instituição
                  </p>
                  {activeTab === 'consolidado' && selectedItems.size > 0 && (
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
                <div className="flex items-center gap-2">
                  {activeTab === 'consolidado' && (
                    <>
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
                                        // Sempre manter pelo menos Ações visível
                                        if (column !== 'Ações') {
                                          newVisible.delete(column);
                                        }
                                      }
                                      setVisibleColumns(newVisible);
                                    }}
                                    disabled={column === 'Ações'} // Ações sempre visível
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
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={selectAllVisibleItems}
                        className="h-8"
                      >
                        <CheckSquare className="mr-1 h-3 w-3" />
                        Selecionar Todos
                      </Button>
                    </>
                  )}
                  <Button onClick={() => handleCreate('consolidado')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Registro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
    </div>
  );
}
