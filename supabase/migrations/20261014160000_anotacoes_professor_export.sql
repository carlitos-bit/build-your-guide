-- Anotações do professor sobre trechos específicos da redação
-- Cada anotação pode ser: destaque (highlight) ou nota de rodapé (footnote)

create table if not exists public.anotacoes_correcao (
  id uuid primary key default gen_random_uuid(),
  correcao_id uuid not null references public.correcoes(id) on delete cascade,
  professor_id uuid not null references auth.users(id),
  -- Posição no texto original (offset de caracteres)
  inicio int not null,
  fim int not null,
  -- Texto selecionado (para verificação rápida)
  trecho_selecionado text not null,
  -- Tipo: 'highlight' (marcador colorido) ou 'footnote' (nota de rodapé com comentário)
  tipo text not null check (tipo in ('highlight','footnote')),
  -- Cor do destaque (para highlights): 'amarelo' | 'verde' | 'azul' | 'rosa' | 'laranja'
  cor text check (cor in ('amarelo','verde','azul','rosa','laranja')),
  -- Comentário (obrigatório para footnote, opcional para highlight)
  comentario text,
  -- Ordem de exibição (para footnotes numeradas)
  ordem int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para busca rápida por correção e posição
create index if not exists idx_anotacoes_correcao_id on public.anotacoes_correcao(correcao_id);
create index if not exists idx_anotacoes_posicao on public.anotacoes_correcao(correcao_id, inicio, fim);

-- RLS: só o professor que criou (ou admin) pode ver/editar
alter table public.anotacoes_correcao enable row level security;

create policy "Professor vê suas anotações"
  on public.anotacoes_correcao for select
  using (
    professor_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "Professor insere suas anotações"
  on public.anotacoes_correcao for insert
  with check (professor_id = auth.uid());

create policy "Professor atualiza suas anotações"
  on public.anotacoes_correcao for update
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

create policy "Professor apaga suas anotações"
  on public.anotacoes_correcao for delete
  using (professor_id = auth.uid());

-- Trigger para updated_at
create trigger set_anotacoes_updated_at
  before update on public.anotacoes_correcao
  for each row execute function public.update_updated_at_column();

-- Comentários
comment on table public.anotacoes_correcao is 'Anotações do professor sobre trechos da redação (highlights e footnotes)';
comment on column public.anotacoes_correcao.tipo is 'highlight = marcador colorido; footnote = nota de rodapé numerada com comentário';
comment on column public.anotacoes_correcao.cor is 'Cor do highlight: amarelo, verde, azul, rosa, laranja';