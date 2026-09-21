CREATE TYPE public.app_role AS ENUM ('aluno','professor');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  perfil TEXT NOT NULL DEFAULT 'aluno',
  turma_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "perfis_visiveis_para_autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuario_cria_proprio_perfil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "usuario_edita_proprio_perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'professor'));

CREATE POLICY "ve_proprios_papeis" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'professor'));

CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  professor_id UUID,
  escola TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turmas_leitura" ON public.turmas FOR SELECT TO authenticated USING (true);
CREATE POLICY "turmas_professor" ON public.turmas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));

CREATE TABLE public.temas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  area TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temas TO authenticated;
GRANT ALL ON public.temas TO service_role;
ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temas_leitura" ON public.temas FOR SELECT TO authenticated USING (true);
CREATE POLICY "temas_professor" ON public.temas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));

CREATE TABLE public.redacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tema_id UUID REFERENCES public.temas(id) ON DELETE SET NULL,
  tema_titulo TEXT NOT NULL DEFAULT '',
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'livre',
  tempo_gasto_seg INTEGER,
  status TEXT NOT NULL DEFAULT 'corrigida',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redacoes TO authenticated;
GRANT ALL ON public.redacoes TO service_role;
ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redacoes_aluno_le" ON public.redacoes FOR SELECT TO authenticated USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "redacoes_aluno_cria" ON public.redacoes FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "redacoes_atualiza" ON public.redacoes FOR UPDATE TO authenticated USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "redacoes_apaga" ON public.redacoes FOR DELETE TO authenticated USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor'));

CREATE TABLE public.correcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redacao_id UUID NOT NULL UNIQUE REFERENCES public.redacoes(id) ON DELETE CASCADE,
  nota_c1 INTEGER NOT NULL DEFAULT 0,
  nota_c2 INTEGER NOT NULL DEFAULT 0,
  nota_c3 INTEGER NOT NULL DEFAULT 0,
  nota_c4 INTEGER NOT NULL DEFAULT 0,
  nota_c5 INTEGER NOT NULL DEFAULT 0,
  nota_total INTEGER NOT NULL DEFAULT 0,
  feedback_ia JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback_professor TEXT,
  revisada_por UUID,
  liberada BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.correcoes TO authenticated;
GRANT ALL ON public.correcoes TO service_role;
ALTER TABLE public.correcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "correcoes_leitura" ON public.correcoes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'professor')
  OR (liberada AND EXISTS (SELECT 1 FROM public.redacoes r WHERE r.id = redacao_id AND r.aluno_id = auth.uid()))
);
CREATE POLICY "correcoes_cria" ON public.correcoes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'professor')
  OR EXISTS (SELECT 1 FROM public.redacoes r WHERE r.id = redacao_id AND r.aluno_id = auth.uid())
);
CREATE POLICY "correcoes_professor_edita" ON public.correcoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'professor'));

CREATE TABLE public.perfil_gamificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL DEFAULT 1,
  xp_atual INTEGER NOT NULL DEFAULT 0,
  cash_atual INTEGER NOT NULL DEFAULT 0,
  sequencia_quinzenas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfil_gamificacao TO authenticated;
GRANT ALL ON public.perfil_gamificacao TO service_role;
ALTER TABLE public.perfil_gamificacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gam_leitura" ON public.perfil_gamificacao FOR SELECT TO authenticated USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "gam_cria" ON public.perfil_gamificacao FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "gam_edita" ON public.perfil_gamificacao FOR UPDATE TO authenticated USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor'));

CREATE TABLE public.trofeus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'trophy'
);
GRANT SELECT ON public.trofeus TO authenticated;
GRANT ALL ON public.trofeus TO service_role;
ALTER TABLE public.trofeus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trofeus_leitura" ON public.trofeus FOR SELECT TO authenticated USING (true);

CREATE TABLE public.trofeus_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trofeu_codigo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, trofeu_codigo)
);
GRANT SELECT, INSERT ON public.trofeus_aluno TO authenticated;
GRANT ALL ON public.trofeus_aluno TO service_role;
ALTER TABLE public.trofeus_aluno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trofeus_aluno_leitura" ON public.trofeus_aluno FOR SELECT TO authenticated USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "trofeus_aluno_cria" ON public.trofeus_aluno FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid());

CREATE TABLE public.biblioteca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'video',
  url TEXT NOT NULL,
  tema TEXT,
  autor_id UUID,
  autor_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca TO authenticated;
GRANT ALL ON public.biblioteca TO service_role;
ALTER TABLE public.biblioteca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biblioteca_leitura" ON public.biblioteca FOR SELECT TO authenticated USING (true);
CREATE POLICY "biblioteca_cria" ON public.biblioteca FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());
CREATE POLICY "biblioteca_edita" ON public.biblioteca FOR UPDATE TO authenticated USING (autor_id = auth.uid() OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "biblioteca_apaga" ON public.biblioteca FOR DELETE TO authenticated USING (autor_id = auth.uid() OR public.has_role(auth.uid(),'professor'));

CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tema_titulo TEXT NOT NULL,
  inicia_em TIMESTAMPTZ NOT NULL,
  duracao_min INTEGER NOT NULL DEFAULT 90,
  bonus_cash INTEGER NOT NULL DEFAULT 200,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos_leitura" ON public.eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "eventos_professor" ON public.eventos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_perfil TEXT;
BEGIN
  v_perfil := COALESCE(NEW.raw_user_meta_data->>'perfil', 'aluno');
  INSERT INTO public.profiles (id, nome, email, perfil)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email, v_perfil)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (CASE WHEN v_perfil = 'professor' THEN 'professor' ELSE 'aluno' END)::public.app_role)
  ON CONFLICT DO NOTHING;
  IF v_perfil <> 'professor' THEN
    INSERT INTO public.perfil_gamificacao (aluno_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.trofeus (codigo, nome, descricao) VALUES
  ('primeira_redacao','Primeira Redação','Enviou sua primeira redação na plataforma.'),
  ('nota_900','Nota 900+','Alcançou 900 pontos ou mais em uma redação.'),
  ('argumentador_elite','Argumentador de Elite','Tirou 800+ com competência 3 acima de 160.'),
  ('persistencia','Persistência','Enviou 10 redações na plataforma.'),
  ('evolucao','Evolução','Aumentou significativamente sua média.'),
  ('mestre_escrita','Mestre da Escrita','Atingiu média geral acima de 850.');

INSERT INTO public.temas (titulo, descricao, area) VALUES
  ('Os desafios do combate à desinformação no Brasil','Discuta como as redes sociais impactam a circulação de notícias falsas e proponha intervenções.','Tecnologia e sociedade'),
  ('Caminhos para ampliar o acesso à saúde mental no Brasil','Reflita sobre barreiras de acesso ao cuidado psicológico e apresente propostas.','Saúde'),
  ('A valorização do trabalho do professor na sociedade brasileira','Analise causas da desvalorização docente e proponha soluções.','Educação'),
  ('Sustentabilidade e consumo consciente nas grandes cidades','Aborde o impacto ambiental do consumo urbano e proponha intervenções.','Meio ambiente'),
  ('Os limites da inteligência artificial na educação','Discuta benefícios e riscos do uso de IA em sala de aula.','Tecnologia e educação');

INSERT INTO public.biblioteca (titulo, descricao, tipo, url, tema, autor_nome) VALUES
  ('As 5 competências do ENEM explicadas','Aula introdutória sobre como a banca avalia cada competência.','video','https://www.youtube.com/watch?v=ZDg3wUXZLMI','Competências','Equipe EscreveAI'),
  ('Estrutura da introdução perfeita','Slides com modelos de introdução para dissertação-argumentativa.','slide','https://docs.google.com/presentation/d/1EscreveAI-introducao','Estrutura','Equipe EscreveAI'),
  ('Repertório sociocultural: como usar bem','Vídeo sobre citações, dados e referências que rendem pontos na C2.','video','https://www.youtube.com/watch?v=8m8T7Q8JQ0s','Repertório','Equipe EscreveAI'),
  ('Proposta de intervenção completa','Slides sobre agente, ação, meio, finalidade e detalhamento.','slide','https://docs.google.com/presentation/d/1EscreveAI-intervencao','Competência 5','Equipe EscreveAI');

INSERT INTO public.eventos (titulo, tema_titulo, inicia_em, duracao_min, bonus_cash) VALUES
  ('Simulado Quinzenal #1','Os desafios do combate à desinformação no Brasil', now() + interval '3 days', 90, 300),
  ('Maratona ENEM: Meio Ambiente','Sustentabilidade e consumo consciente nas grandes cidades', now() + interval '10 days', 90, 250);