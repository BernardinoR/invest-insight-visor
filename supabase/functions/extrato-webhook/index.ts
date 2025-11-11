import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STATUSES = [
  'Extrato Recebido',
  'Processado',
  'Ajustado',
  'Classificado',
  'Enviado',
  'Erro'
] as const;

const VALID_TIPOS = ['Consolidado', 'Ativos'] as const;

type ValidStatus = typeof VALID_STATUSES[number];
type ValidTipo = typeof VALID_TIPOS[number];

interface WebhookPayload {
  cliente: string;
  instituicao: string;
  competencia: string;
  tipo_extrato: ValidTipo;
  status: ValidStatus;
  mensagem?: string;
  detalhes?: Record<string, any>;
  sistema_origem?: string;
  submission_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        error: 'Método não permitido',
        mensagem: 'Use POST para enviar status de extrato' 
      }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    
    console.log('📥 Webhook recebido:', {
      cliente: payload.cliente,
      tipo_extrato: payload.tipo_extrato,
      status: payload.status,
      timestamp: new Date().toISOString()
    });

    // Validação dos campos obrigatórios
    if (!payload.cliente || !payload.instituicao || !payload.competencia || !payload.tipo_extrato || !payload.status) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios ausentes',
          campos_obrigatorios: ['cliente', 'instituicao', 'competencia', 'tipo_extrato', 'status'],
          recebido: payload
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validação do status
    if (!VALID_STATUSES.includes(payload.status as ValidStatus)) {
      return new Response(
        JSON.stringify({ 
          error: 'Status inválido',
          status_validos: VALID_STATUSES,
          recebido: payload.status
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validação do tipo_extrato
    if (!VALID_TIPOS.includes(payload.tipo_extrato as ValidTipo)) {
      return new Response(
        JSON.stringify({ 
          error: 'Tipo de extrato inválido',
          tipos_validos: VALID_TIPOS,
          recebido: payload.tipo_extrato
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const ipOrigem = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Inserir log de status
    const { data: logData, error: logError } = await supabase
      .from('extrato_status_log')
      .insert({
        submission_id: payload.submission_id || null,
        cliente: payload.cliente,
        instituicao: payload.instituicao,
        competencia: payload.competencia,
        tipo_extrato: payload.tipo_extrato,
        status: payload.status,
        mensagem: payload.mensagem || null,
        detalhes: payload.detalhes || null,
        sistema_origem: payload.sistema_origem || 'unknown',
        webhook_timestamp: new Date().toISOString(),
        ip_origem: ipOrigem
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Erro ao inserir log:', logError);
      throw logError;
    }

    console.log('✅ Log inserido:', logData.id);

    // Se tiver submission_id, atualizar último status
    if (payload.submission_id) {
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          ultimo_status: payload.status,
          ultimo_status_at: new Date().toISOString(),
          status: payload.status === 'Erro' ? 'error' : 
                  payload.status === 'Enviado' ? 'completed' : 
                  'processing'
        })
        .eq('id', payload.submission_id);

      if (updateError) {
        console.error('⚠️ Erro ao atualizar submission:', updateError);
      } else {
        console.log('✅ Submission atualizado:', payload.submission_id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        mensagem: 'Status recebido e processado com sucesso',
        log_id: logData.id,
        status: payload.status,
        tipo_extrato: payload.tipo_extrato,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Erro no webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        mensagem: error.message,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
