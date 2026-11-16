DROP POLICY IF EXISTS config_leitura ON public.configuracoes;
CREATE POLICY config_leitura ON public.configuracoes FOR SELECT TO authenticated USING (chave = 'biblioteca');