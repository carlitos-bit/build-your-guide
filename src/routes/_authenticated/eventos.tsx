import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
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

function NovoEvento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ titulo: "", tema: "", inicio: "", duracao: 90, bonus: 200 });
  const [salvando, setSalvando] = useState(false);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !f.titulo.trim() || !f.tema.trim() || !f.inicio) {
      toast.error("Preencha título, tema e data.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("eventos").insert({
      titulo: f.titulo.trim(),
      tema_titulo: f.tema.trim(),
      inicia_em: new Date(f.inicio).toISOString(),
      duracao_min: f.duracao,
      bonus_cash: f.bonus,
      criado_por: user.id,
    });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível publicar o evento.");
      return;
    }
    toast.success("Evento publicado para os alunos.");
    setF({ titulo: "", tema: "", inicio: "", duracao: 90, bonus: 200 });
    void qc.invalidateQueries({ queryKey: ["eventos"] });
  }
  return (
    <form onSubmit={enviar} className="card-soft mb-6 grid gap-3 p-5 md:grid-cols-2">
      <h2 className="font-display text-base font-semibold md:col-span-2">Publicar evento de redação</h2>
      <Input placeholder="Título (ex.: Simulado ENEM de novembro)" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      <Input placeholder="Tema da redação" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
      <label className="text-sm">Início<Input type="datetime-local" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Duração (min)<Input type="number" min={10} value={f.duracao} onChange={(e) => setF({ ...f, duracao: Number(e.target.value) })} /></label>
        <label className="text-sm">Bônus CASH<Input type="number" min={0} value={f.bonus} onChange={(e) => setF({ ...f, bonus: Number(e.target.value) })} /></label>
      </div>
      <Button type="submit" disabled={salvando} className="md:col-span-2">Publicar evento</Button>
    </form>
  );
}

function Eventos() {
  const { isProfessor, isAdmin } = useAuth();
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
      {(isProfessor || isAdmin) && <NovoEvento />}
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

              {!isProfessor && (
                <Button asChild className="mt-5 w-full" disabled={!futuro}>
                  <Link to="/nova-redacao">Participar no modo cronometrado</Link>
                </Button>
              )}
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
