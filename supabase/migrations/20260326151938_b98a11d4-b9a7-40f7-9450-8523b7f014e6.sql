CREATE POLICY "Allow authenticated users to read RAG_Processador"
  ON public."RAG_Processador" FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert RAG_Processador"
  ON public."RAG_Processador" FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update RAG_Processador"
  ON public."RAG_Processador" FOR UPDATE
  TO authenticated USING (true);