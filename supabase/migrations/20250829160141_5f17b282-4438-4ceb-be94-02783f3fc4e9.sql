-- Enable RLS on tables that don't have it yet
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.RAG_Processador ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.keepalive ENABLE ROW LEVEL SECURITY;

-- Create policies for ConsolidadoPerformance to allow INSERT, UPDATE, DELETE
CREATE POLICY "Allow all operations on ConsolidadoPerformance" 
ON public.ConsolidadoPerformance 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for DadosPerformance to allow INSERT, UPDATE, DELETE
CREATE POLICY "Allow all operations on DadosPerformance" 
ON public.DadosPerformance 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for other tables without policies
CREATE POLICY "Allow all operations on usuarios" 
ON public.usuarios 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on RAG_Processador" 
ON public.RAG_Processador 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on keepalive" 
ON public.keepalive 
FOR ALL 
USING (true)
WITH CHECK (true);