import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Coins, MapPin, Pencil, Timer, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enviarArquivo, removerArquivo, urlsAssinadas } from "@/lib/arquivos";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos e simulados — EscreveAI" },
      { name: "description", content: "Eventos de redação e simulados com inscrição e bônus de CASH." },
      { property: "og:title", content: "Eventos e simulados — EscreveAI" },
      { property: "og:description", content: "Inscreva-se nos eventos de redação da sua turma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Eventos,
});

type Evento = {
  id: string; titulo: string; tema_titulo: string; descricao: string | null; local: string | null;
  imagem_path: string | null; inicia_em: string; duracao_min: number; bonus_cash: number;
};
const vazio = { titulo: "", tema: "", descricao: "", local: "", inicio: "", duracao: 90, bonus: 200 };

function paraLocal(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function FormEvento({ editando, aoTerminar }: { editando: Evento | null; aoTerminar: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState(vazio);
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    setF(editando ? { titulo: editando.titulo, tema: editando.tema_titulo, descricao: editando.descricao ?? "", local: editando.local ?? "", inicio: paraLocal(editando.inicia_em), duracao: editando.duracao_min, bonus: editando.bonus_cash } : vazio);
    setImagem(null);
  }, [editando]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !f.titulo.trim() || !f.tema.trim() || !f.inicio) return toast.error("Preencha título, tema e data.");
    setSalvando(true);
    try {
      let imagem_path = editando?.imagem_path ?? null;
      if (imagem) {
        imagem_path = await enviarArquivo("eventos", imagem);
        await removerArquivo(editando?.imagem_path);
      }
      const dados = { titulo: f.titulo.trim(), tema_titulo: f.tema.trim(), descricao: f.descricao.trim() || null, local: f.local.trim() || null, imagem_path, inicia_em: new Date(f.inicio).toISOString(), duracao_min: f.duracao, bonus_cash: f.bonus };
      const { error } = editando
        ? await supabase.from("eventos").update(dados).eq("id", editando.id)
        : await supabase.from("eventos").insert({ ...dados, criado_por: user.id });
      if (error) throw error;
      toast.success(editando ? "Evento atualizado." : "Evento publicado para os alunos.");
      setF(vazio); setImagem(null); aoTerminar();
      void qc.invalidateQueries({ queryKey: ["eventos"] });
    } catch {
      toast.error("Não foi possível salvar o evento.");
    } finally { setSalvando(false); }
  }
  return (
    <form onSubmit={enviar} className="card-soft mb-6 grid gap-3 p-5 md:grid-cols-2">
      <h2 className="font-display text-base font-semibold md:col-span-2">{editando ? "Editar evento" : "Publicar evento de redação"}</h2>
      <Input placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      <Input placeholder="Tema da redação" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
      <Textarea className="md:col-span-2" placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
      <Input placeholder="Local (sala, auditório ou online)" value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} />
      <label className="text-sm">Data e horário<Input type="datetime-local" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} /></label>
      <label className="text-sm">Duração (min)<Input type="number" min={10} value={f.duracao} onChange={(e) => setF({ ...f, duracao: Number(e.target.value) })} /></label>
      <label className="text-sm">Bônus CASH<Input type="number" min={0} value={f.bonus} onChange={(e) => setF({ ...f, bonus: Number(e.target.value) })} /></label>
      <label className="text-sm md:col-span-2">Imagem do evento<Input type="file" accept="image/*" onChange={(e) => setImagem(e.target.files?.[0] ?? null)} /></label>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={salvando} className="flex-1">{editando ? "Salvar alterações" : "Publicar evento"}</Button>
        {editando && <Button type="button" variant="outline" onClick={aoTerminar}>Cancelar</Button>}
      </div>
    </form>
  );
}

function Eventos() {
  const { user, isProfessor, isAdmin } = useAuth();
  const gestor = isProfessor || isAdmin;
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Evento | null>(null);
  const [inscritosDe, setInscritosDe] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const [ev, insc] = await Promise.all([
        supabase.from("eventos").select("id, titulo, tema_titulo, descricao, local, imagem_path, inicia_em, duracao_min, bonus_cash").order("inicia_em"),
        supabase.from("evento_inscricoes").select("id, evento_id, aluno_id, status"),
      ]);
      const eventos = (ev.data ?? []) as Evento[];
      const inscricoes = insc.data ?? [];
      const ids = [...new Set(inscricoes.map((i) => i.aluno_id))];
      const nomes: Record<string, string> = {};
      if (gestor && ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, nome, email").in("id", ids);
        for (const x of p ?? []) nomes[x.id] = x.nome || x.email || "Aluno";
      }
      const imagens = await urlsAssinadas(eventos.map((e) => e.imagem_path));
      return { eventos, inscricoes, nomes, imagens };
    },
  });

  useEffect(() => {
    const canal = supabase.channel(`inscricoes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "evento_inscricoes" }, () => void qc.invalidateQueries({ queryKey: ["eventos"] }))
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [qc]);

  const atualizar = () => void qc.invalidateQueries({ queryKey: ["eventos"] });
  async function inscrever(id: string) {
    const { error } = await supabase.from("evento_inscricoes").insert({ evento_id: id, aluno_id: user!.id });
    error ? toast.error("Não foi possível se inscrever.") : toast.success("Inscrição confirmada!");
    atualizar();
  }
  async function sair(inscId: string) {
    await supabase.from("evento_inscricoes").delete().eq("id", inscId);
    toast.success("Inscrição cancelada."); atualizar();
  }
  async function excluir(e: Evento) {
    if (!confirm(`Excluir o evento "${e.titulo}"?`)) return;
    const { error } = await supabase.from("eventos").delete().eq("id", e.id);
    if (error) return toast.error("Não foi possível excluir.");
    await removerArquivo(e.imagem_path);
    toast.success("Evento excluído."); atualizar();
  }
  async function marcar(inscId: string, status: string) {
    await supabase.from("evento_inscricoes").update({ status }).eq("id", inscId); atualizar();
  }

  const agora = Date.now();
  return (
    <AppShell titulo="Eventos" descricao={gestor ? "Crie e gerencie os eventos das suas turmas" : "Eventos e simulados disponíveis"}>
      {gestor && <FormEvento editando={editando} aoTerminar={() => setEditando(null)} />}
      <div className="grid gap-4 md:grid-cols-2">
        {(data?.eventos ?? []).map((e) => {
          const inicio = new Date(e.inicia_em);
          const futuro = inicio.getTime() > agora;
          const insc = (data?.inscricoes ?? []).filter((i) => i.evento_id === e.id);
          const minha = insc.find((i) => i.aluno_id === user?.id);
          const img = e.imagem_path ? data?.imagens[e.imagem_path] : undefined;
          return (
            <div key={e.id} className="card-soft overflow-hidden">
              {img && <img src={img} alt={e.titulo} className="h-40 w-full object-cover" />}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">{e.titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{e.tema_titulo}</p>
                  </div>
                  <Badge variant={futuro ? "default" : "secondary"}>{futuro ? "Agendado" : "Encerrado"}</Badge>
                </div>
                {e.descricao && <p className="mt-3 text-sm">{e.descricao}</p>}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CalendarClock className="size-4" />{inicio.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span className="flex items-center gap-1.5"><Timer className="size-4" />{e.duracao_min} min</span>
                  {e.local && <span className="flex items-center gap-1.5"><MapPin className="size-4" />{e.local}</span>}
                  <span className="flex items-center gap-1.5"><Coins className="size-4 text-cash" />+{e.bonus_cash} CASH</span>
                  <span className="flex items-center gap-1.5"><Users className="size-4" />{insc.length} inscritos</span>
                </div>

                {gestor ? (
                  <>
                    <div className="mt-5 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditando(e); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="size-4" /> Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => setInscritosDe(inscritosDe === e.id ? null : e.id)}><Users className="size-4" /> Inscritos</Button>
                      <Button size="sm" variant="ghost" aria-label="Excluir evento" onClick={() => void excluir(e)}><Trash2 className="size-4 text-danger" /></Button>
                    </div>
                    {inscritosDe === e.id && (
                      <div className="mt-4 divide-y divide-border rounded-md border border-border">
                        {insc.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum aluno inscrito ainda.</p>}
                        {insc.map((i) => (
                          <div key={i.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                            <span>{data?.nomes[i.aluno_id] ?? "Aluno"}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={i.status === "presente" ? "default" : "secondary"}>{i.status}</Badge>
                              <Button size="sm" variant="outline" onClick={() => void marcar(i.id, i.status === "presente" ? "inscrito" : "presente")}>{i.status === "presente" ? "Desmarcar" : "Marcar presença"}</Button>
                              <Button size="sm" variant="ghost" aria-label="Remover aluno" onClick={() => void sair(i.id)}><Trash2 className="size-4 text-danger" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-5 flex gap-2">
                    {minha ? (
                      <Button variant="outline" className="flex-1" disabled={!futuro} onClick={() => void sair(minha.id)}>Cancelar inscrição</Button>
                    ) : (
                      <Button className="flex-1" disabled={!futuro} onClick={() => void inscrever(e.id)}>Inscrever-se</Button>
                    )}
                    {minha && <Button asChild variant="secondary"><Link to="/nova-redacao">Escrever</Link></Button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {(data?.eventos ?? []).length === 0 && (
        <div className="card-soft p-10 text-center">
          <CalendarClock className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-semibold">Nenhum evento agendado</p>
        </div>
      )}
    </AppShell>
  );
}
