
Objetivo: eliminar o erro persistente ao clicar em **“Gravar Classificação”** no modal de edição.

Diagnóstico (confirmado)
- O request para `RAG_Processador` está retornando **401 Unauthorized**.
- A tabela `RAG_Processador` hoje permite `SELECT/INSERT/UPDATE` apenas para role **authenticated**.
- O app atual **não tem fluxo de login ativo** (não há `signIn/getSession` no front), então as operações estão sendo feitas como **anon**.
- Resultado: RLS bloqueia a gravação, mesmo com policy criada.

Plano de correção

1) Ajustar RLS da `RAG_Processador` para o modelo real do app (sem login)
- Criar uma nova migration SQL que:
  - Remove as 3 policies atuais restritas a `authenticated`.
  - Cria policies equivalentes para `public` (ou explicitamente `anon` + `authenticated`) para:
    - `SELECT USING (true)`
    - `INSERT WITH CHECK (true)`
    - `UPDATE USING (true) WITH CHECK (true)`

SQL proposto (migration)
```sql
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
```

2) Melhorar UX de erro no front (DataManagement)
- No `catch` do `handleSaveClassificacao`, mapear erro de auth/RLS (401) para mensagem amigável:
  - “Sem permissão para gravar classificação. Política de acesso da tabela bloqueou a operação.”
- Mantém o toast técnico no console para debug, mas exibe feedback claro ao usuário.

3) Validação pós-correção (end-to-end)
- Abrir modal de edição de ativo e clicar “Gravar Classificação”:
  - Caso novo ativo: deve inserir em `RAG_Processador`.
  - Caso classe igual: deve informar “já gravada”.
  - Caso classe diferente: deve abrir diálogo de conflito e permitir atualização.
- Repetir sem recarregar e após recarregar a página para confirmar persistência.
- Confirmar no Supabase que os registros foram criados/atualizados.

Observação técnica
- Se no futuro vocês quiserem manter `RAG_Processador` protegido (somente usuários logados), aí o caminho correto será implementar autenticação no app e voltar as policies para `authenticated`.
