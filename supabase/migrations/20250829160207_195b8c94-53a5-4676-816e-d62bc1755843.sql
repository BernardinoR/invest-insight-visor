-- Create policies for ConsolidadoPerformance to allow INSERT, UPDATE, DELETE  
CREATE POLICY "Allow all operations on ConsolidadoPerformance" 
ON public."ConsolidadoPerformance" 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for DadosPerformance to allow INSERT, UPDATE, DELETE
CREATE POLICY "Allow all operations on DadosPerformance" 
ON public."DadosPerformance" 
FOR ALL 
USING (true)
WITH CHECK (true);