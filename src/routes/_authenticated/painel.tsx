import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Coins,
  Flame,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { corDaNota, rotuloDaNota } from "@/lib/notas";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel do aluno — EscreveAI" },
      {
        name: "description",
        content: "Sua última nota, evolução, próxima meta e atalho para uma nova redação.",
      },
      { property: "og:title", content: "Painel do aluno — EscreveAI" },
      {
        property: "og:description",
        content: "Acompanhe nota, evolução, CASH, XP e troféus do seu perfil.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { user, perfil } = useAuth();

  const { data } = useQuery({
    queryKey: ["painel", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [redacoes, gam, trofeus, eventos] = await Promise.all([
        supabase
          .from("redacoes")
          .select("id, tema_titulo, created_at, tipo, correcoes(nota_total, liberada)")
          .eq("aluno_id", user!.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("perfil_gamificacao")
          .select("nivel, xp_atual, cash_atual, sequencia_quinzenas")
          .eq("aluno_id", user!.id)
          .maybeSingle(),
        supabase.from("trofeus_aluno").select("trofeu_codigo").eq("aluno_id", user!.id),
        supabase
          .from("eventos")
          .select("id, titulo, tema_titulo, inicia_em, bonus_cash")
          .gte("inicia_em", new Date().toISOString())
          .order("inicia_em")
          .limit(1),
      ]);
      return {
        redacoes: redacoes.data ?? [],
        gam: gam.data,
        trofeus: trofeus.data ?? [],
        proximoEvento: eventos.data?.[0] ?? null,
      };
    },
  });

  const corrigidas = (data?.redacoes ?? [])
    .map((r) => {
      const c = Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes;
      return { ...r, nota: c?.liberada ? (c.nota_total as number) : null };
    })
    .filter((r) => r.nota !== null) as Array<{
    id: string;
    tema_titulo: string;
    created_at: string;
    nota: number;
  }>;

  const ultima = corrigidas.at(-1);
  const media = corrigidas.length
    ? Math.round(corrigidas.reduce((a, b) => a + b.nota, 0) / corrigidas.length)
    : 0;
  const xp = data?.gam?.xp_atual ?? 0;
  const nivel = data?.gam?.nivel ?? 1;
  const xpNoNivel = xp % 500;
  const progressoNivel = Math.round((xpNoNivel / 500) * 100);
  const meta = ultima ? Math.min(1000, Math.ceil((ultima.nota + 60) / 20) * 20) : 700;

  const grafico = corrigidas.map((r, i) => ({
    nome: `#${i + 1}`,
    nota: r.nota,
  }));

  return (
    <AppShell
      titulo={`Olá, ${perfil?.nome?.split(" ")[0] ?? "aluno"}!`}
      descricao="Escreva. Evolua. Conquiste. Resgate."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-soft md:col-span-2 p-6">
          <p className="text-sm text-muted-foreground">Última nota</p>
          {ultima ? (
            <>
              <div className="mt-1 flex items-end gap-3">
                <span className={`nota-grande text-5xl ${corDaNota(ultima.nota)}`}>
                  {ultima.nota}
                </span>
                <span className="pb-1 text-sm text-muted-foreground">/ 1000</span>
                <span className="pb-1 text-sm font-semibold">{rotuloDaNota(ultima.nota)}</span>
              </div>
              <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                {ultima.tema_titulo}
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link to="/redacao/$id" params={{ id: ultima.id }}>
                  Ver correção completa
                </Link>
              </Button>
            </>
          ) : (
            <div className="mt-2">
              <p className="font-display text-2xl font-semibold">Nenhuma redação ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Envie sua primeira redação e receba a correção pelas 5 competências.
              </p>
              <Button asChild className="mt-4">
                <Link to="/nova-redacao">
                  <Sparkles className="size-4" /> Escrever agora
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="card-soft p-6">
          <p className="text-sm text-muted-foreground">Nível {nivel}</p>
          <p className="font-display text-xl font-semibold">
            {nivel < 4 ? "Escritor Iniciante" : nivel < 8 ? "Escritor Dedicado" : "Escritor Avançado"}
          </p>
          <Progress value={progressoNivel} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            {progressoNivel}% para o próximo nível ({xpNoNivel}/500 XP)
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-cash" />
              <span className="font-semibold">{data?.gam?.cash_atual ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="size-4 text-xp" />
              <span className="font-semibold">{xp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-trofeu" />
              <span className="font-semibold">{data?.trofeus.length ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-danger" />
              <span className="font-semibold">{data?.gam?.sequencia_quinzenas ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="card-soft p-6 md:col-span-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Evolução das notas</h2>
          </div>
          {grafico.length > 1 ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={grafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis domain={[0, 1000]} stroke="var(--muted-foreground)" fontSize={12} />
                  <ChartTooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nota"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Envie ao menos duas redações para ver o gráfico de evolução.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-soft p-6">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-accent-foreground" />
              <h2 className="font-display text-base font-semibold">Próxima meta</h2>
            </div>
            <p className="mt-2 nota-grande text-3xl text-primary">{meta}</p>
            <p className="text-sm text-muted-foreground">
              Sua média atual é {media || "—"}. Foque na competência mais fraca da última correção.
            </p>
          </div>

          {data?.proximoEvento && (
            <div className="card-soft bg-hero p-6 text-ink-foreground">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4" />
                <h2 className="font-display text-base font-semibold">Próximo evento</h2>
              </div>
              <p className="mt-2 font-semibold">{data.proximoEvento.titulo}</p>
              <p className="text-sm text-ink-foreground/70">{data.proximoEvento.tema_titulo}</p>
              <p className="mt-2 text-xs text-ink-foreground/60">
                {new Date(data.proximoEvento.inicia_em).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}{" "}
                • bônus de {data.proximoEvento.bonus_cash} CASH
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
