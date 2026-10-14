-- Correção da IA passa a ser ESTIMATIVA (não oficial) até a revisão do professor.
--
-- Corrige a causa raiz: a IA gravava `liberada = true` na hora, então a nota
-- estimada já aparecia como resultado OFICIAL e o estado "Em revisão" nunca
-- acontecia. Agora só o professor (ou admin) torna a nota oficial.
--
-- Também fecha a criação de correção direto pelo cliente (evitava notas forjadas)
-- e passa a registrar a correção da IA por uma função controlada.

-- 1) Nota da IA nasce como NÃO liberada; guarda a data da revisão.
ALTER TABLE public.correcoes ALTER COLUMN liberada SET DEFAULT false;
ALTER TABLE public.correcoes ADD COLUMN IF NOT EXISTS revisada_em timestamptz;

-- 2) Aluno lê a própria correção mesmo antes de liberada (vê a estimativa da IA);
--    professor e admin continuam lendo todas. A separação por usuário é mantida.
DROP POLICY IF EXISTS correcoes_leitura ON public.correcoes;
CREATE POLICY correcoes_leitura ON public.correcoes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'professor')
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.redacoes r
    WHERE r.id = correcoes.redacao_id AND r.aluno_id = auth.uid()
  )
);

-- 3) Somente professor/admin podem inserir correção diretamente.
DROP POLICY IF EXISTS correcoes_cria ON public.correcoes;
CREATE POLICY correcoes_cria ON public.correcoes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin')
);

-- 4) Função controlada (SECURITY DEFINER) que registra a correção da IA apenas
--    para a PRÓPRIA redação do usuário, sempre como NÃO liberada.
CREATE OR REPLACE FUNCTION public.registrar_correcao_ia(
  _redacao_id uuid,
  _c1 integer, _c2 integer, _c3 integer, _c4 integer, _c5 integer,
  _feedback jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.redacoes WHERE id = _redacao_id AND aluno_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Redação não pertence ao usuário autenticado';
  END IF;

  INSERT INTO public.correcoes
    (redacao_id, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, nota_total, feedback_ia, liberada)
  VALUES
    (_redacao_id, _c1, _c2, _c3, _c4, _c5, _c1 + _c2 + _c3 + _c4 + _c5,
     COALESCE(_feedback, '{}'::jsonb), false)
  ON CONFLICT (redacao_id) DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.registrar_correcao_ia(uuid,integer,integer,integer,integer,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_correcao_ia(uuid,integer,integer,integer,integer,integer,jsonb) TO authenticated;

-- 5) Professor/admin editam e liberam a nota oficial.
DROP POLICY IF EXISTS correcoes_professor_edita ON public.correcoes;
CREATE POLICY correcoes_professor_edita ON public.correcoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'));
