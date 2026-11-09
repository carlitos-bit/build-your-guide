CREATE OR REPLACE FUNCTION public.professor_do_aluno(_aluno uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(auth.uid(), 'professor') AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.turmas t ON t.id = p.turma_id WHERE p.id = _aluno AND t.professor_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.professor_do_aluno(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_do_aluno(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.pode_revisar_redacao(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.redacoes r WHERE r.id = _id AND public.professor_do_aluno(r.aluno_id)); $$;
REVOKE ALL ON FUNCTION public.pode_revisar_redacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_revisar_redacao(uuid) TO authenticated, service_role;
DROP POLICY IF EXISTS redacoes_aluno_le ON public.redacoes;
CREATE POLICY redacoes_aluno_le ON public.redacoes FOR SELECT TO authenticated USING (aluno_id = auth.uid() OR public.professor_do_aluno(aluno_id));
DROP POLICY IF EXISTS redacoes_atualiza ON public.redacoes;
CREATE POLICY redacoes_atualiza ON public.redacoes FOR UPDATE TO authenticated USING (public.pode_revisar_redacao(id)) WITH CHECK (public.pode_revisar_redacao(id));
DROP POLICY IF EXISTS redacoes_apaga ON public.redacoes;
CREATE POLICY redacoes_apaga ON public.redacoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS correcoes_leitura ON public.correcoes;
CREATE POLICY correcoes_leitura ON public.correcoes FOR SELECT TO authenticated USING (public.pode_revisar_redacao(redacao_id) OR (liberada AND EXISTS (SELECT 1 FROM public.redacoes r WHERE r.id = redacao_id AND r.aluno_id = auth.uid())));
DROP POLICY IF EXISTS correcoes_professor_edita ON public.correcoes;
CREATE POLICY correcoes_professor_edita ON public.correcoes FOR UPDATE TO authenticated USING (public.pode_revisar_redacao(redacao_id)) WITH CHECK (public.pode_revisar_redacao(redacao_id));
DROP POLICY IF EXISTS correcoes_cria ON public.correcoes;
REVOKE INSERT ON public.correcoes FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_correcao_ia(uuid,integer,integer,integer,integer,integer,jsonb) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_correcao_ia(uuid,integer,integer,integer,integer,integer,jsonb) TO service_role;
DROP POLICY IF EXISTS perfis_visiveis_para_autenticados ON public.profiles;
CREATE POLICY perfis_visiveis_para_autenticados ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.professor_do_aluno(id) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS usuario_edita_proprio_perfil ON public.profiles;
CREATE POLICY usuario_edita_proprio_perfil ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE OR REPLACE FUNCTION public.proteger_vinculo_perfil() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND (NEW.perfil IS DISTINCT FROM OLD.perfil OR NEW.turma_id IS DISTINCT FROM OLD.turma_id OR NEW.id IS DISTINCT FROM OLD.id) THEN RAISE EXCEPTION 'Somente a administracao pode alterar o perfil ou a turma'; END IF; RETURN NEW; END $$;
CREATE TRIGGER proteger_vinculo_perfil BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.proteger_vinculo_perfil();
DROP POLICY IF EXISTS turmas_leitura ON public.turmas;
CREATE POLICY turmas_leitura ON public.turmas FOR SELECT TO authenticated USING (professor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.turma_id = turmas.id));
DROP POLICY IF EXISTS turmas_professor ON public.turmas;
CREATE POLICY turmas_professor ON public.turmas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'professor') AND professor_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'professor') AND professor_id = auth.uid());
DROP POLICY IF EXISTS gam_cria ON public.perfil_gamificacao;
DROP POLICY IF EXISTS gam_edita ON public.perfil_gamificacao;
REVOKE INSERT, UPDATE ON public.perfil_gamificacao FROM authenticated, anon;
DROP POLICY IF EXISTS gam_leitura ON public.perfil_gamificacao;
CREATE POLICY gam_leitura ON public.perfil_gamificacao FOR SELECT TO authenticated USING (aluno_id = auth.uid() OR public.professor_do_aluno(aluno_id));
DROP POLICY IF EXISTS trofeus_aluno_cria ON public.trofeus_aluno;
REVOKE INSERT ON public.trofeus_aluno FROM authenticated, anon;
DROP POLICY IF EXISTS trofeus_aluno_leitura ON public.trofeus_aluno;
CREATE POLICY trofeus_aluno_leitura ON public.trofeus_aluno FOR SELECT TO authenticated USING (aluno_id = auth.uid() OR public.professor_do_aluno(aluno_id) OR public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.correcoes ADD COLUMN recompensa_processada boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.correcoes.recompensa_processada IS 'Existing corrections retain previously awarded rewards; new corrections award once upon release.';
CREATE OR REPLACE FUNCTION public.recompensar_correcao_liberada() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_aluno uuid; v_tipo text; v_cash integer; v_xp integer; v_total integer; v_media numeric;
BEGIN
 IF TG_OP = 'INSERT' THEN NEW.recompensa_processada := false; END IF;
 IF NEW.liberada AND NOT NEW.recompensa_processada THEN
  SELECT aluno_id, tipo INTO v_aluno, v_tipo FROM public.redacoes WHERE id = NEW.redacao_id;
  v_cash := round(NEW.nota_total * 0.14); v_xp := round(NEW.nota_total * 0.3) + CASE WHEN v_tipo = 'cronometrada' THEN 50 ELSE 0 END;
  INSERT INTO public.perfil_gamificacao (aluno_id, cash_atual, xp_atual, nivel) VALUES (v_aluno, v_cash, v_xp, greatest(1, v_xp / 500 + 1))
  ON CONFLICT (aluno_id) DO UPDATE SET cash_atual = perfil_gamificacao.cash_atual + EXCLUDED.cash_atual, xp_atual = perfil_gamificacao.xp_atual + EXCLUDED.xp_atual, nivel = greatest(1, (perfil_gamificacao.xp_atual + EXCLUDED.xp_atual) / 500 + 1);
  SELECT count(*), avg(nota_total) INTO v_total, v_media FROM public.correcoes c JOIN public.redacoes r ON r.id = c.redacao_id WHERE r.aluno_id = v_aluno AND c.liberada AND c.id <> NEW.id;
  INSERT INTO public.trofeus_aluno (aluno_id, trofeu_codigo)
  SELECT v_aluno, codigo FROM public.trofeus WHERE (codigo = 'primeira_redacao') OR (codigo = 'nota_900' AND NEW.nota_total >= 900) OR (codigo = 'argumentador_elite' AND NEW.nota_total >= 800 AND NEW.nota_c3 >= 160) OR (codigo = 'persistencia' AND v_total + 1 >= 10) OR (codigo = 'mestre_escrita' AND v_total + 1 >= 3 AND (coalesce(v_media,0)*v_total + NEW.nota_total)/(v_total+1) > 850)
  ON CONFLICT DO NOTHING;
  NEW.recompensa_processada := true;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER recompensar_correcao_liberada BEFORE INSERT OR UPDATE ON public.correcoes FOR EACH ROW EXECUTE FUNCTION public.recompensar_correcao_liberada();
GRANT ALL ON public.perfil_gamificacao, public.trofeus_aluno, public.correcoes TO service_role;