ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS descricao text, ADD COLUMN IF NOT EXISTS local text, ADD COLUMN IF NOT EXISTS imagem_path text;

CREATE TABLE public.evento_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'inscrito',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, aluno_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_inscricoes TO authenticated;
GRANT ALL ON public.evento_inscricoes TO service_role;
ALTER TABLE public.evento_inscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY insc_le ON public.evento_inscricoes FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY insc_aluno_cria ON public.evento_inscricoes FOR INSERT TO authenticated
  WITH CHECK (aluno_id = auth.uid() AND status = 'inscrito');
CREATE POLICY insc_aluno_sai ON public.evento_inscricoes FOR DELETE TO authenticated
  USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY insc_prof_edita ON public.evento_inscricoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.biblioteca ADD COLUMN IF NOT EXISTS categoria text, ADD COLUMN IF NOT EXISTS turma_id uuid, ADD COLUMN IF NOT EXISTS arquivo_path text, ADD COLUMN IF NOT EXISTS arquivo_nome text;
ALTER TABLE public.biblioteca ALTER COLUMN url DROP NOT NULL;
DROP POLICY IF EXISTS biblioteca_cria ON public.biblioteca;
DROP POLICY IF EXISTS biblioteca_edita ON public.biblioteca;
DROP POLICY IF EXISTS biblioteca_apaga ON public.biblioteca;
CREATE POLICY biblioteca_cria ON public.biblioteca FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND public.has_role(auth.uid(),'professor'));
CREATE POLICY biblioteca_edita ON public.biblioteca FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));
CREATE POLICY biblioteca_apaga ON public.biblioteca FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'professor'));

CREATE TABLE public.loja_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text,
  imagem_path text,
  preco integer NOT NULL CHECK (preco >= 0),
  estoque integer NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loja_produtos TO authenticated;
GRANT ALL ON public.loja_produtos TO service_role;
ALTER TABLE public.loja_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY loja_le ON public.loja_produtos FOR SELECT TO authenticated
  USING (ativo OR public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY loja_gerencia ON public.loja_produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.loja_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  produto_id uuid REFERENCES public.loja_produtos(id) ON DELETE SET NULL,
  produto_nome text NOT NULL,
  preco_unitario integer NOT NULL,
  quantidade integer NOT NULL,
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'resgatado',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loja_compras TO authenticated;
GRANT ALL ON public.loja_compras TO service_role;
ALTER TABLE public.loja_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY compras_le ON public.loja_compras FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR public.has_role(auth.uid(),'professor') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.comprar_produto(_produto_id uuid, _quantidade integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.loja_produtos; saldo integer; v_total integer; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para comprar.'; END IF;
  IF _quantidade IS NULL OR _quantidade < 1 OR _quantidade > 50 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
  SELECT * INTO p FROM public.loja_produtos WHERE id = _produto_id FOR UPDATE;
  IF NOT FOUND OR NOT p.ativo THEN RAISE EXCEPTION 'Produto indisponível.'; END IF;
  IF p.estoque < _quantidade THEN RAISE EXCEPTION 'Estoque insuficiente.'; END IF;
  v_total := p.preco * _quantidade;
  SELECT cash_atual INTO saldo FROM public.perfil_gamificacao WHERE aluno_id = auth.uid() FOR UPDATE;
  IF saldo IS NULL OR saldo < v_total THEN RAISE EXCEPTION 'Saldo de CASH insuficiente.'; END IF;
  UPDATE public.perfil_gamificacao SET cash_atual = cash_atual - v_total WHERE aluno_id = auth.uid();
  UPDATE public.loja_produtos SET estoque = estoque - _quantidade WHERE id = p.id;
  INSERT INTO public.loja_compras (aluno_id, produto_id, produto_nome, preco_unitario, quantidade, total)
    VALUES (auth.uid(), p.id, p.nome, p.preco, _quantidade, v_total) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.comprar_produto(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comprar_produto(uuid, integer) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.loja_produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evento_inscricoes;