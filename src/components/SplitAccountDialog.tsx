import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scissors, Save, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SplitAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consolidado: any | null;
  dadosData: any[];
  onSuccess: () => void;
  preloadConfigId?: string | null;
}

interface SplitAtivo {
  id: number;
  Ativo: string;
  Posicao: number;
  selected: boolean;
  percentual: number;
  valorTransferido: number;
}

const formatBR = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SplitAccountDialog({
  open,
  onOpenChange,
  consolidado,
  dadosData,
  onSuccess,
  preloadConfigId,
}: SplitAccountDialogProps) {
  const { toast } = useToast();
  const [nomeContaDestino, setNomeContaDestino] = useState('');
  const [ativos, setAtivos] = useState<SplitAtivo[]>([]);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load assets and saved config when dialog opens
  useEffect(() => {
    if (!open || !consolidado) {
      setAtivos([]);
      setNomeContaDestino('');
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

    // Load saved config (prefer preloadConfigId if provided)
    loadSavedConfig(consolidado, initialAtivos, preloadConfigId || undefined);
  }, [open, consolidado, dadosData, preloadConfigId]);

  const loadSavedConfig = async (cons: any, initialAtivos: SplitAtivo[], forceConfigId?: string) => {
    try {
      let configs: any[] | null = null;

      if (forceConfigId) {
        const { data } = await supabase
          .from('account_split_configs')
          .select('*')
          .eq('id', forceConfigId)
          .limit(1);
        configs = data;
      } else {
        const { data } = await supabase
          .from('account_split_configs')
          .select('*')
          .eq('cliente', cons.Nome)
          .eq('instituicao', cons.Instituicao)
          .eq('nome_conta_origem', cons.nomeConta || '')
          .eq('ativo', true)
          .limit(1);
        configs = data;
      }

      if (configs && configs.length > 0) {
        const config = configs[0];
        setConfigId(config.id);
        setNomeContaDestino(config.nome_conta_destino);

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

      // Execute split
      const selected = ativos.filter(a => a.selected);

      for (const ativo of selected) {
        if (ativo.percentual === 100) {
          // Move entirely: update nomeConta
          const { error } = await supabase
            .from('DadosPerformance')
            .update({ nomeConta: nomeContaDestino })
            .eq('id', ativo.id);
          if (error) throw error;
        } else {
          // Partial split: reduce original, insert new
          const valorOriginalRestante = Math.round((ativo.Posicao - ativo.valorTransferido) * 100) / 100;

          const { error: updateError } = await supabase
            .from('DadosPerformance')
            .update({ Posicao: valorOriginalRestante })
            .eq('id', ativo.id);
          if (updateError) throw updateError;

          // Get full record to duplicate
          const { data: original, error: fetchError } = await supabase
            .from('DadosPerformance')
            .select('*')
            .eq('id', ativo.id)
            .single();
          if (fetchError) throw fetchError;

          // Insert split copy
          const { id, created_at, ...rest } = original;
          const { error: insertError } = await supabase
            .from('DadosPerformance')
            .insert({
              ...rest,
              Posicao: ativo.valorTransferido,
              nomeConta: nomeContaDestino,
            });
          if (insertError) throw insertError;
        }
      }

      // Create consolidated for the sub-account
      const { error: consError } = await supabase
        .from('ConsolidadoPerformance')
        .insert({
          Nome: consolidado!.Nome,
          Competencia: consolidado!.Competencia,
          Instituicao: consolidado!.Instituicao,
          nomeConta: nomeContaDestino,
          Moeda: consolidado!.Moeda || 'Real',
          'Patrimonio Inicial': 0,
          'Patrimonio Final': totalTransferido,
          'Ganho Financeiro': 0,
          Rendimento: 0,
          'Movimentação': 0,
          Impostos: 0,
          Data: consolidado!.Data,
        });
      if (consError) throw consError;

      // Update original consolidated
      const newPatrimonioFinal = (consolidado!['Patrimonio Final'] || 0) - totalTransferido;
      const { error: updateConsError } = await supabase
        .from('ConsolidadoPerformance')
        .update({ 'Patrimonio Final': newPatrimonioFinal })
        .eq('id', consolidado!.id);
      if (updateConsError) throw updateConsError;

      toast({
        title: 'Split aplicado!',
        description: `${selected.length} ativo(s) movidos para "${nomeContaDestino}". Consolidado criado.`,
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

  if (!consolidado || !configLoaded) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Separar Conta
          </DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
