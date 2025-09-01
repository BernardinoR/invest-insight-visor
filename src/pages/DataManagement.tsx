import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Search, CheckSquare, Square } from "lucide-react";
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
  
  // Get unique competencias for filtering
  const competencias = [...new Set([
    ...consolidadoData.map(item => item.Competencia),
    ...dadosData.map(item => item.Competencia)
  ])].filter(comp => comp && comp.trim() !== '').sort().reverse();

  // Get unique instituicoes for filtering
  const instituicoes = [...new Set([
    ...consolidadoData.map(item => item.Instituicao),
    ...dadosData.map(item => item.Instituicao)
  ])].filter(inst => inst && inst.trim() !== '').sort();

  const [selectedCompetencia, setSelectedCompetencia] = useState<string>("all");
  const [selectedInstituicao, setSelectedInstituicao] = useState<string>("all");
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

  // Filter data by selected competencia and instituicao
  let filteredConsolidadoData = consolidadoData;
  if (selectedCompetencia !== "all") {
    filteredConsolidadoData = filteredConsolidadoData.filter(item => item.Competencia === selectedCompetencia);
  }
  if (selectedInstituicao !== "all") {
    filteredConsolidadoData = filteredConsolidadoData.filter(item => item.Instituicao === selectedInstituicao);
  }

  let filteredDadosData = dadosData;
  if (selectedCompetencia !== "all") {
    filteredDadosData = filteredDadosData.filter(item => item.Competencia === selectedCompetencia);
  }
  if (selectedInstituicao !== "all") {
    filteredDadosData = filteredDadosData.filter(item => item.Instituicao === selectedInstituicao);
  }

  // Apply search filter for ativos
  if (searchAtivo.trim()) {
    filteredDadosData = filteredDadosData.filter(item => 
      item.Ativo?.toLowerCase().includes(searchAtivo.toLowerCase()) ||
      item.Emissor?.toLowerCase().includes(searchAtivo.toLowerCase()) ||
      item["Classe do ativo"]?.toLowerCase().includes(searchAtivo.toLowerCase())
    );
  }

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
          <ThemeToggle />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <Label htmlFor="competencia-filter">Competência</Label>
                <Select value={selectedCompetencia} onValueChange={setSelectedCompetencia}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione a competência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Competências</SelectItem>
                    {competencias.filter(comp => comp && comp.trim() !== '').map((competencia) => (
                      <SelectItem key={competencia} value={competencia}>
                        {competencia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="instituicao-filter">Instituição</Label>
                <Select value={selectedInstituicao} onValueChange={setSelectedInstituicao}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione a instituição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Instituições</SelectItem>
                    {instituicoes.map((instituicao) => (
                      <SelectItem key={instituicao} value={instituicao}>
                        {instituicao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  <Button onClick={() => handleCreate('consolidado')}>
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
                         <TableHead>Competência</TableHead>
                         <TableHead>Instituição</TableHead>
                         <TableHead>Patrimônio Inicial</TableHead>
                         <TableHead>Movimentação</TableHead>
                         <TableHead>Impostos</TableHead>
                         <TableHead>Ganho Financeiro</TableHead>
                         <TableHead>Patrimônio Final</TableHead>
                         <TableHead>Rendimento %</TableHead>
                         <TableHead>Ações</TableHead>
                       </TableRow>
                     </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                       ) : filteredConsolidadoData.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={10} className="text-center">
                             Nenhum dado encontrado
                           </TableCell>
                         </TableRow>
                       ) : (
                         filteredConsolidadoData.map((item) => (
                           <TableRow key={item.id} className={selectedItems.has(item.id) ? "bg-accent/50" : ""}>
                             <TableCell>
                               <Checkbox
                                 checked={selectedItems.has(item.id)}
                                 onCheckedChange={() => toggleItemSelection(item.id)}
                               />
                             </TableCell>
                             <TableCell className="font-medium">{item.Competencia}</TableCell>
                             <TableCell>{item.Instituicao}</TableCell>
                             <TableCell>{formatCurrency(item["Patrimonio Inicial"])}</TableCell>
                             <TableCell>{formatCurrency(item["Movimentação"])}</TableCell>
                             <TableCell>{formatCurrency(item.Impostos)}</TableCell>
                             <TableCell>{formatCurrency(item["Ganho Financeiro"])}</TableCell>
                             <TableCell>{formatCurrency(item["Patrimonio Final"])}</TableCell>
                             <TableCell>{((item.Rendimento || 0) * 100).toFixed(2)}%</TableCell>
                             <TableCell>
                               <div className="flex gap-2">
                                 <Button 
                                   size="sm" 
                                   variant="outline"
                                   onClick={() => handleEdit(item, 'consolidado')}
                                 >
                                   <Edit className="h-4 w-4" />
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   variant="destructive"
                                   onClick={() => handleDelete(item.id, 'consolidado')}
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
                          <TableCell colSpan={10} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                       ) : filteredDadosData.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={11} className="text-center">
                             Nenhum dado encontrado
                           </TableCell>
                         </TableRow>
                       ) : (
                         filteredDadosData.map((item) => (
                           <TableRow key={item.id} className={selectedItems.has(item.id) ? "bg-accent/50" : ""}>
                             <TableCell>
                               <Checkbox
                                 checked={selectedItems.has(item.id)}
                                 onCheckedChange={() => toggleItemSelection(item.id)}
                               />
                             </TableCell>
                             <TableCell className="font-medium">{item.Competencia}</TableCell>
                             <TableCell>{item.Instituicao}</TableCell>
                             <TableCell>{item.Ativo}</TableCell>
                             <TableCell>{item.Emissor}</TableCell>
                             <TableCell>{item["Classe do ativo"]}</TableCell>
                             <TableCell>{formatCurrency(item.Posicao || 0)}</TableCell>
                             <TableCell>{item.Taxa}</TableCell>
                             <TableCell>{item.Vencimento}</TableCell>
                             <TableCell>{((item.Rendimento || 0) * 100).toFixed(2)}%</TableCell>
                             <TableCell>
                               <div className="flex gap-2">
                                 <Button 
                                   size="sm" 
                                   variant="outline"
                                   onClick={() => handleEdit(item, 'dados')}
                                 >
                                   <Edit className="h-4 w-4" />
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   variant="destructive"
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
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patrimonioInicial">Patrimônio Inicial</Label>
                      <Input
                        id="patrimonioInicial"
                        type="number"
                        step="0.01"
                        value={editingItem["Patrimonio Inicial"] || 0}
                        onChange={(e) => setEditingItem({...editingItem, "Patrimonio Inicial": parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="movimentacao">Movimentação</Label>
                      <Input
                        id="movimentacao"
                        type="number"
                        step="0.01"
                        value={editingItem["Movimentação"] || 0}
                        onChange={(e) => setEditingItem({...editingItem, "Movimentação": parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="impostos">Impostos</Label>
                      <Input
                        id="impostos"
                        type="number"
                        step="0.01"
                        value={editingItem.Impostos || 0}
                        onChange={(e) => setEditingItem({...editingItem, Impostos: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ganhoFinanceiro">Ganho Financeiro</Label>
                      <Input
                        id="ganhoFinanceiro"
                        type="number"
                        step="0.01"
                        value={editingItem["Ganho Financeiro"] || 0}
                        onChange={(e) => setEditingItem({...editingItem, "Ganho Financeiro": parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patrimonioFinal">Patrimônio Final</Label>
                      <Input
                        id="patrimonioFinal"
                        type="number"
                        step="0.01"
                        value={editingItem["Patrimonio Final"] || 0}
                        onChange={(e) => setEditingItem({...editingItem, "Patrimonio Final": parseFloat(e.target.value) || 0})}
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
                        value={editingItem.Posicao ? Number(editingItem.Posicao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        onChange={(e) => {
                          // Remove R$, espaços e converte vírgulas para pontos
                          let value = e.target.value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
                          const numericValue = parseFloat(value) || 0;
                          setEditingItem({...editingItem, Posicao: numericValue});
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedData = e.clipboardData.getData('text');
                          // Remove R$, espaços e converte formato brasileiro para decimal
                          let value = pastedData.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
                          const numericValue = parseFloat(value) || 0;
                          setEditingItem({...editingItem, Posicao: numericValue});
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