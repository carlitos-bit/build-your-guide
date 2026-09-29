CREATE TABLE public.configuracoes (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.configuracoes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY config_leitura ON public.configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY config_admin ON public.configuracoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.configuracoes (chave, valor) VALUES
 ('biblioteca', '{"alunos_podem_publicar": true, "tipos_permitidos": ["video","slide","artigo"], "moderacao_previa": false}');

CREATE POLICY admin_biblioteca ON public.biblioteca FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_temas ON public.temas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_eventos ON public.eventos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_turmas ON public.turmas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_redacoes_le ON public.redacoes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_correcoes_le ON public.correcoes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_gam_le ON public.perfil_gamificacao FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_roles_le ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_perfis_edita ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_definir_papel(_user_id uuid, _papel public.app_role, _ativo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  IF _papel = 'admin' AND NOT _ativo AND _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio acesso de admin';
  END IF;
  IF _ativo THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _papel) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _papel;
  END IF;
  IF _papel IN ('aluno','professor') AND _ativo THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('aluno','professor') AND role <> _papel;
    UPDATE public.profiles SET perfil = _papel::text WHERE id = _user_id;
    IF _papel = 'aluno' THEN
      INSERT INTO public.perfil_gamificacao (aluno_id) VALUES (_user_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_definir_papel(uuid, public.app_role, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_definir_papel(uuid, public.app_role, boolean) TO authenticated;