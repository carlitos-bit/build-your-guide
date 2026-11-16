CREATE OR REPLACE FUNCTION public.proteger_vinculo_perfil()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND coalesce(current_setting('app.vinculo_professor', true),'') <> 'on' AND (NEW.perfil IS DISTINCT FROM OLD.perfil OR NEW.turma_id IS DISTINCT FROM OLD.turma_id OR NEW.id IS DISTINCT FROM OLD.id) THEN RAISE EXCEPTION 'Somente a administracao pode alterar o perfil ou a turma'; END IF; RETURN NEW; END $function$;

CREATE OR REPLACE FUNCTION public.professor_vincular_aluno(_email text, _turma_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _aluno public.profiles%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = _turma_id AND (t.professor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))) THEN
    RAISE EXCEPTION 'Turma não encontrada ou não pertence a você';
  END IF;
  SELECT * INTO _aluno FROM public.profiles WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum aluno cadastrado com esse e-mail'; END IF;
  IF public.has_role(_aluno.id,'professor') OR public.has_role(_aluno.id,'admin') THEN
    RAISE EXCEPTION 'Essa conta não é de aluno';
  END IF;
  IF _aluno.turma_id IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND NOT EXISTS (
    SELECT 1 FROM public.turmas t WHERE t.id = _aluno.turma_id AND t.professor_id = auth.uid()) THEN
    RAISE EXCEPTION 'Esse aluno já está em uma turma de outro professor';
  END IF;
  PERFORM set_config('app.vinculo_professor','on',true);
  UPDATE public.profiles SET turma_id = _turma_id WHERE id = _aluno.id;
  PERFORM set_config('app.vinculo_professor','off',true);
  RETURN _aluno.nome;
END $$;

CREATE OR REPLACE FUNCTION public.professor_remover_aluno(_aluno_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.professor_do_aluno(_aluno_id) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Aluno não pertence às suas turmas';
  END IF;
  PERFORM set_config('app.vinculo_professor','on',true);
  UPDATE public.profiles SET turma_id = NULL WHERE id = _aluno_id;
  PERFORM set_config('app.vinculo_professor','off',true);
END $$;

REVOKE ALL ON FUNCTION public.professor_vincular_aluno(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.professor_remover_aluno(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_vincular_aluno(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.professor_remover_aluno(uuid) TO authenticated;