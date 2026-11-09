import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Flame, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ajustarCorrecao } from "@/lib/redacoes.functions";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { COMPETENCIAS, corDaNota } from "@/lib/notas";

export const Route = createFileRoute("/_authenticated/professor")({
  head: () => ({
    meta: [
      { title: "Painel do professor — EscreveAI" },
      {
        name: "description",
        content:
          "Revise as correções da IA, ajuste notas, comente e veja o mapa de calor das competências da turma.",
      },
      { property: "og:title", content: "Painel do professor — EscreveAI" },
      {
        property: "og:description",
        content: "Correção híbrida: a IA corrige, o professor revisa e libera.",
      },
    ],
  }),
  component: PainelProfessor,
});

type CorrecaoRow = {
  id: string;
  nota_c1: number;
  nota_c2: number;
  nota_c3: number;
  nota_c4: number;
  nota_c5: number;
  nota_total: number;
  feedback_professor: string | null;
  liberada: boolean;
  redacao_id: string;
  redacoes: { tema_titulo: string; texto: string; aluno_id: string; created_at: string } | null;
};

function PainelProfessor() {
  const { isProfessor, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const salvar = useServerFn(ajustarCorrecao);
  const [editando, setEditando] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");

  const { data: turmas } = useQuery({
    queryKey: ["professor-turmas", user?.id],
    enabled: isProfessor || isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("turmas").select("id, nome, escola, profiles(id, nome)").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["professor-correcoes"],
    enabled: isProfessor || isAdmin,
    queryFn: async () => {
      const [correcoes, alunos] = await Promise.all([
        supabase
          .from("correcoes")
          .select(
            "id, redacao_id, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, nota_total, feedback_professor, liberada, redacoes(tema_titulo, texto, aluno_id, created_at)",
          )
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, nome"),
      ]);
      return {
        correcoes: (correcoes.data ?? []) as unknown as CorrecaoRow[],
        alunos: new Map((alunos.data ?? []).map((a) => [a.id as string, a.nome as string])),
      };
    },
  });

  const mutation = useMutation({
    mutationFn: async (args: { correcaoId: string; liberada: boolean }) =>
      salvar({
        data: {
          correcaoId: args.correcaoId,
          notas: {
            c1: notas["c1"] ?? 0,
            c2: notas["c2"] ?? 0,
            c3: notas["c3"] ?? 0,
            c4: notas["c4"] ?? 0,
            c5: notas["c5"] ?? 0,
          },
          feedbackProfessor: comentario || null,
          liberada: args.liberada,
        },
      }),
    onSuccess: (_r, args) => {
      toast.success(
        args.liberada
          ? "Correção revisada e liberada ao aluno."
          : "Correção salva (ainda em revisão).",
      );
      setEditando(null);
      void queryClient.invalidateQueries({ queryKey: ["professor-correcoes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (!isProfessor && !isAdmin) {
    return (
      <AppShell titulo="Painel do professor">
        <div className="card-soft p-8 text-center">
          <p className="font-display text-lg font-semibold">Acesso restrito</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta área é exclusiva para contas de professor.
          </p>
        </div>
      </AppShell>
    );
  }

  const correcoes = data?.correcoes ?? [];
  const pendentes = correcoes.filter((c) => !c.liberada);
  const revisadas = correcoes.filter((c) => c.liberada);

  const mediaPorComp = COMPETENCIAS.map((c) => {
    const chave = `nota_${c.chave}` as keyof CorrecaoRow;
    const valores = revisadas.map((r) => Number(r[chave] ?? 0));
    const media = valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0;
    return { ...c, media };
  });
  const porAluno = new Map<string, { data: string; nota: number }[]>();
  for (const c of revisadas) {
    const id = c.redacoes?.aluno_id;
    if (!id) continue;
    const lista = porAluno.get(id) ?? [];
    lista.push({ data: c.redacoes?.created_at ?? "", nota: c.nota_total });
    porAluno.set(id, lista);
  }
  const progresso = [...porAluno.entries()].map(([id, lista]) => {
    const ord = [...lista].sort((a, b) => a.data.localeCompare(b.data));
    return {
      id,
      nome: data?.alunos.get(id) ?? "Usuário",
      total: ord.length,
      primeira: ord[0]?.nota ?? 0,
      ultima: ord.at(-1)?.nota ?? 0,
      media: Math.round(ord.reduce((a, b) => a + b.nota, 0) / ord.length),
    };
  });
  const maisFraca = [...mediaPorComp].sort((a, b) => a.media - b.media)[0];

  function cardCorrecao(c: CorrecaoRow) {
    return (
      <div key={c.id} className="card-soft p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.redacoes?.tema_titulo}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data?.alunos.get(c.redacoes?.aluno_id ?? "") ?? "Aluno"} •{" "}
              {c.redacoes?.created_at
                ? new Date(c.redacoes.created_at).toLocaleDateString("pt-BR")
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={c.liberada ? "secondary" : "outline"}>
              {c.liberada ? "Liberada" : "Em revisão"}
            </Badge>
            <span className={`nota-grande text-2xl ${corDaNota(c.nota_total)}`}>
              {c.nota_total}
            </span>
          </div>
        </div>

        <section className="mt-4 border-y border-border py-4">
          <h3 className="mb-2 text-sm font-semibold">Prévia da redação</h3>
          <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-loose">{c.redacoes?.texto}</p>
        </section>

        {editando === c.id ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-5">
              {COMPETENCIAS.map((comp) => (
                <div key={comp.chave}>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {comp.chave}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    step={40}
                    value={notas[comp.chave] ?? 0}
                    onChange={(e) => setNotas({ ...notas, [comp.chave]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Comentário do professor para o aluno..."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => mutation.mutate({ correcaoId: c.id, liberada: true })}
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />} Salvar e
                liberar
              </Button>
              <Button
                variant="secondary"
                onClick={() => mutation.mutate({ correcaoId: c.id, liberada: false })}
                disabled={mutation.isPending}
              >
                Salvar sem liberar
              </Button>
              <Button variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {COMPETENCIAS.map((comp) => (
                <Badge key={comp.chave} variant="outline">
                  {comp.chave.toUpperCase()}:{" "}
                  {Number(c[`nota_${comp.chave}` as keyof CorrecaoRow] ?? 0)}
                </Badge>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditando(c.id);
                setNotas({
                  c1: c.nota_c1,
                  c2: c.nota_c2,
                  c3: c.nota_c3,
                  c4: c.nota_c4,
                  c5: c.nota_c5,
                });
                setComentario(c.feedback_professor ?? "");
              }}
            >
              Revisar e ajustar
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell titulo="Painel do professor" descricao="Revise a IA antes de liberar ao aluno">
      <section className="mb-8">
        <h2 className="mb-4 font-display text-lg font-semibold">Minhas turmas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(turmas ?? []).map((turma) => <div key={turma.id} className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">{turma.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{turma.escola || "Escola não informada"}</p>
            <ul className="mt-4 divide-y divide-border">{turma.profiles.map((aluno) => <li key={aluno.id} className="py-2 text-sm">{aluno.nome}</li>)}</ul>
            {turma.profiles.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhum aluno vinculado.</p>}
          </div>)}
        </div>
        {turmas?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma turma vinculada à sua conta.</p>}
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-soft p-5">
          <Users className="size-4 text-primary" />
          <p className="mt-2 nota-grande text-2xl">{pendentes.length}</p>
          <p className="text-sm text-muted-foreground">Aguardando sua revisão</p>
          <p className="mt-1 text-xs text-muted-foreground">{revisadas.length} já revisada(s)</p>
        </div>
        <div className="card-soft p-5">
          <p className="text-sm text-muted-foreground">Média oficial da turma</p>
          <p className="mt-1 nota-grande text-2xl text-primary">
            {revisadas.length
              ? Math.round(revisadas.reduce((a, b) => a + b.nota_total, 0) / revisadas.length)
              : 0}
          </p>
          <p className="text-xs text-muted-foreground">/ 1000 (só notas revisadas)</p>
        </div>
        <div className="card-soft p-5">
          <Flame className="size-4 text-danger" />
          <p className="mt-2 font-semibold">{maisFraca?.titulo ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            Competência mais fraca ({maisFraca?.media ?? 0}/200)
          </p>
        </div>
      </div>

      <div className="mt-4 card-soft p-5">
        <h2 className="font-display text-base font-semibold">Mapa de calor das competências</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {mediaPorComp.map((c) => (
            <div
              key={c.chave}
              className="rounded-xl p-4 text-center"
              style={{
                backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(
                  (c.media / 200) * 60,
                )}%, var(--card))`,
              }}
            >
              <p className="text-xs font-semibold uppercase">{c.chave}</p>
              <p className="mt-1 nota-grande text-xl">{c.media}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 card-soft p-5">
        <h2 className="font-display text-base font-semibold">Progresso dos alunos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Aluno</th>
                <th className="py-2 text-right">Redações</th>
                <th className="py-2 text-right">Primeira</th>
                <th className="py-2 text-right">Última</th>
                <th className="py-2 text-right">Média</th>
                <th className="py-2 text-right">Evolução</th>
              </tr>
            </thead>
            <tbody>
              {progresso.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    Nenhum aluno enviou redações ainda.
                  </td>
                </tr>
              )}
              {progresso.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-medium">{p.nome}</td>
                  <td className="py-3 text-right">{p.total}</td>
                  <td className="py-3 text-right">{p.primeira}</td>
                  <td className={`py-3 text-right font-semibold ${corDaNota(p.ultima)}`}>{p.ultima}</td>
                  <td className="py-3 text-right">{p.media}</td>
                  <td
                    className={`py-3 text-right font-semibold ${p.ultima - p.primeira >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {p.ultima - p.primeira >= 0 ? "+" : ""}
                    {p.ultima - p.primeira}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="mt-6 font-display text-base font-semibold">
        Aguardando sua revisão ({pendentes.length})
      </h2>
      {isLoading && <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && pendentes.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma correção pendente.</p>
      )}
      <div className="mt-3 space-y-3">{pendentes.map((c) => cardCorrecao(c))}</div>

      <h2 className="mt-6 font-display text-base font-semibold">
        Já revisadas ({revisadas.length})
      </h2>
      {revisadas.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma correção revisada ainda.</p>
      )}
      <div className="mt-3 space-y-3">{revisadas.map((c) => cardCorrecao(c))}</div>
    </AppShell>
  );
}
