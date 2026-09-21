import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { corDaNota } from "@/lib/notas";

export const Route = createFileRoute("/_authenticated/redacoes")({
  head: () => ({
    meta: [
      { title: "Minhas redações — EscreveAI" },
      {
        name: "description",
        content: "Histórico de redações enviadas, notas e correções liberadas pelo professor.",
      },
      { property: "og:title", content: "Minhas redações — EscreveAI" },
      {
        property: "og:description",
        content: "Veja todas as suas redações e revise cada correção.",
      },
    ],
  }),
  component: MinhasRedacoes,
});

function MinhasRedacoes() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["minhas-redacoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("redacoes")
        .select("id, tema_titulo, tipo, created_at, correcoes(nota_total, liberada)")
        .eq("aluno_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell titulo="Minhas redações" descricao="Todo o seu histórico em um só lugar">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && (data ?? []).length === 0 && (
        <div className="card-soft p-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-semibold">Nenhuma redação enviada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comece agora e receba sua nota estimada de 0 a 1000.
          </p>
          <Button asChild className="mt-4">
            <Link to="/nova-redacao">
              <PenLine className="size-4" /> Escrever redação
            </Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {(data ?? []).map((r) => {
          const c = Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes;
          const nota = c?.liberada ? (c.nota_total as number) : null;
          return (
            <Link
              key={r.id}
              to="/redacao/$id"
              params={{ id: r.id }}
              className="card-soft flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-lift"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.tema_titulo}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {r.tipo === "cronometrada" ? "Cronometrada" : "Treino livre"}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {nota !== null ? (
                  <>
                    <span className={`nota-grande text-2xl ${corDaNota(nota)}`}>{nota}</span>
                    <p className="text-xs text-muted-foreground">/ 1000</p>
                  </>
                ) : (
                  <Badge variant="outline">Em revisão</Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
