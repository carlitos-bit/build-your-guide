import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Lightbulb, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  COMPETENCIAS,
  corDaCompetencia,
  corDaNota,
  rotuloDaNota,
  type FeedbackIA,
} from "@/lib/notas";

export const Route = createFileRoute("/_authenticated/redacao/$id")({
  head: () => ({
    meta: [
      { title: "Resultado da correção — EscreveAI" },
      {
        name: "description",
        content: "Nota por competência, trechos destacados e sugestões de reescrita.",
      },
      { property: "og:title", content: "Resultado da correção — EscreveAI" },
      {
        property: "og:description",
        content: "Veja sua nota nas 5 competências do ENEM e o que melhorar.",
      },
    ],
  }),
  component: Resultado,
});

function Resultado() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["redacao", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("redacoes")
        .select(
          "id, tema_titulo, texto, tipo, created_at, correcoes(nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, nota_total, feedback_ia, feedback_professor, liberada)",
        )
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const correcao = data
    ? Array.isArray(data.correcoes)
      ? data.correcoes[0]
      : data.correcoes
    : null;
  const feedback = (correcao?.feedback_ia ?? {}) as FeedbackIA;
  const notas: Record<string, number> = {
    c1: correcao?.nota_c1 ?? 0,
    c2: correcao?.nota_c2 ?? 0,
    c3: correcao?.nota_c3 ?? 0,
    c4: correcao?.nota_c4 ?? 0,
    c5: correcao?.nota_c5 ?? 0,
  };

  return (
    <AppShell titulo="Resultado da correção" descricao={data?.tema_titulo}>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando correção...</p>}

      {!isLoading && !correcao && (
        <div className="card-soft p-8 text-center">
          <p className="font-display text-lg font-semibold">Correção ainda não liberada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O professor está revisando esta redação. Você será avisado quando ela for liberada.
          </p>
        </div>
      )}

      {correcao && (
        <div className="space-y-4">
          {!correcao.liberada && (
            <div className="card-soft border-warning/50 bg-warning/5 p-4 text-sm">
              <span className="font-semibold">Correção em revisão.</span> Esta é a estimativa da
              IA. A nota oficial só é definida depois que o professor revisa e libera.
            </div>
          )}
          <div className="card-soft bg-hero p-6 text-ink-foreground">
            <p className="text-sm text-ink-foreground/70">
              {correcao.liberada ? "Nota oficial" : "Estimativa da IA (em revisão)"}
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <span className="nota-grande text-6xl">{correcao.nota_total}</span>
              <span className="pb-2 text-sm text-ink-foreground/70">/ 1000</span>
              <Badge className="mb-2 bg-ink-foreground/15 text-ink-foreground">
                {rotuloDaNota(correcao.nota_total as number)}
              </Badge>
            </div>
            {feedback.resumo && (
              <p className="mt-4 max-w-3xl text-sm text-ink-foreground/80">{feedback.resumo}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {COMPETENCIAS.map((comp) => {
              const detalhe = feedback.competencias?.[comp.chave];
              const nota = notas[comp.chave] ?? 0;
              return (
                <div key={comp.chave} className="card-soft p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{comp.titulo}</p>
                      <p className="text-xs text-muted-foreground">{comp.resumo}</p>
                    </div>
                    <div className="text-right">
                      <span className={`nota-grande text-2xl ${corDaCompetencia(nota)}`}>
                        {nota}
                      </span>
                      <p className="text-xs text-muted-foreground">/ 200</p>
                    </div>
                  </div>
                  <Progress value={(nota / 200) * 100} className="mt-3" />
                  {detalhe?.analise && (
                    <p className="mt-3 text-sm text-muted-foreground">{detalhe.analise}</p>
                  )}
                  {!!detalhe?.sugestoes?.length && (
                    <ul className="mt-3 space-y-1.5">
                      {detalhe.sugestoes.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card-soft p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <CheckCircle2 className="size-4 text-success" /> Pontos fortes
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(feedback.pontos_fortes ?? []).map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
            <div className="card-soft p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <AlertTriangle className="size-4 text-warning" /> A melhorar
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(feedback.pontos_a_melhorar ?? []).map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
          </div>

          {!!feedback.trechos?.length && (
            <div className="card-soft p-5">
              <h2 className="font-display text-base font-semibold">Trechos comentados</h2>
              <div className="mt-4 space-y-4">
                {feedback.trechos.map((t, i) => (
                  <div key={i} className="rounded-xl border border-border p-4">
                    <div className="flex items-start gap-2">
                      <Quote className="mt-1 size-4 shrink-0 text-primary" />
                      <p className="text-sm italic">{t.trecho}</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{t.comentario}</p>
                    {t.sugestao_reescrita && (
                      <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">
                        <span className="font-semibold">Sugestão: </span>
                        {t.sugestao_reescrita}
                      </p>
                    )}
                    <Badge variant="outline" className="mt-3 text-xs">
                      {t.gravidade}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {correcao.feedback_professor && (
            <div className="card-soft border-primary/40 p-5">
              <h2 className="font-display text-base font-semibold">Comentário do professor</h2>
              <p className="mt-2 text-sm">{correcao.feedback_professor}</p>
            </div>
          )}

          <div className="card-soft p-5">
            <h2 className="font-display text-base font-semibold">Sua redação</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {data?.texto}
            </p>
          </div>

          <p className={`text-center text-xs ${corDaNota(correcao.nota_total as number)}`}>
            {correcao.liberada
              ? "Nota revisada e liberada pelo professor."
              : "Estimativa da IA do EscreveAI — aguardando revisão do professor."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
