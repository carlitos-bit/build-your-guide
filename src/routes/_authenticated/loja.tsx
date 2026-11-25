import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Coins, Gift, History, Package, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { enviarArquivo, removerArquivo, urlsAssinadas } from "@/lib/arquivos";

export const Route = createFileRoute("/_authenticated/loja")({
  head: () => ({
    meta: [
      { title: "Loja de CASH — EscreveAI" },
      { name: "description", content: "Troque o CASH conquistado nas redações por recompensas." },
      { property: "og:title", content: "Loja de CASH — EscreveAI" },
      { property: "og:description", content: "Recompensas escolares, exclusivas e brindes para quem escreve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Loja,
});

export const CATEGORIAS_LOJA = ["Recompensas escolares", "Recompensas exclusivas", "Recompensas de experiência", "Recompensas físicas"];
type Produto = { id: string; nome: string; descricao: string | null; categoria: string | null; imagem_path: string | null; preco: number; estoque: number; ativo: boolean };
type Compra = { id: string; aluno_id: string; produto_nome: string; preco_unitario: number; quantidade: number; total: number; created_at: string };

function Loja() {
  const { user, isProfessor, isAdmin } = useAuth();
  const gestor = isProfessor || isAdmin;
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["loja", user?.id, gestor],
    enabled: !!user,
    queryFn: async () => {
      const [p, c, g] = await Promise.all([
        supabase.from("loja_produtos").select("id, nome, descricao, categoria, imagem_path, preco, estoque, ativo").order("preco"),
        supabase.from("loja_compras").select("id, aluno_id, produto_nome, preco_unitario, quantidade, total, created_at").order("created_at", { ascending: false }),
        gestor ? Promise.resolve({ data: null }) : supabase.from("perfil_gamificacao").select("cash_atual").eq("aluno_id", user!.id).maybeSingle(),
      ]);
      const produtos = (p.data ?? []) as Produto[];
      const compras = (c.data ?? []) as Compra[];
      const nomes: Record<string, string> = {};
      if (gestor) {
        const ids = [...new Set(compras.map((x) => x.aluno_id))];
        if (ids.length) {
          const { data: pf } = await supabase.from("profiles").select("id, nome, email").in("id", ids);
          for (const x of pf ?? []) nomes[x.id] = x.nome || x.email || "Aluno";
        }
      }
      return { produtos, compras, nomes, saldo: g.data?.cash_atual ?? 0, imagens: await urlsAssinadas(produtos.map((x) => x.imagem_path)) };
    },
  });

  useEffect(() => {
    const canal = supabase.channel(`loja-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "loja_produtos" }, () => void qc.invalidateQueries({ queryKey: ["loja"] }))
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [qc]);

  return (
    <AppShell titulo="Loja de CASH" descricao={gestor ? "Gerencie recompensas e acompanhe as compras" : "Troque seu CASH por recompensas"}>
      {gestor ? <PainelGestor data={data} /> : <VitrineAluno data={data} />}
    </AppShell>
  );
}

type Dados = { produtos: Produto[]; compras: Compra[]; nomes: Record<string, string>; saldo: number; imagens: Record<string, string> } | undefined;

function CardProduto({ p, img, children }: { p: Produto; img: string | undefined; children: React.ReactNode }) {
  return (
    <div className="card-soft flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <div className="grid h-36 place-items-center bg-accent/40">
        {img ? <img src={img} alt={p.nome} className="h-full w-full object-cover" /> : <Gift className="size-10 text-primary" />}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-snug">{p.nome}</p>
          <span className="flex shrink-0 items-center gap-1 font-display font-bold text-cash"><Coins className="size-4" />{p.preco}</span>
        </div>
        {p.descricao && <p className="mt-1 text-sm text-muted-foreground">{p.descricao}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{p.estoque > 0 ? `${p.estoque} disponíveis` : "Esgotado"}</p>
        <div className="mt-auto pt-3">{children}</div>
      </div>
    </div>
  );
}

function VitrineAluno({ data }: { data: Dados }) {
  const qc = useQueryClient();
  const [escolhido, setEscolhido] = useState<Produto | null>(null);
  const [comprando, setComprando] = useState(false);
  const trava = useRef(false);
  const saldo = data?.saldo ?? 0;
  const produtos = (data?.produtos ?? []).filter((p) => p.ativo);

  async function confirmar() {
    if (!escolhido || trava.current) return;
    trava.current = true; setComprando(true);
    const { error } = await supabase.rpc("comprar_produto", { _produto_id: escolhido.id, _quantidade: 1 });
    trava.current = false; setComprando(false); setEscolhido(null);
    if (error) return toast.error(error.message || "Não foi possível concluir a compra.");
    toast.success(`Compra confirmada: ${escolhido.nome}! -${escolhido.preco} CASH`);
    void qc.invalidateQueries({ queryKey: ["loja"] });
    void qc.invalidateQueries({ queryKey: ["perfil-gamificacao"] });
  }

  return (
    <>
      <div className="card-soft bg-hero mb-6 flex items-center justify-between gap-4 p-6 text-ink-foreground">
        <div>
          <p className="text-sm text-ink-foreground/70">Seu saldo</p>
          <p className="nota-grande flex items-center gap-2 text-4xl"><Coins className="size-8 text-cash" />{saldo}</p>
        </div>
        <ShoppingBag className="size-12 text-cash" />
      </div>
      <Tabs defaultValue="vitrine">
        <TabsList><TabsTrigger value="vitrine">Recompensas</TabsTrigger><TabsTrigger value="meus">Meus resgates ({data?.compras.length ?? 0})</TabsTrigger></TabsList>
        <TabsContent value="vitrine" className="mt-4 space-y-8">
          {[...CATEGORIAS_LOJA, "Outros"].map((cat) => {
            const itens = produtos.filter((p) => (CATEGORIAS_LOJA.includes(p.categoria ?? "") ? p.categoria : "Outros") === cat);
            if (!itens.length) return null;
            return (
              <section key={cat}>
                <h2 className="mb-3 font-display text-lg font-semibold">{cat}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {itens.map((p) => (
                    <CardProduto key={p.id} p={p} img={p.imagem_path ? data?.imagens[p.imagem_path] : undefined}>
                      <Button className="w-full" disabled={p.estoque < 1 || saldo < p.preco} onClick={() => setEscolhido(p)}>
                        {p.estoque < 1 ? "Esgotado" : saldo < p.preco ? `Faltam ${p.preco - saldo} CASH` : "Resgatar"}
                      </Button>
                    </CardProduto>
                  ))}
                </div>
              </section>
            );
          })}
          {produtos.length === 0 && <div className="card-soft p-10 text-center text-sm text-muted-foreground">A loja ainda não tem recompensas.</div>}
        </TabsContent>
        <TabsContent value="meus" className="mt-4"><HistoricoCompras compras={data?.compras ?? []} /></TabsContent>
      </Tabs>
      <AlertDialog open={!!escolhido} onOpenChange={(v) => !v && !comprando && setEscolhido(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resgatar {escolhido?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>Serão descontados {escolhido?.preco} CASH. Seu saldo ficará em {saldo - (escolhido?.preco ?? 0)} CASH.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={comprando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={comprando} onClick={(e) => { e.preventDefault(); void confirmar(); }}>{comprando ? "Processando..." : "Confirmar compra"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function HistoricoCompras({ compras, nomes }: { compras: Compra[]; nomes?: Record<string, string> }) {
  if (!compras.length) return <div className="card-soft p-10 text-center text-sm text-muted-foreground"><History className="mx-auto mb-2 size-6" />Nenhuma compra ainda.</div>;
  return (
    <div className="card-soft divide-y divide-border">
      {compras.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <div>
            <p className="font-medium">{c.produto_nome} {c.quantidade > 1 && `×${c.quantidade}`}</p>
            <p className="text-xs text-muted-foreground">{nomes ? `${nomes[c.aluno_id] ?? "Aluno"} • ` : ""}{new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
          </div>
          <span className="flex items-center gap-1 font-semibold text-cash"><Coins className="size-4" />-{c.total}</span>
        </div>
      ))}
    </div>
  );
}

const vazio = { nome: "", descricao: "", categoria: CATEGORIAS_LOJA[0]!, preco: 100, estoque: 10, ativo: true };

function PainelGestor({ data }: { data: Dados }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [f, setF] = useState(vazio);
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aluno, setAluno] = useState("");
  const atualizar = () => void qc.invalidateQueries({ queryKey: ["loja"] });

  function abrir(p: Produto | null) {
    setEditando(p); setImagem(null); setAberto(true);
    setF(p ? { nome: p.nome, descricao: p.descricao ?? "", categoria: p.categoria ?? CATEGORIAS_LOJA[0]!, preco: p.preco, estoque: p.estoque, ativo: p.ativo } : vazio);
  }
  async function salvar() {
    if (!f.nome.trim() || f.preco < 0 || f.estoque < 0) return toast.error("Preencha nome, preço e estoque válidos.");
    setSalvando(true);
    try {
      let imagem_path = editando?.imagem_path ?? null;
      if (imagem) { imagem_path = await enviarArquivo("loja", imagem); await removerArquivo(editando?.imagem_path); }
      const dados = { nome: f.nome.trim(), descricao: f.descricao.trim() || null, categoria: f.categoria, preco: f.preco, estoque: f.estoque, ativo: f.ativo, imagem_path };
      const { error } = editando ? await supabase.from("loja_produtos").update(dados).eq("id", editando.id) : await supabase.from("loja_produtos").insert({ ...dados, criado_por: user!.id });
      if (error) throw error;
      toast.success(editando ? "Produto atualizado." : "Produto cadastrado."); setAberto(false); atualizar();
    } catch { toast.error("Não foi possível salvar o produto."); } finally { setSalvando(false); }
  }
  async function excluir(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"? O histórico de compras é mantido.`)) return;
    const { error } = await supabase.from("loja_produtos").delete().eq("id", p.id);
    if (error) return toast.error("Não foi possível excluir.");
    await removerArquivo(p.imagem_path); toast.success("Produto excluído."); atualizar();
  }
  async function alternar(p: Produto, ativo: boolean) {
    await supabase.from("loja_produtos").update({ ativo }).eq("id", p.id); atualizar();
  }

  const compras = (data?.compras ?? []).filter((c) => !aluno || c.aluno_id === aluno);
  const totalCash = (data?.compras ?? []).reduce((a, c) => a + c.total, 0);

  return (
    <Tabs defaultValue="produtos">
      <TabsList><TabsTrigger value="produtos">Produtos</TabsTrigger><TabsTrigger value="compras">Compras dos alunos</TabsTrigger></TabsList>
      <TabsContent value="produtos" className="mt-4">
        <div className="mb-4 flex justify-end"><Button size="sm" onClick={() => abrir(null)}><Plus className="size-4" /> Novo produto</Button></div>
        {aberto && (
          <div className="card-soft mb-6 grid gap-3 p-5 md:grid-cols-2">
            <h2 className="font-display text-base font-semibold md:col-span-2">{editando ? "Editar produto" : "Novo produto"}</h2>
            <Input placeholder="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              {CATEGORIAS_LOJA.map((c) => <option key={c}>{c}</option>)}
            </select>
            <Textarea className="md:col-span-2" placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
            <label className="text-sm">Preço (CASH)<Input type="number" min={0} value={f.preco} onChange={(e) => setF({ ...f, preco: Number(e.target.value) })} /></label>
            <label className="text-sm">Estoque<Input type="number" min={0} value={f.estoque} onChange={(e) => setF({ ...f, estoque: Number(e.target.value) })} /></label>
            <label className="text-sm">Imagem<Input type="file" accept="image/*" onChange={(e) => setImagem(e.target.files?.[0] ?? null)} /></label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /> Visível na loja</label>
            <div className="flex gap-2 md:col-span-2">
              <Button className="flex-1" disabled={salvando} onClick={() => void salvar()}>{salvando ? "Salvando..." : "Salvar produto"}</Button>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.produtos ?? []).map((p) => (
            <CardProduto key={p.id} p={p} img={p.imagem_path ? data?.imagens[p.imagem_path] : undefined}>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs"><Switch checked={p.ativo} onCheckedChange={(v) => void alternar(p, v)} />{p.ativo ? "Ativo" : "Desativado"}</label>
                <div>
                  <Button size="sm" variant="ghost" aria-label="Editar" onClick={() => abrir(p)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => void excluir(p)}><Trash2 className="size-4 text-danger" /></Button>
                </div>
              </div>
              {p.categoria && <Badge variant="secondary" className="mt-2">{p.categoria}</Badge>}
            </CardProduto>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="compras" className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-soft p-5"><Package className="size-4 text-primary" /><p className="nota-grande mt-2 text-2xl">{data?.compras.length ?? 0}</p><p className="text-sm text-muted-foreground">Compras</p></div>
          <div className="card-soft p-5"><Coins className="size-4 text-cash" /><p className="nota-grande mt-2 text-2xl">{totalCash}</p><p className="text-sm text-muted-foreground">CASH utilizado</p></div>
          <div className="card-soft p-5">
            <p className="text-sm font-semibold">Filtrar por aluno</p>
            <select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={aluno} onChange={(e) => setAluno(e.target.value)}>
              <option value="">Todos os alunos</option>
              {Object.entries(data?.nomes ?? {}).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </div>
        </div>
        <HistoricoCompras compras={compras} nomes={data?.nomes ?? {}} />
      </TabsContent>
    </Tabs>
  );
}
