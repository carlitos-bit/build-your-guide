-- A revisão pela tela de professor já aceita administradores; a política de escrita precisa acompanhar
DROP POLICY IF EXISTS correcoes_professor_edita ON public.correcoes;
CREATE POLICY correcoes_professor_edita ON public.correcoes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'professor'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );