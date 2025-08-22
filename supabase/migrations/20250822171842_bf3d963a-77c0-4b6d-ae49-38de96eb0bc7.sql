-- Enable RLS and create policies for ConsolidadoPerformance table
ALTER TABLE public."ConsolidadoPerformance" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ConsolidadoPerformance" 
ON public."ConsolidadoPerformance" 
FOR SELECT 
USING (true);

-- Enable RLS and create policies for DadosPerformance table  
ALTER TABLE public."DadosPerformance" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to DadosPerformance" 
ON public."DadosPerformance" 
FOR SELECT 
USING (true);