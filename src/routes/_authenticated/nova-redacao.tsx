import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, Loader2, Pause, PenLine, Play, Sparkles, Timer, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { enviarRedacao } from "@/lib/redacoes.functions";
import { AppShell } from "@/components/AppShell";
import { EditorRedacao, limparRascunho } from "@/components/EditorRedacao";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/nova-redacao")({
  head: () => ({
    meta: [
      { title: "Nova redação — EscreveAI" },
      {
        name: "description",
        content:
          "Escolha um tema, decida entre treino livre ou simulado cronometrado e receba a correção.",
      },
      { property: "og:title", content: "Nova redação — EscreveAI" },
      {
        property: "og:description",
        content: "Escreva no modo livre ou cronometrado e receba nota por competência.",
      },
    ],
  }),
  component: NovaRedacao,
});

const DURACAO_SIMULADO = 90 * 60;

function NovaRedacao() {
  const router = useRouter();
  const { user } = useAuth();
  const enviar = useServerFn(enviarRedacao);
  const rascunhoBase = `nova-redacao:${user?.id ?? "anon"}`;
  const [tipo, setTipo] = useState<"livre" | "cronometrada">("livre");
  const [temaId, setTemaId] = useState<string | null>(null);
  const [temaLivre, setTemaLivre] = useState("");
  const [texto, setTexto] = useState("");
  const [rodando, setRodando] = useState(false);
  const [restante, setRestante] = useState(DURACAO_SIMULADO);
  const [enviando, setEnviando] = useState(false);
  const [focoAtivo, setFocoAtivo] = useState(false);
  const inicioRef = useRef<number | null>(null);

  const { data: temas } = useQuery({
    queryKey: ["temas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("temas")
        .select("id, titulo, descricao, area")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!rodando) return;
    const intervalo = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          clearInterval(intervalo);
          setRodando(false);
          toast.warning("Tempo esgotado! Envie sua redação.");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [rodando]);

  const temaSelecionado = temas?.find((t) => t.id === temaId);
  const temaTitulo = temaSelecionado?.titulo ?? temaLivre;

  function iniciarCronometro() {
    if (!temaTitulo) {
      toast.error("Escolha um tema antes de iniciar o simulado.");
      return;
    }
    inicioRef.current = Date.now();
    setRestante(DURACAO_SIMULADO);
    setRodando(true);
    setFocoAtivo(true);
  }

  async function handleEnviar() {
    if (!temaTitulo || temaTitulo.length < 3) {
      toast.error("Escolha ou escreva um tema.");
      return;
    }
    if (texto.trim().length < 200) {
      toast.error("A redação está muito curta para ser corrigida.");
      return;
    }
    setEnviando(true);
    try {
      const resultado = await enviar({
        data: {
          texto,
          temaId: temaSelecionado?.id ?? null,
          temaTitulo,
          tipo,
          tempoGastoSeg:
            tipo === "cronometrada" && inicioRef.current
              ? Math.round((Date.now() - inicioRef.current) / 1000)
              : null,
        },
      });
      toast.success(
        `Nota ${resultado.notaTotal}/1000 • +${resultado.cashGanho} CASH • +${resultado.xpGanho} XP`,
      );
      limparRascunho(rascunhoBase);
      setTexto("");
      void router.navigate({ to: "/redacao/$id", params: { id: resultado.redacaoId } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível corrigir sua redação agora.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const minutos = String(Math.floor(restante / 60)).padStart(2, "0");
  const segundos = String(restante % 60).padStart(2, "0");

  const pctTempo = Math.round(((DURACAO_SIMULADO - restante) / DURACAO_SIMULADO) * 100);
  const corTempo =
    restante <= 600 ? "text-danger" : restante <= 1800 ? "text-trofeu" : "text-ink-foreground";
  const fase =
    pctTempo < 20
      ? "Planejamento: leia o tema e monte o rascunho"
      : pctTempo < 75
        ? "Escrita: desenvolva introdução, argumentos e conclusão"
        : "Revisão: confira a proposta de intervenção e a gramática";

  if (tipo === "cronometrada" && focoAtivo) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 bg-hero text-ink-foreground shadow-lg">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-ink-foreground/60">
                Simulado ENEM • 90 minutos
              </p>
              <p className="truncate font-display text-base font-semibold">{temaTitulo}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className={`size-5 ${corTempo}`} />
                <span className={`nota-grande text-4xl tabular-nums ${corTempo}`} aria-live="polite">
                  {minutos}:{segundos}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRodando(!rodando)}
                disabled={restante === 0}
              >
                {rodando ? <Pause className="size-4" /> : <Play className="size-4" />}
                {rodando ? "Pausar" : "Retomar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-ink-foreground hover:bg-ink-foreground/10"
                onClick={() => {
                  setRodando(false);
                  setFocoAtivo(false);
                }}
                aria-label="Sair do modo foco"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-5 pb-4">
            <Progress value={pctTempo} className="h-1.5" />
            <p className="mt-2 text-xs text-ink-foreground/70">{fase}</p>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-6">
          {!rodando && restante > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-muted p-3 text-center text-sm">
              Cronômetro pausado. Clique em Retomar para continuar.
            </div>
          )}
          {restante === 0 && (
            <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-center text-sm font-semibold">
              Tempo esgotado! Envie sua redação para correção.
            </div>
          )}
          <div className="card-soft p-6">
            <EditorRedacao
              id="redacao"
              value={texto}
              onChange={setTexto}
              rascunhoBase={rascunhoBase}
              placeholder="Comece sua dissertação-argumentativa aqui..."
              className="min-h-[60vh] resize-y border-0 text-base leading-loose shadow-none focus-visible:ring-0"
              autoFocus
              maxLinhas={30}
            />
            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <Button onClick={handleEnviar} disabled={enviando}>
                {enviando ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Corrigindo...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Finalizar e enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AppShell titulo="Nova redação" descricao="Escolha o tema e o modo de escrita">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card-soft p-5">
            <Label className="text-sm font-semibold">Modo de escrita</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTipo("livre")}
                className={
                  tipo === "livre"
                    ? "rounded-xl border-2 border-primary bg-primary/10 p-4 text-left"
                    : "rounded-xl border border-border p-4 text-left"
                }
              >
                <PenLine className="size-4 text-primary" />
                <p className="mt-2 font-semibold">Treino livre</p>
                <p className="text-sm text-muted-foreground">
                  Sem cronômetro, para praticar à vontade.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTipo("cronometrada")}
                className={
                  tipo === "cronometrada"
                    ? "rounded-xl border-2 border-primary bg-primary/10 p-4 text-left"
                    : "rounded-xl border border-border p-4 text-left"
                }
              >
                <Timer className="size-4 text-primary" />
                <p className="mt-2 font-semibold">Cronometrada</p>
                <p className="text-sm text-muted-foreground">
                  90 minutos, como no dia da prova. Rende XP extra.
                </p>
              </button>
            </div>

            {tipo === "cronometrada" && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-ink-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  <span className="nota-grande text-2xl">
                    {minutos}:{segundos}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={rodando ? "secondary" : "default"}
                  onClick={() =>
                    inicioRef.current ? (setFocoAtivo(true), setRodando(true)) : iniciarCronometro()
                  }
                >
                  {inicioRef.current ? "Voltar ao simulado" : "Iniciar simulado"}
                </Button>
              </div>
            )}
          </div>

          <div className="card-soft p-5">
            <Label htmlFor="redacao" className="text-sm font-semibold">
              Sua redação
            </Label>
            <div className="mt-3">
              <EditorRedacao
                id="redacao"
                value={texto}
                onChange={setTexto}
                rascunhoBase={rascunhoBase}
                placeholder="Escreva aqui sua dissertação-argumentativa..."
                className="min-h-[420px] resize-y leading-relaxed"
                maxLinhas={30}
              />
            </div>
            <Button className="mt-4 w-full" onClick={handleEnviar} disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Corrigindo sua redação...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Enviar para correção
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <Label className="text-sm font-semibold">Banco de temas</Label>
            <div className="mt-3 space-y-2">
              {(temas ?? []).map((tema) => (
                <button
                  key={tema.id}
                  type="button"
                  onClick={() => {
                    setTemaId(tema.id);
                    setTemaLivre("");
                  }}
                  className={
                    temaId === tema.id
                      ? "w-full rounded-lg border-2 border-primary bg-primary/10 p-3 text-left"
                      : "w-full rounded-lg border border-border p-3 text-left hover:border-primary/40"
                  }
                >
                  <p className="text-sm font-semibold leading-snug">{tema.titulo}</p>
                  {tema.area && (
                    <p className="mt-1 text-xs text-muted-foreground">{tema.area}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card-soft p-5">
            <Label htmlFor="tema-livre" className="text-sm font-semibold">
              Ou digite outro tema
            </Label>
            <Input
              id="tema-livre"
              value={temaLivre}
              onChange={(e) => {
                setTemaLivre(e.target.value);
                setTemaId(null);
              }}
              placeholder="Ex.: O papel do esporte na inclusão social"
              className="mt-3"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
