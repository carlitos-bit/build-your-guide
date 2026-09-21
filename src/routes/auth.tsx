import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Loader2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no EscreveAI" },
      {
        name: "description",
        content:
          "Acesse o EscreveAI como aluno ou professor para enviar redações e acompanhar a correção.",
      },
      { property: "og:title", content: "Entrar no EscreveAI" },
      {
        property: "og:description",
        content: "Crie sua conta de aluno ou professor e comece a evoluir na redação.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState<"aluno" | "professor">("aluno");

  useEffect(() => {
    if (session) void router.navigate({ to: "/painel" });
  }, [session, router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : error.message,
      );
      return;
    }
    toast.success("Bem-vindo de volta!");
    void router.navigate({ to: "/painel" });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/painel`,
        data: { nome, perfil },
      },
    });
    setCarregando(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este e-mail já tem conta. Faça login."
          : error.message,
      );
      return;
    }
    if (data.session) {
      toast.success("Conta criada! Vamos escrever.");
      void router.navigate({ to: "/painel" });
    } else {
      toast.success("Conta criada! Confirme o e-mail que enviamos para entrar.");
    }
  }

  async function entrarComGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    void router.navigate({ to: "/painel" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-hero p-10 text-ink-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand font-display text-lg font-bold">
            E
          </span>
          <span className="font-display text-lg font-semibold">EscreveAI</span>
        </Link>
        <div>
          <h2 className="max-w-sm font-display text-4xl font-bold leading-tight">
            Escreva. Evolua. Conquiste. Resgate.
          </h2>
          <p className="mt-4 max-w-md text-ink-foreground/70">
            Correção pelas 5 competências do ENEM em minutos, feedback trecho por trecho e um
            perfil que cresce a cada redação enviada.
          </p>
        </div>
        <div className="flex gap-6 text-sm text-ink-foreground/70">
          <span>Nota de 0 a 1000</span>
          <span>CASH • XP • Troféus</span>
          <span>Revisão do professor</span>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">Acessar o EscreveAI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre como aluno ou professor para começar.
          </p>

          <Tabs defaultValue="entrar" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={entrar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando && <Loader2 className="size-4 animate-spin" />} Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="criar">
              <form onSubmit={cadastrar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input
                    id="nome"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Você é</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPerfil("aluno")}
                      className={
                        perfil === "aluno"
                          ? "flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 px-3 py-2 text-sm font-semibold"
                          : "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
                      }
                    >
                      <PenLine className="size-4" /> Aluno
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerfil("professor")}
                      className={
                        perfil === "professor"
                          ? "flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 px-3 py-2 text-sm font-semibold"
                          : "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
                      }
                    >
                      <GraduationCap className="size-4" /> Professor
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-novo">E-mail</Label>
                  <Input
                    id="email-novo"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha-nova">Senha</Label>
                  <Input
                    id="senha-nova"
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando && <Loader2 className="size-4 animate-spin" />} Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={entrarComGoogle}>
            Continuar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}
