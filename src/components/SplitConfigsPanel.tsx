import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Scissors, Play, Edit, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SplitConfig {
  id: string;
  cliente: string;
  instituicao: string;
  nome_conta_origem: string;
  nome_conta_destino: string;
  percentual_padrao: number;
  ativos_especificos: Array<{ ativo: string; percentual: number }>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface SplitConfigsPanelProps {
  clientName: string;
  consolidadoData: any[];
  dadosData: any[];
  onApplyConfig: (consolidado: any, configId: string) => void;
  refreshKey?: number;
}

export function SplitConfigsPanel({
  clientName,
  consolidadoData,
  dadosData,
  onApplyConfig,
  refreshKey,
}: SplitConfigsPanelProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<SplitConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    if (!clientName) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_split_configs')
        .select('*')
        .eq('cliente', clientName)
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [clientName, refreshKey]);

  const handleDelete = async () => {
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

  const handleApply = (config: SplitConfig) => {
    // Find matching consolidado for the current data
    const match = consolidadoData.find(
      (c) =>
        c.Instituicao === config.instituicao &&
        (c.nomeConta || '') === config.nome_conta_origem
    );

    if (!match) {
      toast({
        title: 'Consolidado não encontrado',
        description: `Não há consolidado para ${config.instituicao} / ${config.nome_conta_origem || '(sem conta)'} na competência atual.`,
        variant: 'destructive',
      });
      return;
    }

    onApplyConfig(match, config.id);
  };

  if (configs.length === 0 && !loading) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-dashed border-violet-300 dark:border-violet-700">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-violet-600" />
                  Configurações de Split Salvas
                  <Badge variant="secondary" className="ml-1">{configs.length}</Badge>
                </CardTitle>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
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
                          className="h-7 px-2 text-primary"
                          onClick={() => handleApply(config)}
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
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
