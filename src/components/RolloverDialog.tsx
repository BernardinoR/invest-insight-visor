import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FastForward, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type CalcMode = 'CDI' | 'pctCDI' | 'IPCA' | 'PRE' | 'Manual';

interface RolloverAtivo {
  id: number;
  Ativo: string;
  Posicao: number;
  Rendimento: number | string | null;
  Emissor: string;
  'Classe do ativo': string;
  Taxa: string;
  Vencimento: string;
  Moeda: string;
  nomeConta: string;
  Instituicao: string;
  Nome: string;
  Data: string;
  liquidez: string | null;
  // Rollover fields
  modo: CalcMode;
  parametro: number;
  novaPosicao: number;
  rendimento: number;
}

interface RolloverData {
  consolidado: any;
  ativos: RolloverAtivo[];
  novaCompetencia: string;
  competenciaOrigem: string;
}

interface RolloverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consolidado: any | null;
  dadosData: any[];
  cdiData: any[];
  marketIndicators: any[];
  onSuccess: () => void;
}

function getNextCompetencia(comp: string): string {
  if (!comp) return '';
  const parts = comp.split('/');
  if (parts.length !== 2) return '';
  let month = parseInt(parts[0]);
  let year = parseInt(parts[1]);
  month++;
  if (month > 12) {
    month = 1;
    year++;
  }
  return `${String(month).padStart(2, '0')}/${year}`;
}

function getCDIMensal(cdiData: any[], competencia: string): number {
  const entry = cdiData.find(d => d.competencia === competencia);
  return entry ? entry.cdiRate : 0;
}

function getIPCAMensal(marketIndicators: any[], competencia: string): number {
  const entry = marketIndicators.find(d => d.competencia === competencia);
  return entry ? entry.ipca : 0;
}

function calcularRendimento(modo: CalcMode, parametro: number, cdiMensal: number, ipcaMensal: number): number {
  switch (modo) {
    case 'CDI':
      return cdiMensal;
    case 'pctCDI':
      return cdiMensal * (parametro / 100);
    case 'IPCA': {
      const spreadMensal = Math.pow(1 + (parametro / 100), 1 / 12) - 1;
      return (1 + ipcaMensal) * (1 + spreadMensal) - 1;
    }
    case 'PRE':
      return Math.pow(1 + (parametro / 100), 1 / 12) - 1;
    case 'Manual':
      return parametro / 100;
    default:
      return 0;
  }
}

const MODE_LABELS: Record<CalcMode, string> = {
  CDI: 'CDI',
  pctCDI: '% do CDI',
  IPCA: 'IPCA+',
  PRE: 'Pré-fixado',
  Manual: 'Manual',
};

export function RolloverDialog({
  open,
  onOpenChange,
  consolidado,
  dadosData,
  cdiData,
  marketIndicators,
  onSuccess,
}: RolloverDialogProps) {
  const { toast } = useToast();
  const [rolloverData, setRolloverData] = useState<RolloverData | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState<CalcMode>('CDI');
  const [bulkParametro, setBulkParametro] = useState<number>(100);

  // Initialize rollover data when dialog opens
  useEffect(() => {
    if (!open || !consolidado) {
      setRolloverData(null);
      return;
    }

    const comp = consolidado.Competencia;
    const novaComp = getNextCompetencia(comp);
    const cdiMensal = getCDIMensal(cdiData, comp);
    const ipcaMensal = getIPCAMensal(marketIndicators, comp);

    // Find linked assets
    const linkedAtivos = dadosData.filter(
      d =>
        d.Competencia === comp &&
        d.Instituicao === consolidado.Instituicao &&
        (d.nomeConta || '') === (consolidado.nomeConta || '') &&
        d.Nome === consolidado.Nome
    );

    const ativosComRollover: RolloverAtivo[] = linkedAtivos.map(a => {
      const rendimento = calcularRendimento('CDI', 100, cdiMensal, ipcaMensal);
      const novaPosicao = (a.Posicao || 0) * (1 + rendimento);
      return {
        ...a,
        modo: 'CDI' as CalcMode,
        parametro: 100,
        novaPosicao: Math.round(novaPosicao * 100) / 100,
        rendimento: rendimento * 100,
      };
    });

    setRolloverData({
      consolidado,
      ativos: ativosComRollover,
      novaCompetencia: novaComp,
      competenciaOrigem: comp,
    });
    setBulkMode('CDI');
    setBulkParametro(100);
  }, [open, consolidado, dadosData, cdiData, marketIndicators]);

  const recalcAtivo = (ativos: RolloverAtivo[], index: number, modo: CalcMode, parametro: number): RolloverAtivo[] => {
    if (!rolloverData) return ativos;
    const cdiMensal = getCDIMensal(cdiData, rolloverData.competenciaOrigem);
    const ipcaMensal = getIPCAMensal(marketIndicators, rolloverData.competenciaOrigem);
    const updated = [...ativos];
    const rendimento = calcularRendimento(modo, parametro, cdiMensal, ipcaMensal);
    const novaPosicao = (updated[index].Posicao || 0) * (1 + rendimento);
    updated[index] = {
      ...updated[index],
      modo,
      parametro,
      rendimento: rendimento * 100,
      novaPosicao: Math.round(novaPosicao * 100) / 100,
    };
    return updated;
  };

  const handleUpdateAtivo = (index: number, campo: 'modo' | 'parametro' | 'novaPosicao', valor: any) => {
    if (!rolloverData) return;
    let ativos = [...rolloverData.ativos];

    if (campo === 'modo') {
      const defaultParam = valor === 'pctCDI' ? 100 : valor === 'IPCA' ? 6 : valor === 'PRE' ? 14 : valor === 'Manual' ? 1 : 100;
      ativos = recalcAtivo(ativos, index, valor as CalcMode, defaultParam);
    } else if (campo === 'parametro') {
      ativos = recalcAtivo(ativos, index, ativos[index].modo, parseFloat(valor) || 0);
    } else if (campo === 'novaPosicao') {
      ativos[index] = {
        ...ativos[index],
        novaPosicao: parseFloat(valor) || 0,
        rendimento: ativos[index].Posicao > 0
          ? ((parseFloat(valor) || 0) / ativos[index].Posicao - 1) * 100
          : 0,
      };
    }

    setRolloverData({ ...rolloverData, ativos });
  };

  const handleApplyAll = () => {
    if (!rolloverData) return;
    const cdiMensal = getCDIMensal(cdiData, rolloverData.competenciaOrigem);
    const ipcaMensal = getIPCAMensal(marketIndicators, rolloverData.competenciaOrigem);

    const ativos = rolloverData.ativos.map(a => {
      const rendimento = calcularRendimento(bulkMode, bulkParametro, cdiMensal, ipcaMensal);
      const novaPosicao = (a.Posicao || 0) * (1 + rendimento);
      return {
        ...a,
        modo: bulkMode,
        parametro: bulkParametro,
        rendimento: rendimento * 100,
        novaPosicao: Math.round(novaPosicao * 100) / 100,
      };
    });

    setRolloverData({ ...rolloverData, ativos });
  };

  const totalNovaPosicao = useMemo(() => {
    if (!rolloverData) return 0;
    return rolloverData.ativos.reduce((sum, a) => sum + a.novaPosicao, 0);
  }, [rolloverData]);

  const totalPosicaoAtual = useMemo(() => {
    if (!rolloverData) return 0;
    return rolloverData.ativos.reduce((sum, a) => sum + (a.Posicao || 0), 0);
  }, [rolloverData]);

  const rendimentoPonderado = useMemo(() => {
    if (!rolloverData || totalPosicaoAtual === 0) return 0;
    return rolloverData.ativos.reduce((sum, a) => {
      const peso = (a.Posicao || 0) / totalPosicaoAtual;
      return sum + a.rendimento * peso;
    }, 0);
  }, [rolloverData, totalPosicaoAtual]);

  const handleExecuteRollover = async () => {
    if (!rolloverData) return;
    setSaving(true);

    try {
      const { novaCompetencia, consolidado, ativos } = rolloverData;

      // Check for duplicates
      const { data: existingConsolidado } = await supabase
        .from('ConsolidadoPerformance')
        .select('id')
        .eq('Nome', consolidado.Nome)
        .eq('Competencia', novaCompetencia)
        .eq('Instituicao', consolidado.Instituicao)
        .eq('nomeConta', consolidado.nomeConta || '')
        .limit(1);

      if (existingConsolidado && existingConsolidado.length > 0) {
        toast({
          title: 'Já existe',
          description: `Já existe consolidado para ${consolidado.Instituicao} em ${novaCompetencia}`,
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      // Insert assets
      const ativoInserts = ativos.map(a => ({
        Nome: a.Nome,
        Competencia: novaCompetencia,
        Instituicao: a.Instituicao,
        nomeConta: a.nomeConta || '',
        Moeda: a.Moeda || 'Real',
        Ativo: a.Ativo,
        Emissor: a.Emissor,
        'Classe do ativo': a['Classe do ativo'],
        Taxa: a.Taxa,
        Vencimento: a.Vencimento,
        Posicao: a.novaPosicao,
        Rendimento: a.rendimento / 100,
        Data: novaCompetencia,
        liquidez: a.liquidez,
        rentabilidade_validada: true,
      }));

      const { error: ativoError } = await supabase
        .from('DadosPerformance')
        .insert(ativoInserts);

      if (ativoError) throw ativoError;

      // Insert consolidado
      const patrimonioInicial = totalPosicaoAtual;
      const patrimonioFinal = totalNovaPosicao;
      const ganhoFinanceiro = patrimonioFinal - patrimonioInicial;
      const rendimentoConsolidado = patrimonioInicial > 0
        ? (patrimonioFinal / patrimonioInicial - 1)
        : 0;

      const { error: consolidadoError } = await supabase
        .from('ConsolidadoPerformance')
        .insert({
          Nome: consolidado.Nome,
          Competencia: novaCompetencia,
          Instituicao: consolidado.Instituicao,
          nomeConta: consolidado.nomeConta || '',
          Moeda: consolidado.Moeda || 'Real',
          'Patrimonio Inicial': patrimonioInicial,
          'Patrimonio Final': patrimonioFinal,
          'Ganho Financeiro': ganhoFinanceiro,
          Rendimento: rendimentoConsolidado,
          'Movimentação': 0,
          Impostos: 0,
          Data: novaCompetencia,
        });

      if (consolidadoError) throw consolidadoError;

      toast({
        title: 'Competência avançada!',
        description: `${ativos.length} ativo(s) + 1 consolidado criados em ${novaCompetencia}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro no rollover:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao avançar competência',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!rolloverData) return null;

  const isMulti = rolloverData.ativos.length > 1;

  const renderModeSelect = (value: CalcMode, onChange: (v: CalcMode) => void, size?: string) => (
    <Select value={value} onValueChange={(v) => onChange(v as CalcMode)}>
      <SelectTrigger className={size === 'sm' ? 'h-8 text-xs w-[110px]' : ''}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="CDI">CDI</SelectItem>
        <SelectItem value="pctCDI">% do CDI</SelectItem>
        <SelectItem value="IPCA">IPCA+</SelectItem>
        <SelectItem value="PRE">Pré-fixado</SelectItem>
        <SelectItem value="Manual">Manual</SelectItem>
      </SelectContent>
    </Select>
  );

  const renderParameterInput = (modo: CalcMode, parametro: number, onChange: (v: number) => void, size?: string) => {
    if (modo === 'CDI') return null;
    const placeholder = modo === 'pctCDI' ? '110' : modo === 'IPCA' ? '6' : modo === 'PRE' ? '14' : '1.5';
    const suffix = modo === 'pctCDI' ? '%' : modo === 'IPCA' ? '% a.a.' : modo === 'PRE' ? '% a.a.' : '%';
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.01"
          value={parametro}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={size === 'sm' ? 'h-8 text-xs w-[70px]' : 'w-[80px]'}
          placeholder={placeholder}
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMulti ? 'max-w-4xl max-h-[85vh] overflow-y-auto' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FastForward className="h-5 w-5 text-primary" />
            Avançar Competência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header info */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{rolloverData.consolidado.Instituicao}</Badge>
            <Badge variant="outline">{rolloverData.consolidado.Nome}</Badge>
            <span className="font-medium">{rolloverData.competenciaOrigem}</span>
            <ArrowRight className="h-4 w-4" />
            <span className="font-medium text-primary">{rolloverData.novaCompetencia}</span>
          </div>

          {isMulti && (
            <>
              {/* Bulk apply */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Aplicar a todos:</span>
                {renderModeSelect(bulkMode, setBulkMode)}
                {renderParameterInput(bulkMode, bulkParametro, setBulkParametro)}
                <Button size="sm" variant="secondary" onClick={handleApplyAll}>
                  Aplicar
                </Button>
              </div>

              {/* Multi-asset table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Ativo</TableHead>
                      <TableHead className="text-xs text-right">Posição Atual</TableHead>
                      <TableHead className="text-xs">Cálculo</TableHead>
                      <TableHead className="text-xs">Param.</TableHead>
                      <TableHead className="text-xs text-right">Nova Posição</TableHead>
                      <TableHead className="text-xs text-right">Rend. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rolloverData.ativos.map((a, i) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs font-medium max-w-[180px] truncate" title={a.Ativo}>
                          {a.Ativo}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {(a.Posicao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {renderModeSelect(a.modo, (v) => handleUpdateAtivo(i, 'modo', v), 'sm')}
                        </TableCell>
                        <TableCell>
                          {renderParameterInput(a.modo, a.parametro, (v) => handleUpdateAtivo(i, 'parametro', v), 'sm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={a.novaPosicao}
                            onChange={(e) => handleUpdateAtivo(i, 'novaPosicao', e.target.value)}
                            className="h-8 text-xs w-[110px] ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell className={`text-xs text-right font-medium ${a.rendimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {a.rendimento.toFixed(4)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {!isMulti && rolloverData.ativos.length === 1 && (
            <>
              {/* Simple single-asset view */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Ativo</Label>
                  <p className="font-medium">{rolloverData.ativos[0].Ativo}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Posição atual</Label>
                  <p className="font-medium">
                    R$ {(rolloverData.ativos[0].Posicao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Cálculo de Rentabilidade</Label>
                  <div className="flex items-center gap-2">
                    {renderModeSelect(rolloverData.ativos[0].modo, (v) => handleUpdateAtivo(0, 'modo', v))}
                    {renderParameterInput(rolloverData.ativos[0].modo, rolloverData.ativos[0].parametro, (v) => handleUpdateAtivo(0, 'parametro', v))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nova posição</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rolloverData.ativos[0].novaPosicao}
                      onChange={(e) => handleUpdateAtivo(0, 'novaPosicao', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rendimento</Label>
                    <p className={`font-medium text-lg ${rolloverData.ativos[0].rendimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rolloverData.ativos[0].rendimento.toFixed(4)}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {rolloverData.ativos.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum ativo detalhado encontrado para este consolidado.
              <br />
              <span className="text-xs">O rollover criará apenas o consolidado.</span>
            </div>
          )}

          <Separator />

          {/* Summary */}
          <div className="bg-muted p-3 rounded-md">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Patrimônio Atual</p>
                <p className="font-medium">
                  R$ {totalPosicaoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Novo Patrimônio</p>
                <p className="font-medium text-primary">
                  R$ {totalNovaPosicao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rendimento Ponderado</p>
                <p className={`font-medium ${rendimentoPonderado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {rendimentoPonderado.toFixed(4)}%
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleExecuteRollover} disabled={saving}>
              <FastForward className="mr-2 h-4 w-4" />
              {saving ? 'Criando...' : 'Avançar e Criar Tudo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
