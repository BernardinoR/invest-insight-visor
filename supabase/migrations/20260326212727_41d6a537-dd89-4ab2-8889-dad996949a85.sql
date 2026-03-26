DROP POLICY IF EXISTS "Allow authenticated users to read RAG_Processador" ON public."RAG_Processador";
DROP POLICY IF EXISTS "Allow authenticated users to insert RAG_Processador" ON public."RAG_Processador";
DROP POLICY IF EXISTS "Allow authenticated users to update RAG_Processador" ON public."RAG_Processador";

CREATE POLICY "Allow public read RAG_Processador"
  ON public."RAG_Processador"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert RAG_Processador"
  ON public."RAG_Processador"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update RAG_Processador"
  ON public."RAG_Processador"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);