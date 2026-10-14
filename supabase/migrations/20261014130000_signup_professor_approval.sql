-- Blindagem do cadastro público (escalonamento de privilégio).
--
-- Antes: public.handle_new_user() confiava em raw_user_meta_data->>'perfil' e
-- concedia o papel 'professor' já no cadastro. Como esse metadado vem do cliente
-- (options.data do signUp), qualquer pessoa podia se cadastrar como professor e
-- ganhar acesso a turmas, redações de alunos e recursos de professor.
--
-- Agora: todo cadastro público entra como 'aluno'. Quem escolhe "professor" fica
-- registrado apenas como 'professor_pendente' (rótulo de exibição, SEM privilégios)
-- e a promoção passa a ser feita pela coordenação via admin_definir_papel().

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_perfil_solicitado TEXT;
BEGIN
  v_perfil_solicitado := COALESCE(NEW.raw_user_meta_data->>'perfil', 'aluno');

  INSERT INTO public.profiles (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN v_perfil_solicitado = 'professor' THEN 'professor_pendente' ELSE 'aluno' END
  )
  ON CONFLICT (id) DO NOTHING;

  -- O papel é SEMPRE 'aluno' no cadastro público; nunca 'professor'.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'aluno')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.perfil_gamificacao (aluno_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
