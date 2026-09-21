import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Coins, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos e simulados — EscreveAI" },
      {
        name: "description",
        content: "Simulados cronometrados agendados com bônus de CASH e XP para quem participa.",
      },
      { property: "og:title", content: "Eventos e simulados — EscreveAI" },
      {
        property: "og:description",
        content: "Participe dos simulados quinzenais e mantenha sua sequência.",
      },
    ],
  }),
  component: Eventos,
});

function Eventos() {
  const { data } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("id, titulo, tema_titulo, inicia_em, duracao_min, bonus_cash")
        .order("inicia_em");
      return data ?? [];
    },
  });

  const agora = Date.now();

  return (
    <AppShell titulo="Eventos" descricao="Simulados cronometrados agendados">
      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((e) => {
          const inicio = new Date(e.inicia_em);
          const futuro = inicio.getTime() > agora;
          return (
            <div key={e.id} className="card-soft p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{e.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{e.tema_titulo}</p>
                </div>
                <Badge variant={futuro ? "default" : "secondary"}>
                  {futuro ? "Agendado" : "Encerrado"}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-4" />
                  {inicio.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Timer className="size-4" />
                  {e.duracao_min} min
                </span>
                <span className="flex items-center gap-1.5">
                  <Coins className="size-4 text-cash" />+{e.bonus_cash} CASH
                </span>
              </div>

              <Button asChild className="mt-5 w-full" disabled={!futuro}>
                <Link to="/nova-redacao">Participar no modo cronometrado</Link>
              </Button>
            </div>
          );
        })}
      </div>

      {(data ?? []).length === 0 && (
        <div className="card-soft p-10 text-center">
          <CalendarClock className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-semibold">Nenhum evento agendado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu professor pode agendar simulados cronometrados para a turma.
          </p>
        </div>
      )}
    </AppShell>
  );
}
