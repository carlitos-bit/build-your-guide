import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, FileText, Paperclip, Pencil, Plus, Trash2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { enviarArquivo, removerArquivo, urlsAssinadas } from "@/lib/arquivos";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Materiais de apoio — EscreveAI" },
      { name: "description", content: "PDFs, slides, vídeos e redações exemplo publicados pelos professores." },
      { property: "og:title", content: "Materiais de apoio — EscreveAI" },
      { property: "og:description", content: "Materiais para dominar as 5 competências do ENEM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Biblioteca,
});

type Material = {
  id: string; titulo: string; descricao: string | null; tipo: string; url: string | null; tema: string | null;
  categoria: string | null; turma_id: string | null; arquivo_path: string | null; arquivo_nome: string | null;
  autor_nome: string | null; created_at: string;
};
const ACEITOS = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*";
const vazio = { titulo: "", descricao: "", url: "", categoria: "", turma_id: "", tipo: "arquivo" };

function Biblioteca() {
  const { user, perfil, isProfessor, isAdmin } = useAuth();
  const gestor = isProfessor || isAdmin;
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Material | null>(null);
  const [f, setF] = useState(vazio);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("");

  const { data } = useQuery({
    queryKey: ["biblioteca"],
    queryFn: async () => {
      const [m, t] = await Promise.all([
        supabase.from("biblioteca").select("id, titulo, descricao, tipo, url, tema, categoria, turma_id, arquivo_path, arquivo_nome, autor_nome, created_at").order("created_at", { ascending: false }),
        supabase.from("turmas").select("id, nome"),
      ]);
      const materiais = (m.data ?? []) as Material[];
      return { materiais, turmas: t.data ?? [], links: await urlsAssinadas(materiais.map((x) => x.arquivo_path)) };
    },
  });

  function abrir(m: Material | null) {
    setEditando(m); setArquivo(null); setRemoverAnexo(false); setAberto(true);
    setF(m ? { titulo: m.titulo, descricao: m.descricao ?? "", url: m.url ?? "", categoria: m.categoria ?? m.tema ?? "", turma_id: m.turma_id ?? "", tipo: m.tipo } : vazio);
  }

  async function salvar() {
    if (!user || !f.titulo.trim()) return toast.error("Informe o título.");
    const temAnexo = arquivo || (editando?.arquivo_path && !removerAnexo);
    if (!temAnexo && !f.url.trim()) return toast.error("Anexe um arquivo ou informe um link.");
    setSalvando(true);
    try {
      let arquivo_path = removerAnexo ? null : editando?.arquivo_path ?? null;
      let arquivo_nome = removerAnexo ? null : editando?.arquivo_nome ?? null;
      if (arquivo) { arquivo_path = await enviarArquivo("materiais", arquivo); arquivo_nome = arquivo.name; }
      if ((arquivo || removerAnexo) && editando?.arquivo_path) await removerArquivo(editando.arquivo_path);
      const dados = { titulo: f.titulo.trim(), descricao: f.descricao.trim() || null, url: f.url.trim() || null, categoria: f.categoria.trim() || null, tema: f.categoria.trim() || null, turma_id: f.turma_id || null, tipo: f.tipo, arquivo_path, arquivo_nome };
      const { error } = editando
        ? await supabase.from("biblioteca").update(dados).eq("id", editando.id)
        : await supabase.from("biblioteca").insert({ ...dados, autor_id: user.id, autor_nome: perfil?.nome ?? "Professor" });
      if (error) throw error;
      toast.success(editando ? "Material atualizado." : "Material publicado!");
      setAberto(false); setEditando(null);
      void qc.invalidateQueries({ queryKey: ["biblioteca"] });
    } catch { toast.error("Não foi possível salvar o material."); }
    finally { setSalvando(false); }
  }

  async function excluir(m: Material) {
    if (!confirm(`Excluir "${m.titulo}"?`)) return;
    const { error } = await supabase.from("biblioteca").delete().eq("id", m.id);
    if (error) return toast.error("Não foi possível excluir.");
    await removerArquivo(m.arquivo_path);
    toast.success("Material excluído.");
    void qc.invalidateQueries({ queryKey: ["biblioteca"] });
  }

  const categorias = [...new Set((data?.materiais ?? []).map((m) => m.categoria ?? m.tema).filter(Boolean))] as string[];
  const turmaNome = (id: string | null) => data?.turmas.find((t) => t.id === id)?.nome;
  const lista = (data?.materiais ?? []).filter((m) => !filtro || (m.categoria ?? m.tema) === filtro);

  return (
    <AppShell titulo={gestor ? "Materiais de apoio" : "Conhecimentos"} descricao={gestor ? "Publique arquivos, links e redações exemplo" : "Abra e baixe os materiais dos seus professores"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={filtro ? "outline" : "default"} onClick={() => setFiltro("")}>Todos</Button>
          {categorias.map((c) => <Button key={c} size="sm" variant={filtro === c ? "default" : "outline"} onClick={() => setFiltro(c)}>{c}</Button>)}
        </div>
        {gestor && <Button size="sm" onClick={() => abrir(null)}><Plus className="size-4" /> Adicionar material</Button>}
      </div>

      {gestor && aberto && (
        <div className="card-soft mb-6 grid gap-3 p-5 md:grid-cols-2">
          <h2 className="font-display text-base font-semibold md:col-span-2">{editando ? "Editar material" : "Novo material"}</h2>
          <Input placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          <Input placeholder="Disciplina ou categoria (ex.: Competência 2)" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            <option value="arquivo">Arquivo / documento</option><option value="video">Vídeo</option><option value="slide">Slides</option><option value="exemplo">Redação exemplo</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.turma_id} onChange={(e) => setF({ ...f, turma_id: e.target.value })}>
            <option value="">Todas as turmas</option>
            {(data?.turmas ?? []).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <Input className="md:col-span-2" placeholder="Link (opcional: YouTube, Drive...)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
          <div className="rounded-lg border-2 border-dashed border-border p-4 md:col-span-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4" /> Anexo (PDF, Word, PowerPoint, imagens — até 20 MB)</p>
            {editando?.arquivo_path && !removerAnexo && !arquivo && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>{editando.arquivo_nome}</span>
                <Button size="sm" variant="ghost" onClick={() => setRemoverAnexo(true)}><Trash2 className="size-4 text-danger" /> Remover</Button>
              </div>
            )}
            <Input className="mt-2" type="file" accept={ACEITOS} onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setRemoverAnexo(false); }} />
            {arquivo && <p className="mt-1 text-xs text-muted-foreground">{editando?.arquivo_path ? "Vai substituir o anexo atual: " : "Selecionado: "}{arquivo.name}</p>}
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button className="flex-1" disabled={salvando} onClick={() => void salvar()}>{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Publicar material"}</Button>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lista.map((m) => {
          const link = m.arquivo_path ? data?.links[m.arquivo_path] : undefined;
          return (
            <div key={m.id} className="card-soft flex flex-col p-5">
              {m.tipo === "video" ? <Video className="size-5 text-primary" /> : <FileText className="size-5 text-accent-foreground" />}
              <p className="mt-3 font-semibold leading-snug">{m.titulo}</p>
              {m.descricao && <p className="mt-1 text-sm text-muted-foreground">{m.descricao}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {m.tipo === "exemplo" && <Badge>Redação exemplo</Badge>}
                {(m.categoria ?? m.tema) && <Badge variant="secondary">{m.categoria ?? m.tema}</Badge>}
                {turmaNome(m.turma_id) && <Badge variant="outline">{turmaNome(m.turma_id)}</Badge>}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">por {m.autor_nome ?? "Equipe"} • {new Date(m.created_at).toLocaleDateString("pt-BR")}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {link && <Button asChild size="sm"><a href={link} target="_blank" rel="noreferrer noopener" download={m.arquivo_nome ?? undefined}><Download className="size-4" /> Baixar</a></Button>}
                {m.url && <Button asChild size="sm" variant="outline"><a href={m.url} target="_blank" rel="noreferrer noopener"><ExternalLink className="size-4" /> Abrir link</a></Button>}
                {gestor && <>
                  <Button size="sm" variant="ghost" aria-label="Editar" onClick={() => abrir(m)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => void excluir(m)}><Trash2 className="size-4 text-danger" /></Button>
                </>}
              </div>
            </div>
          );
        })}
      </div>
      {lista.length === 0 && <div className="card-soft p-10 text-center text-sm text-muted-foreground">Nenhum material publicado ainda.</div>}
    </AppShell>
  );
}
