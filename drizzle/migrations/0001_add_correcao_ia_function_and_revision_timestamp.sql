-- Data da revisão do professor na correção
ALTER TABLE public.correcoes
  ADD COLUMN IF NOT EXISTS revisada_em timestamptz;

COMMENT ON COLUMN public.correcoes.revisada_em IS 'Momento em que o professor revisou a correção; null = ainda não revisada';

-- Registra a correção da IA como ESTIMATIVA (liberada = false), somente para a redação do próprio aluno
CREATE OR REPLACE FUNCTION public.registrar_correcao_ia(
  _redacao_id uuid,
  _c1 integer,
  _c2 integer,
  _c3 integer,
  _c4 integer,
  _c5 integer,
  _feedback jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno uuid;
  v_id uuid;
BEGIN
  IF _c1 IS NULL OR _c2 IS NULL OR _c3 IS NULL OR _c4 IS NULL OR _c5 IS NULL THEN
    RAISE EXCEPTION 'Notas das 5 competencias sao obrigatorias';
  END IF;

  IF _c1 < 0 OR _c1 > 200 OR _c2 < 0 OR _c2 > 200 OR _c3 < 0 OR _c3 > 200
     OR _c4 < 0 OR _c4 > 200 OR _c5 < 0 OR _c5 > 200 THEN
    RAISE EXCEPTION 'Cada competencia deve receber nota entre 0 e 200';
  END IF;

  SELECT aluno_id INTO v_aluno FROM public.redacoes WHERE id = _redacao_id;

  IF v_aluno IS NULL THEN
    RAISE EXCEPTION 'Redacao nao encontrada';
  END IF;

  IF v_aluno <> auth.uid()
     AND NOT public.has_role(auth.uid(), 'professor'::app_role)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissao para registrar a correcao desta redacao';
  END IF;

  INSERT INTO public.correcoes (
    redacao_id, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, nota_total, feedback_ia, liberada
  ) VALUES (
    _redacao_id,
    _c1,
    _c2,
    _c3,
    _c4,
    _c5,
    _c1 + _c2 + _c3 + _c4 + _c5,
    coalesce(_feedback, '{}'::jsonb),
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_correcao_ia(uuid, integer, integer, integer, integer, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_correcao_ia(uuid, integer, integer, integer, integer, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_correcao_ia(uuid, integer, integer, integer, integer, integer, jsonb) TO service_role;

-- Correção passa a entrar só pela função acima ou por quem revisa: o aluno não insere nota direto
DROP POLICY IF EXISTS correcoes_cria ON public.correcoes;
CREATE POLICY correcoes_cria ON public.correcoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'professor'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );