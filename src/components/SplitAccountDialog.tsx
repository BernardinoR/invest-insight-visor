import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scissors, Save, Play, Loader2, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SplitAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consolidado: any | null;
  dadosData: any[];
  consolidadoData?: any[];
  clientName?: string;
  onSuccess: () => void;
  preloadConfigId?: string | null;
  initialTab?: 'form' | 'saved';
}

interface SplitAtivo {
  id: number;
  Ativo: string;
  Posicao: number;
  selected: boolean;
  percentual: number;
  valorTransferido: number;
}

interface SplitConfig {
  id: string;
  cliente: string;
  instituicao: string;
  nome_conta_origem: string;
  nome_conta_destino: string;
  percentual_padrao: number;
  ativos_especificos: Array<{ ativo: string; percentual: number }>;
  ativo: boolean;
  is_outra_pessoa?: boolean;
  created_at: string;
  updated_at: string;
}

const formatBR = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SplitAccountDialog({
  open,
  onOpenChange,
  consolidado,
  dadosData,
  consolidadoData,
  clientName,
  onSuccess,
  preloadConfigId,
  initialTab = 'form',
}: SplitAccountDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [nomeContaDestino, setNomeContaDestino] = useState('');
  const [isOutraPessoa, setIsOutraPessoa] = useState(false);
  const [ativos, setAtivos] = useState<SplitAtivo[]>([]);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Saved configs state
  const [configs, setConfigs] = useState<SplitConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const resolvedClientName = clientName || consolidado?.Nome || '';

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Fetch saved configs
  const fetchConfigs = async () => {
    if (!resolvedClientName) return;
    setConfigsLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_split_configs')
        .select('*')
        .eq('cliente', resolvedClientName)
        .eq('ativo', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConfigs(
        (data || []).map((c: any) => ({
          ...c,
          ativos_especificos: (c.ativos_especificos as any) || [],
        }))
      );
    } catch {
      setConfigs([]);
    } finally {
      setConfigsLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchConfigs();
  }, [open, resolvedClientName]);

  // Load assets and saved config when dialog opens with a consolidado
  useEffect(() => {
    if (!open || !consolidado) {
      setAtivos([]);
      setNomeContaDestino('');
      setIsOutraPessoa(false);
      setConfigId(null);
      setConfigLoaded(false);
      return;
    }

    const comp = consolidado.Competencia;
    const linkedAtivos = dadosData.filter(
      d =>
        d.Competencia === comp &&
        d.Instituicao === consolidado.Instituicao &&
        (d.nomeConta || '') === (consolidado.nomeConta || '') &&
        d.Nome === consolidado.Nome
    );

    const initialAtivos: SplitAtivo[] = linkedAtivos.map(a => ({
      id: a.id,
      Ativo: a.Ativo || '(sem nome)',
      Posicao: a.Posicao || 0,
      selected: false,
      percentual: 100,
      valorTransferido: 0,
    }));

    loadSavedConfig(consolidado, initialAtivos, preloadConfigId || undefined);
  }, [open, consolidado, dadosData, preloadConfigId]);

  const loadSavedConfig = async (cons: any, initialAtivos: SplitAtivo[], forceConfigId?: string) => {
    try {
      let fetchedConfigs: any[] | null = null;

      if (forceConfigId) {
        const { data } = await supabase
          .from('account_split_configs')
          .select('*')
          .eq('id', forceConfigId)
          .limit(1);
        fetchedConfigs = data;
      } else {
        const { data } = await supabase
          .from('account_split_configs')
          .select('*')
          .eq('cliente', cons.Nome)
          .eq('instituicao', cons.Instituicao)
          .eq('nome_conta_origem', cons.nomeConta || '')
          .eq('ativo', true)
          .limit(1);
        fetchedConfigs = data;
      }

      if (fetchedConfigs && fetchedConfigs.length > 0) {
        const config = fetchedConfigs[0];
        setConfigId(config.id);
        setNomeContaDestino(config.nome_conta_destino);
        setIsOutraPessoa(!!config.is_outra_pessoa);

        const especificos: Array<{ ativo: string; percentual: number }> =
          (config.ativos_especificos as any) || [];
        const defaultPct = Number(config.percentual_padrao) || 0;

        const updatedAtivos = initialAtivos.map(a => {
          const rule = especificos.find(e => e.ativo === a.Ativo);
          if (rule) {
            const pct = rule.percentual;
            return {
              ...a,
              selected: true,
              percentual: pct,
              valorTransferido: Math.round(a.Posicao * (pct / 100) * 100) / 100,
            };
          }
          if (defaultPct > 0) {
            return {
              ...a,
              selected: true,
              percentual: defaultPct,
              valorTransferido: Math.round(a.Posicao * (defaultPct / 100) * 100) / 100,
            };
          }
          return a;
        });

        setAtivos(updatedAtivos);
      } else {
        setAtivos(initialAtivos);
      }
      setConfigLoaded(true);
    } catch {
      setAtivos(initialAtivos);
      setConfigLoaded(true);
    }
  };

  const handleToggle = (index: number, checked: boolean) => {
    const updated = [...ativos];
    updated[index].selected = checked;
    if (checked) {
      updated[index].valorTransferido =
        Math.round(updated[index].Posicao * (updated[index].percentual / 100) * 100) / 100;
    } else {
      updated[index].valorTransferido = 0;
    }
    setAtivos(updated);
  };

  const handlePercentChange = (index: number, pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct));
    const updated = [...ativos];
    updated[index].percentual = clamped;
    updated[index].valorTransferido =
      updated[index].selected
        ? Math.round(updated[index].Posicao * (clamped / 100) * 100) / 100
        : 0;
    setAtivos(updated);
  };

  const totalTransferido = useMemo(
    () => ativos.filter(a => a.selected).reduce((s, a) => s + a.valorTransferido, 0),
    [ativos]
  );

  const totalOriginal = useMemo(
    () => ativos.reduce((s, a) => s + a.Posicao, 0),
    [ativos]
  );

  const totalRestante = totalOriginal - totalTransferido;
  const selectedCount = ativos.filter(a => a.selected).length;

  const buildConfigPayload = () => {
    const especificos = ativos
      .filter(a => a.selected)
      .map(a => ({ ativo: a.Ativo, percentual: a.percentual }));

    return {
      cliente: consolidado!.Nome,
      instituicao: consolidado!.Instituicao,
      nome_conta_origem: consolidado!.nomeConta || '',
      nome_conta_destino: nomeContaDestino,
      percentual_padrao: 0,
      ativos_especificos: especificos,
      ativo: true,
      is_outra_pessoa: isOutraPessoa,
    };
  };

  const handleSaveConfig = async () => {
    if (!nomeContaDestino.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome da sub-conta destino', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = buildConfigPayload();
      if (configId) {
        const { error } = await supabase
          .from('account_split_configs')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('account_split_configs')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setConfigId(data.id);
      }
      toast({ title: 'Config salva!', description: 'Regras de split salvas para reutilização.' });
      fetchConfigs();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!nomeContaDestino.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome da sub-conta destino', variant: 'destructive' });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: 'Erro', description: 'Selecione ao menos um ativo', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Save config first
      const payload = buildConfigPayload();
      if (configId) {
        await supabase
          .from('account_split_configs')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', configId);
      } else {
        const { data } = await supabase
          .from('account_split_configs')
          .insert(payload)
          .select('id')
          .single();
        if (data) setConfigId(data.id);
      }

      // Execute split on DadosPerformance
      const selected = ativos.filter(a => a.selected);

      for (const ativo of selected) {
        if (ativo.percentual === 100) {
          const { error } = await supabase
            .from('DadosPerformance')
            .update({ nomeConta: nomeContaDestino, is_outra_pessoa: isOutraPessoa })
            .eq('id', ativo.id);
          if (error) throw error;
        } else {
          const valorOriginalRestante = Math.round((ativo.Posicao - ativo.valorTransferido) * 100) / 100;

          const { error: updateError } = await supabase
            .from('DadosPerformance')
            .update({ Posicao: valorOriginalRestante })
            .eq('id', ativo.id);
          if (updateError) throw updateError;

          const { data: original, error: fetchError } = await supabase
            .from('DadosPerformance')
            .select('*')
            .eq('id', ativo.id)
            .single();
          if (fetchError) throw fetchError;

          const { id, created_at, ...rest } = original;
          const { error: insertError } = await supabase
            .from('DadosPerformance')
            .insert({
              ...rest,
              Posicao: ativo.valorTransferido,
              nomeConta: nomeContaDestino,
              is_outra_pessoa: isOutraPessoa,
            });
          if (insertError) throw insertError;
        }
      }

      // Auto-calculate consolidated for BOTH accounts
      const comp = consolidado!.Competencia;
      const inst = consolidado!.Instituicao;
      const nome = consolidado!.Nome;
      const contaOrigem = consolidado!.nomeConta || '';

      // Fetch updated assets for original account
      const { data: ativosOrigem } = await supabase
        .from('DadosPerformance')
        .select('Posicao, Rendimento')
        .eq('Nome', nome)
        .eq('Competencia', comp)
        .eq('Instituicao', inst)
        .eq('nomeConta', contaOrigem);

      // Fetch updated assets for destination account
      const { data: ativosDestino } = await supabase
        .from('DadosPerformance')
        .select('Posicao, Rendimento')
        .eq('Nome', nome)
        .eq('Competencia', comp)
        .eq('Instituicao', inst)
        .eq('nomeConta', nomeContaDestino);

      const calcOrigem = calcularConsolidadoFromAtivos(ativosOrigem || []);
      const calcDestino = calcularConsolidadoFromAtivos(ativosDestino || []);

      // Update original consolidated
      const { error: updateConsError } = await supabase
        .from('ConsolidadoPerformance')
        .update({
          'Patrimonio Final': calcOrigem.patrimonioFinal,
          'Patrimonio Inicial': calcOrigem.patrimonioInicial,
          'Ganho Financeiro': calcOrigem.ganhoFinanceiro,
          Rendimento: calcOrigem.rendimento,
        })
        .eq('id', consolidado!.id);
      if (updateConsError) throw updateConsError;

      // Create/update consolidated for the destination sub-account
      const { error: consError } = await supabase
        .from('ConsolidadoPerformance')
        .insert({
          Nome: nome,
          Competencia: comp,
          Instituicao: inst,
          nomeConta: nomeContaDestino,
          Moeda: consolidado!.Moeda || 'Real',
          'Patrimonio Inicial': calcDestino.patrimonioInicial,
          'Patrimonio Final': calcDestino.patrimonioFinal,
          'Ganho Financeiro': calcDestino.ganhoFinanceiro,
          Rendimento: calcDestino.rendimento,
          'Movimentação': 0,
          Impostos: 0,
          Data: consolidado!.Data,
          is_outra_pessoa: isOutraPessoa,
        });
      if (consError) throw consError;

      toast({
        title: 'Split aplicado!',
        description: `${selected.length} ativo(s) movidos para "${nomeContaDestino}". Consolidados recalculados automaticamente.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Erro no split:', err);
      toast({ title: 'Erro', description: err.message || 'Erro ao aplicar split', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Helper: calculate consolidated values from assets
  const calcularConsolidadoFromAtivos = (ativosArr: any[]) => {
    const patrimonioFinal = ativosArr.reduce((s: number, a: any) => s + (a.Posicao || 0), 0);
    const weightedSum = ativosArr.reduce((s: number, a: any) => s + ((a.Posicao || 0) * (a.Rendimento || 0)), 0);
    const rendimento = patrimonioFinal > 0 ? weightedSum / patrimonioFinal : 0;
    const patrimonioInicial = rendimento !== 0 ? patrimonioFinal / (1 + rendimento) : patrimonioFinal;
    const ganhoFinanceiro = patrimonioFinal - patrimonioInicial;
    return { patrimonioFinal, patrimonioInicial, ganhoFinanceiro, rendimento };
  };

  // Load config into form from saved configs tab
  const loadConfigIntoForm = (config: SplitConfig) => {
    const allConsolidados = consolidadoData || [];
    const match = allConsolidados.find(
      (c: any) =>
        c.Instituicao === config.instituicao &&
        (c.nomeConta || '') === config.nome_conta_origem
    );

    if (!match) {
      toast({
        title: 'Consolidado não encontrado',
        description: `Não há consolidado para ${config.instituicao} / ${config.nome_conta_origem || '(sem conta)'} na competência atual.`,
        variant: 'destructive',
      });
      return null;
    }

    const comp = match.Competencia;
    const linkedAtivos = dadosData.filter(
      (d: any) =>
        d.Competencia === comp &&
        d.Instituicao === match.Instituicao &&
        (d.nomeConta || '') === (match.nomeConta || '') &&
        d.Nome === match.Nome
    );

    const initialAtivos: SplitAtivo[] = linkedAtivos.map((a: any) => ({
      id: a.id,
      Ativo: a.Ativo || '(sem nome)',
      Posicao: a.Posicao || 0,
      selected: false,
      percentual: 100,
      valorTransferido: 0,
    }));

    const especificos = config.ativos_especificos || [];
    const defaultPct = Number(config.percentual_padrao) || 0;

    const updatedAtivos = initialAtivos.map(a => {
      const rule = especificos.find(e => e.ativo === a.Ativo);
      if (rule) {
        const pct = rule.percentual;
        return { ...a, selected: true, percentual: pct, valorTransferido: Math.round(a.Posicao * (pct / 100) * 100) / 100 };
      }
      if (defaultPct > 0) {
        return { ...a, selected: true, percentual: defaultPct, valorTransferido: Math.round(a.Posicao * (defaultPct / 100) * 100) / 100 };
      }
      return a;
    });

    return { updatedAtivos, match };
  };

  // Saved configs tab: apply a config
  const handleApplyConfig = (config: SplitConfig) => {
    const result = loadConfigIntoForm(config);
    if (!result) return;

    setConfigId(config.id);
    setNomeContaDestino(config.nome_conta_destino);
    setIsOutraPessoa(!!config.is_outra_pessoa);
    setAtivos(result.updatedAtivos);
    setConfigLoaded(true);
    setActiveTab('form');
  };

  // Saved configs tab: edit a config
  const handleEditConfig = (config: SplitConfig) => {
    const result = loadConfigIntoForm(config);
    if (!result) return;

    setConfigId(config.id);
    setNomeContaDestino(config.nome_conta_destino);
    setIsOutraPessoa(!!config.is_outra_pessoa);
    setAtivos(result.updatedAtivos);
    setConfigLoaded(true);
    setActiveTab('form');
  };

  const handleDeleteConfig = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('account_split_configs')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Config removida' });
      fetchConfigs();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const showForm = consolidado && configLoaded;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              Separar Conta
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Separar Conta</TabsTrigger>
              <TabsTrigger value="saved">
                Configs Salvas
                {configs.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{configs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form">
              {showForm ? (
                <div className="space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{consolidado.Instituicao}</Badge>
                    <Badge variant="secondary">{consolidado.Nome}</Badge>
                    <Badge>{consolidado.Competencia}</Badge>
                    {consolidado.nomeConta && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Conta: {consolidado.nomeConta}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Sub-conta destino */}
                  <div className="space-y-2">
                    <Label>Sub-conta destino (nomeConta)</Label>
                    <Input
                      value={nomeContaDestino}
                      onChange={e => setNomeContaDestino(e.target.value)}
                      placeholder="Ex: Maria Luiza"
                    />
                  </div>

                  <Separator />

                  {/* Table of assets */}
                  <div className="border rounded-md overflow-auto max-h-[40vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Ativo</TableHead>
                          <TableHead className="text-right">Posição Atual</TableHead>
                          <TableHead className="text-center w-24">%</TableHead>
                          <TableHead className="text-right">Valor Transferido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ativos.map((ativo, idx) => (
                          <TableRow key={ativo.id} className={ativo.selected ? 'bg-primary/5' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={ativo.selected}
                                onCheckedChange={(checked) => handleToggle(idx, !!checked)}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-sm">{ativo.Ativo}</TableCell>
                            <TableCell className="text-right text-sm">{formatBR(ativo.Posicao)}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={ativo.percentual}
                                onChange={e => handlePercentChange(idx, parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs w-20 text-center mx-auto"
                                disabled={!ativo.selected}
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {ativo.selected ? formatBR(ativo.valorTransferido) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Conta Original:</span>
                      <span className="font-semibold">R$ {formatBR(totalRestante)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sub-conta ({nomeContaDestino || '...'}):</span>
                      <span className="font-semibold text-primary">R$ {formatBR(totalTransferido)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Total:</span>
                      <span>R$ {formatBR(totalOriginal)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button variant="secondary" onClick={handleSaveConfig} disabled={saving || !nomeContaDestino.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Salvar Config
                    </Button>
                    <Button onClick={handleApply} disabled={saving || selectedCount === 0 || !nomeContaDestino.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                      Aplicar Split
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Selecione um consolidado na tabela e clique no botão <Scissors className="inline h-4 w-4" /> para separar uma conta.
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved">
              <div className="space-y-3">
                {configsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : configs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Nenhuma configuração de split salva para este cliente.
                  </div>
                ) : (
                  configs.map((config) => (
                    <div
                      key={config.id}
                      className="border rounded-lg p-3 bg-muted/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{config.instituicao}</Badge>
                          <span className="text-sm text-muted-foreground">→</span>
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                            {config.nome_conta_destino}
                          </Badge>
                          {config.nome_conta_origem && (
                            <span className="text-xs text-muted-foreground">
                              (origem: {config.nome_conta_origem})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditConfig(config)}
                            title="Editar config"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-primary"
                            onClick={() => handleApplyConfig(config)}
                            title="Aplicar na competência atual"
                          >
                            <Play className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Aplicar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(config.id)}
                            title="Excluir config"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {config.ativos_especificos.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {config.ativos_especificos.map((a, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal">
                              {a.ativo} ({a.percentual}%)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir configuração de split?</AlertDialogTitle>
            <AlertDialogDescription>
              A configuração será desativada. Isso não desfaz splits já aplicados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfig}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
