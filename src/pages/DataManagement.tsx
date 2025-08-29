import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Search } from "lucide-react";
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
  
  // Get unique competencias for filtering
  const competencias = [...new Set([
    ...consolidadoData.map(item => item.Competencia),
    ...dadosData.map(item => item.Competencia)
  ])].sort().reverse();

  const [selectedCompetencia, setSelectedCompetencia] = useState<string>("all");
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  // Filter data by selected competencia and search term
  const filteredConsolidadoData = selectedCompetencia === "all" 
    ? consolidadoData 
    : consolidadoData.filter(item => item.Competencia === selectedCompetencia);

  let filteredDadosData = selectedCompetencia === "all" 
    ? dadosData 
    : dadosData.filter(item => item.Competencia === selectedCompetencia);

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

        {/* Competencia Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrar por Competência</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompetencia} onValueChange={setSelectedCompetencia}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a competência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Competências</SelectItem>
                {competencias.map((competencia) => (
                  <SelectItem key={competencia} value={competencia}>
                    {competencia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                </div>
                <Button onClick={() => handleCreate('consolidado')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Registro
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                          <TableCell colSpan={9} className="text-center">
                            Nenhum dado encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredConsolidadoData.map((item) => (
                          <TableRow key={item.id}>
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
                </div>
                <div className="flex items-center gap-4">
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
                          <TableCell colSpan={10} className="text-center">
                            Nenhum dado encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDadosData.map((item) => (
                          <TableRow key={item.id}>
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
                        onChange={(e) => setEditingItem({...editingItem, Competencia: e.target.value})}
                        placeholder="MM/YYYY"
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
                      <Input
                        id="rendimento"
                        type="number"
                        step="0.0001"
                        value={editingItem.Rendimento || 0}
                        onChange={(e) => setEditingItem({...editingItem, Rendimento: parseFloat(e.target.value) || 0})}
                      />
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
                        onChange={(e) => setEditingItem({...editingItem, Competencia: e.target.value})}
                        placeholder="MM/YYYY"
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
                            <SelectItem value="" disabled>
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
                        type="number"
                        step="0.01"
                        value={editingItem.Posicao || 0}
                        onChange={(e) => setEditingItem({...editingItem, Posicao: parseFloat(e.target.value) || 0})}
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
                    <Input
                      id="rendimento"
                      type="number"
                      step="0.0001"
                      value={editingItem.Rendimento || 0}
                      onChange={(e) => setEditingItem({...editingItem, Rendimento: parseFloat(e.target.value) || 0})}
                    />
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
    </div>
  );
}