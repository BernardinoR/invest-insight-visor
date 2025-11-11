-- Adicionar política RLS para permitir apenas admins deletarem registros de extrato_status_log
CREATE POLICY "Admins can delete extrato logs"
ON public.extrato_status_log
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));