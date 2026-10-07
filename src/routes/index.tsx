import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Coins,
  GraduationCap,
  Library,
  Sparkles,
  Star,
  Timer,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EscreveAI — correção de redações com inteligência artificial" },
      {
        name: "description",
        content:
          "Envie sua redação e receba nota de 0 a 1000 pelas 5 competências do ENEM, com feedback trecho por trecho, revisão do professor e gamificação.",
      },
      { property: "og:title", content: "EscreveAI — Escreva. Evolua. Conquiste. Resgate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content:
          "Correção de redações do ENEM em minutos, painel do professor, CASH, XP e troféus.",
      },
    ],
  }),
  component: Home,
});

const diferenciais = [
  {
    icon: Sparkles,
    titulo: "Correção híbrida real",
    texto:
      "A IA entrega a correção completa nas 5 competências e o professor revisa e ajusta antes de liberar.",
  },
  {
    icon: BarChart3,
    titulo: "Mapa de calor dos erros",
    texto:
      "Painel visual mostra quais competências mais se repetem como ponto fraco por aluno e por turma.",
  },
  {
    icon: Trophy,
    titulo: "Gamificação completa",
    texto: "CASH para resgatar prêmios, XP para subir de nível e troféus por grandes marcos.",
  },
  {
    icon: Timer,
    titulo: "Eventos cronometrados",
    texto: "Simulados quinzenais agendados, com bônus de CASH e XP para manter o ritmo de estudo.",
  },
  {
    icon: Library,
    titulo: "Biblioteca de Conhecimentos",
    texto: "Slides e vídeos do professor — e dos alunos — reunidos com a correção na mesma plataforma.",
  },
  {
    icon: GraduationCap,
    titulo: "Feito para turmas",
    texto: "Desempenho médio por turma, temas próprios do professor e exportação de notas.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand font-display text-lg font-bold text-primary-foreground">
            E
          </span>
          <span className="font-display text-lg font-semibold">EscreveAI</span>
        </div>
        <AccountMenu />
      </header>

      <section className="bg-hero px-5 py-20 text-ink-foreground">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Correção de redações com IA
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
            Escreva. Evolua. <span className="text-brand-gradient">Conquiste.</span> Resgate.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-foreground/75">
            Envie sua redação por texto e receba, em minutos, nota estimada de 0 a 1000 nas 5
            competências do ENEM, com trechos comentados e sugestões de reescrita — tudo revisável
            pelo professor.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Começar agora</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-ink-foreground/30 bg-transparent text-ink-foreground hover:bg-ink-foreground/10">
              <Link to="/auth">Sou professor</Link>
            </Button>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-ink-foreground/10 p-5">
              <Coins className="size-5 text-cash" />
              <p className="mt-3 font-display text-xl font-semibold">CASH</p>
              <p className="text-sm text-ink-foreground/70">
                Moeda para resgatar prêmios na Loja EscreveAI.
              </p>
            </div>
            <div className="rounded-2xl bg-ink-foreground/10 p-5">
              <Star className="size-5 text-xp" />
              <p className="mt-3 font-display text-xl font-semibold">XP</p>
              <p className="text-sm text-ink-foreground/70">
                Experiência para subir de nível a cada redação.
              </p>
            </div>
            <div className="rounded-2xl bg-ink-foreground/10 p-5">
              <Trophy className="size-5 text-trofeu" />
              <p className="mt-3 font-display text-xl font-semibold">Troféus</p>
              <p className="text-sm text-ink-foreground/70">
                Conquistas por marcos reais de desempenho.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display text-3xl font-bold">O que torna o EscreveAI diferente</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Não é só "ter IA": é o fluxo professor + IA, o painel analítico por turma e um perfil que
          faz o aluno querer voltar a escrever.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {diferenciais.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="card-soft p-6">
              <Icon className="size-5 text-primary" />
              <p className="mt-3 font-display text-lg font-semibold">{titulo}</p>
              <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="card-soft bg-brand p-10 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-bold">Sua próxima nota mil começa hoje</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Crie sua conta de aluno ou professor e envie a primeira redação em menos de um minuto.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/auth">Criar minha conta</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
        EscreveAI — correção de redações com inteligência artificial.
      </footer>
    </div>
  );
}
