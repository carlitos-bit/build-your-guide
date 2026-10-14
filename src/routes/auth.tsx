import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Mail,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Turnstile } from "@/components/Turnstile";
import { captchaAtivo } from "@/lib/captcha";
import { cn } from "@/lib/utils";

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

type Vista = "entrar" | "criar" | "recuperar";
type EtapaRecuperacao = "email" | "codigo" | "senha";

const REGRAS_SENHA = [
  { texto: "Pelo menos 8 caracteres", teste: (s: string) => s.length >= 8 },
  { texto: "Letras e números", teste: (s: string) => /[A-Za-z]/.test(s) && /\d/.test(s) },
  { texto: "Um caractere especial (!@#$…)", teste: (s: string) => /[^A-Za-z0-9]/.test(s) },
];

function nivelSenha(senha: string) {
  return REGRAS_SENHA.filter((regra) => regra.teste(senha)).length;
}

function traduzirErro(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já tem conta. Faça login.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns instantes e tente de novo.";
  if (m.includes("captcha")) return "Falha na verificação anti-robô. Tente novamente.";
  if (m.includes("weak password")) return "A senha é muito fraca. Use letras, números e símbolos.";
  if (m.includes("user not found")) return "Não encontramos uma conta com este e-mail.";
  if (m.includes("token has expired") || m.includes("invalid token"))
    return "Código inválido ou expirado. Solicite um novo.";
  return mensagem;
}

function ForcaSenha({ senha }: { senha: string }) {
  const nivel = nivelSenha(senha);
  const cores = ["bg-danger", "bg-danger", "bg-warning", "bg-success"];
  return (
    <div className="space-y-2">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i < nivel ? cores[nivel] : "bg-border")}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {REGRAS_SENHA.map((regra) => {
          const ok = regra.teste(senha);
          return (
            <li
              key={regra.texto}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                ok ? "text-success" : "text-muted-foreground",
              )}
            >
              <Check className={cn("size-3", ok ? "opacity-100" : "opacity-30")} />
              {regra.texto}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CampoEmail({
  id,
  valor,
  onChange,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>E-mail</Label>
      <Input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="voce@email.com"
      />
    </div>
  );
}

function CampoSenha({
  id,
  rotulo,
  valor,
  onChange,
  autoComplete,
  visivel,
  alternarVisibilidade,
  minLength = 8,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  autoComplete: string;
  visivel: boolean;
  alternarVisibilidade: () => void;
  minLength?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={alternarVisibilidade}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
        >
          {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function AuthPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [vista, setVista] = useState<Vista>("entrar");
  const [carregando, setCarregando] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState<"aluno" | "professor">("aluno");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // CAPTCHA opcional (só ativo quando VITE_TURNSTILE_SITE_KEY estiver configurada).
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaNonce, setCaptchaNonce] = useState(0);

  // Recuperação de senha por código.
  const [etapa, setEtapa] = useState<EtapaRecuperacao>("email");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

  const recuperando = vista === "recuperar";

  useEffect(() => {
    if (session && !recuperando) void router.navigate({ to: "/painel" });
  }, [session, recuperando, router]);

  function limparCaptcha() {
    setCaptchaToken("");
    setCaptchaNonce((n) => n + 1);
  }

  function opcoesCaptcha() {
    return captchaToken ? { captchaToken } : {};
  }

  function exigeCaptcha() {
    if (captchaAtivo && !captchaToken) {
      toast.error("Confirme que você não é um robô.");
      return true;
    }
    return false;
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (exigeCaptcha()) return;
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
      options: opcoesCaptcha(),
    });
    setCarregando(false);
    if (error) {
      toast.error(traduzirErro(error.message));
      limparCaptcha();
      return;
    }
    toast.success("Bem-vindo de volta!");
    void router.navigate({ to: "/painel" });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmarSenha) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (nivelSenha(senha) < 2) {
      toast.error("Escolha uma senha mais forte (letras, números e um símbolo).");
      return;
    }
    if (exigeCaptcha()) return;
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/painel`,
        data: { nome, perfil },
        ...opcoesCaptcha(),
      },
    });
    setCarregando(false);
    if (error) {
      toast.error(traduzirErro(error.message));
      limparCaptcha();
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

  function abrirRecuperacao() {
    setEtapa("email");
    setCodigo("");
    setNovaSenha("");
    setConfirmarNovaSenha("");
    setVista("recuperar");
    limparCaptcha();
  }

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail.");
      return;
    }
    if (exigeCaptcha()) return;
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, opcoesCaptcha());
    setCarregando(false);
    if (error) {
      toast.error(traduzirErro(error.message));
      limparCaptcha();
      return;
    }
    setEtapa("codigo");
    toast.success("Enviamos um código de 6 dígitos para seu e-mail.");
  }

  async function validarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (codigo.length !== 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "recovery" });
    setCarregando(false);
    if (error) {
      toast.error(traduzirErro(error.message));
      return;
    }
    setEtapa("senha");
  }

  async function salvarNovaSenha(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha !== confirmarNovaSenha) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (nivelSenha(novaSenha) < 2) {
      toast.error("Escolha uma senha mais forte (letras, números e um símbolo).");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setCarregando(false);
    if (error) {
      toast.error(traduzirErro(error.message));
      return;
    }
    toast.success("Senha redefinida! Bem-vindo de volta.");
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
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-foreground/70">
          <span>Nota de 0 a 1000</span>
          <span>CASH • XP • Troféus</span>
          <span>Revisão do professor</span>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {recuperando ? (
            <div>
              <button
                type="button"
                onClick={() => setVista("entrar")}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Voltar para o login
              </button>
              <h1 className="font-display text-2xl font-semibold">Recuperar senha</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {etapa === "email" && "Enviaremos um código de 6 dígitos para o seu e-mail."}
                {etapa === "codigo" && `Digite o código enviado para ${email}.`}
                {etapa === "senha" && "Crie uma nova senha para a sua conta."}
              </p>

              {etapa === "email" && (
                <form onSubmit={enviarCodigo} className="mt-6 space-y-4">
                  <CampoEmail id="email-recuperar" valor={email} onChange={setEmail} />
                  <Turnstile key={captchaNonce} onToken={setCaptchaToken} />
                  <Button type="submit" className="w-full" disabled={carregando}>
                    {carregando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    Enviar código
                  </Button>
                </form>
              )}

              {etapa === "codigo" && (
                <form onSubmit={validarCodigo} className="mt-6 space-y-5">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={codigo}
                      onChange={setCodigo}
                      pattern="^[0-9]*$"
                      containerClassName="justify-center"
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={carregando || codigo.length !== 6}
                  >
                    {carregando && <Loader2 className="size-4 animate-spin" />} Validar código
                  </Button>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setCodigo("");
                        setEtapa("email");
                      }}
                      className="font-medium text-primary hover:underline"
                    >
                      Reenviar ou usar outro e-mail
                    </button>
                  </div>
                </form>
              )}

              {etapa === "senha" && (
                <form onSubmit={salvarNovaSenha} className="mt-6 space-y-4">
                  <CampoSenha
                    id="nova-senha"
                    rotulo="Nova senha"
                    valor={novaSenha}
                    onChange={setNovaSenha}
                    autoComplete="new-password"
                    visivel={mostrarSenha}
                    alternarVisibilidade={() => setMostrarSenha((v) => !v)}
                  />
                  <ForcaSenha senha={novaSenha} />
                  <CampoSenha
                    id="confirmar-nova-senha"
                    rotulo="Confirmar nova senha"
                    valor={confirmarNovaSenha}
                    onChange={setConfirmarNovaSenha}
                    autoComplete="new-password"
                    visivel={mostrarSenha}
                    alternarVisibilidade={() => setMostrarSenha((v) => !v)}
                  />
                  <Button type="submit" className="w-full" disabled={carregando}>
                    {carregando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    Salvar nova senha
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <h1 className="font-display text-2xl font-semibold">Acessar o EscreveAI</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre como aluno ou professor para começar.
              </p>

              <Tabs
                value={vista}
                onValueChange={(valor) => {
                  setVista(valor as Vista);
                  limparCaptcha();
                }}
                className="mt-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="entrar">Entrar</TabsTrigger>
                  <TabsTrigger value="criar">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="entrar">
                  <form onSubmit={entrar} className="space-y-4">
                    <CampoEmail id="email" valor={email} onChange={setEmail} />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="senha">Senha</Label>
                        <button
                          type="button"
                          onClick={abrirRecuperacao}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="senha"
                          type={mostrarSenha ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenha((v) => !v)}
                          aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                        >
                          {mostrarSenha ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Turnstile key={captchaNonce} onToken={setCaptchaToken} />
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
                        autoComplete="name"
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
                          aria-pressed={perfil === "aluno"}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                            perfil === "aluno"
                              ? "border-2 border-primary bg-primary/10 font-semibold"
                              : "border border-border text-muted-foreground",
                          )}
                        >
                          <PenLine className="size-4" /> Aluno
                        </button>
                        <button
                          type="button"
                          onClick={() => setPerfil("professor")}
                          aria-pressed={perfil === "professor"}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                            perfil === "professor"
                              ? "border-2 border-primary bg-primary/10 font-semibold"
                              : "border border-border text-muted-foreground",
                          )}
                        >
                          <GraduationCap className="size-4" /> Professor
                        </button>
                      </div>
                      {perfil === "professor" && (
                        <p className="text-xs text-muted-foreground">
                          Contas de professor passam pela aprovação da coordenação antes de liberar
                          as turmas.
                        </p>
                      )}
                    </div>
                    <CampoEmail id="email-novo" valor={email} onChange={setEmail} />
                    <CampoSenha
                      id="senha-nova"
                      rotulo="Senha"
                      valor={senha}
                      onChange={setSenha}
                      autoComplete="new-password"
                      visivel={mostrarSenha}
                      alternarVisibilidade={() => setMostrarSenha((v) => !v)}
                    />
                    <CampoSenha
                      id="confirmar-senha"
                      rotulo="Confirmar senha"
                      valor={confirmarSenha}
                      onChange={setConfirmarSenha}
                      autoComplete="new-password"
                      visivel={mostrarSenha}
                      alternarVisibilidade={() => setMostrarSenha((v) => !v)}
                    />
                    {senha.length > 0 && <ForcaSenha senha={senha} />}
                    <Turnstile key={captchaNonce} onToken={setCaptchaToken} />
                    <Button type="submit" className="w-full" disabled={carregando}>
                      {carregando && <Loader2 className="size-4 animate-spin" />} Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={entrarComGoogle}>
                Continuar com Google
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
