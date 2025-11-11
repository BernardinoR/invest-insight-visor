import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, XCircle, FileCheck, Info } from 'lucide-react';

export const useExtratoNotifications = (clientName?: string) => {
  useEffect(() => {
    const channel = supabase
      .channel('extrato-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'extrato_status_log'
        },
        (payload) => {
          const newLog = payload.new as any;
          
          // Filtrar por cliente se especificado
          if (clientName && newLog.cliente !== clientName) {
            return;
          }

          // Determinar configuração baseado no status
          const getStatusConfig = (status: string) => {
            switch (status) {
              case 'recebido':
                return { 
                  icon: FileCheck, 
                  title: 'Novo extrato recebido',
                  variant: 'default' as const
                };
              case 'processando':
                return { 
                  icon: Info, 
                  title: 'Extrato em processamento',
                  variant: 'default' as const
                };
              case 'sucesso':
                return { 
                  icon: CheckCircle2, 
                  title: 'Extrato processado com sucesso',
                  variant: 'default' as const
                };
              case 'erro':
                return { 
                  icon: XCircle, 
                  title: 'Erro ao processar extrato',
                  variant: 'destructive' as const
                };
              case 'validacao_falhou':
                return { 
                  icon: AlertCircle, 
                  title: 'Validação do extrato falhou',
                  variant: 'destructive' as const
                };
              default:
                return { 
                  icon: FileCheck, 
                  title: 'Novo extrato',
                  variant: 'default' as const
                };
            }
          };

          const config = getStatusConfig(newLog.status);
          const Icon = config.icon;

          // Construir descrição
          const descriptionText = `${newLog.cliente}\n${newLog.instituicao} - ${newLog.competencia}${newLog.tipo_extrato ? `\n${newLog.tipo_extrato}` : ''}${newLog.mensagem ? `\n${newLog.mensagem}` : ''}`;

          // Exibir toast
          if (config.variant === 'destructive') {
            toast.error(config.title, {
              description: descriptionText,
              duration: 3000,
            });
          } else {
            toast(config.title, {
              description: descriptionText,
              duration: 3000,
            });
          }

          console.log('📥 Notificação de extrato recebida:', {
            cliente: newLog.cliente,
            instituicao: newLog.instituicao,
            competencia: newLog.competencia,
            status: newLog.status,
            tipo: newLog.tipo_extrato
          });
        }
      )
      .subscribe();

    console.log('🔔 Sistema de notificações de extratos ativado');

    return () => {
      supabase.removeChannel(channel);
      console.log('🔕 Sistema de notificações de extratos desativado');
    };
  }, [clientName]);
};
