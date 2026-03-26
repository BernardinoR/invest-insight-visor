

# Plano: Corrigir RLS da tabela RAG_Processador

## Problema
A tabela `RAG_Processador` tem RLS habilitado mas **nenhuma policy definida**, bloqueando todas as operações (INSERT, UPDATE, SELECT, DELETE).

## Solução
Criar uma migration adicionando policies para permitir operações na tabela `RAG_Processador` para usuários autenticados:

```sql
CREATE POLICY "Allow authenticated users to read RAG_Processador"
  ON public."RAG_Processador" FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert RAG_Processador"
  ON public."RAG_Processador" FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update RAG_Processador"
  ON public."RAG_Processador" FOR UPDATE
  TO authenticated USING (true);
```

Alteração única: uma migration SQL. Nenhuma mudança no código TypeScript.

