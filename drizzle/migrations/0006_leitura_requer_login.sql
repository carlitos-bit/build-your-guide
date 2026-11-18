ALTER POLICY temas_leitura ON public.temas USING (auth.uid() IS NOT NULL);
ALTER POLICY eventos_leitura ON public.eventos USING (auth.uid() IS NOT NULL);
ALTER POLICY biblioteca_leitura ON public.biblioteca USING (auth.uid() IS NOT NULL);
ALTER POLICY trofeus_leitura ON public.trofeus USING (auth.uid() IS NOT NULL);