import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Flame, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AvatarEditor } from "@/components/AvatarEditor";
import { StudentAvatar } from "@/components/StudentAvatar";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — EscreveAI" },
      {
        name: "description",
        content: "Nível, XP, CASH, troféus, sequência e média: o cartão de visitas do seu desempenho.",
      },
      { property: "og:title", content: "Meu perfil — EscreveAI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Acompanhe sua progressão com CASH, XP e troféus no EscreveAI.",
      },
    ],
  }),
  component: PerfilAluno,
});

function PerfilAluno() {
  const { user, perfil } = useAuth();

  const { data } = useQuery({
    queryKey: ["perfil-gamificacao", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Sessão não encontrada");
      const [gam, trofeus, meus, correcoes] = await Promise.all([
        supabase
          .from("perfil_gamificacao")
          .select("nivel, xp_atual, cash_atual, sequencia_quinzenas")
          .eq("aluno_id", user.id)
          .maybeSingle(),
        supabase.from("trofeus").select("codigo, nome, descricao"),
        supabase.from("trofeus_aluno").select("trofeu_codigo").eq("aluno_id", user.id),
        supabase
          .from("correcoes")
          .select("nota_total, redacoes!inner(aluno_id)")
          .eq("redacoes.aluno_id", user.id),
      ]);
      const notas = (correcoes.data ?? []).map((c) => c.nota_total as number);
      return {
        gam: gam.data,
        trofeus: trofeus.data ?? [],
        conquistados: new Set((meus.data ?? []).map((t) => t.trofeu_codigo as string)),
        media: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : 0,
        total: notas.length,
      };
    },
  });

  const xp = data?.gam?.xp_atual ?? 0;
  const nivel = data?.gam?.nivel ?? 1;
  const progresso = Math.round(((xp % 500) / 500) * 100);

  return (
    <AppShell titulo="Meu perfil" descricao="Sua progressão dentro do EscreveAI">
      <div className="card-soft bg-hero p-6 text-ink-foreground">
        <StudentAvatar value={perfil?.avatar} portrait className="mb-4 size-20 rounded-full bg-secondary" />
        <p className="font-display text-2xl font-bold uppercase tracking-wide">
          {perfil?.nome ?? "Aluno"}
        </p>
        <p className="mt-1 text-sm text-ink-foreground/70">
          Nível {nivel} —{" "}
          {nivel < 4 ? "Escritor Iniciante" : nivel < 8 ? "Escritor Dedicado" : "Escritor Avançado"}
        </p>
        <Progress value={progresso} className="mt-4" />
        <p className="mt-2 text-xs text-ink-foreground/60">
          XP — {progresso}% para o próximo nível
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-ink-foreground/10 p-4">
            <Coins className="size-4 text-cash" />
            <p className="mt-2 nota-grande text-xl">{data?.gam?.cash_atual ?? 0}</p>
            <p className="text-xs text-ink-foreground/60">CASH</p>
          </div>
          <div className="rounded-xl bg-ink-foreground/10 p-4">
            <Trophy className="size-4 text-trofeu" />
            <p className="mt-2 nota-grande text-xl">{data?.conquistados.size ?? 0}</p>
            <p className="text-xs text-ink-foreground/60">Troféus</p>
          </div>
          <div className="rounded-xl bg-ink-foreground/10 p-4">
            <Flame className="size-4 text-danger" />
            <p className="mt-2 nota-grande text-xl">{data?.gam?.sequencia_quinzenas ?? 0}</p>
            <p className="text-xs text-ink-foreground/60">Sequência (quinzenas)</p>
          </div>
          <div className="rounded-xl bg-ink-foreground/10 p-4">
            <Star className="size-4 text-xp" />
            <p className="mt-2 nota-grande text-xl">{data?.media ?? 0}</p>
            <p className="text-xs text-ink-foreground/60">Média / 1000</p>
          </div>
        </div>
      </div>

      <AvatarEditor />

      <div className="mt-4 card-soft p-6">
        <h2 className="font-display text-base font-semibold">Troféus</h2>
        <p className="text-sm text-muted-foreground">
          {data?.conquistados.size ?? 0} de {data?.trofeus.length ?? 0} conquistados
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.trofeus ?? []).map((t) => {
            const conquistado = data?.conquistados.has(t.codigo as string);
            return (
              <div
                key={t.codigo}
                className={
                  conquistado
                    ? "rounded-xl border-2 border-trofeu/50 bg-trofeu/10 p-4"
                    : "rounded-xl border border-border p-4 opacity-60"
                }
              >
                <Trophy className={conquistado ? "size-5 text-trofeu" : "size-5 text-muted-foreground"} />
                <p className="mt-2 font-semibold">{t.nome}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.descricao}</p>
                <Badge variant={conquistado ? "default" : "outline"} className="mt-3 text-xs">
                  {conquistado ? "Conquistado" : "Bloqueado"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 card-soft p-6">
        <h2 className="font-display text-base font-semibold">Loja EscreveAI</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use seu CASH para resgatar prêmios cadastrados pelo professor. Em breve.
        </p>
        <p className="mt-3 text-sm">
          Você já acumulou <span className="font-semibold text-cash">{data?.gam?.cash_atual ?? 0} CASH</span>{" "}
          em {data?.total ?? 0} redações.
        </p>
      </div>
    </AppShell>
  );
}
