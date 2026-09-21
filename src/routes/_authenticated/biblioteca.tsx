import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, Plus, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Conhecimentos — EscreveAI" },
      {
        name: "description",
        content: "Slides e vídeos de apoio publicados pelo professor e pelos próprios alunos.",
      },
      { property: "og:title", content: "Biblioteca de Conhecimentos — EscreveAI" },
      {
        property: "og:description",
        content: "Materiais de apoio para dominar as 5 competências do ENEM.",
      },
    ],
  }),
  component: Biblioteca,
});

function Biblioteca() {
  const { user, perfil, isProfessor } = useAuth();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [tema, setTema] = useState("");
  const [tipo, setTipo] = useState<"video" | "slide">("video");

  const { data } = useQuery({
    queryKey: ["biblioteca"],
    queryFn: async () => {
      const { data } = await supabase
        .from("biblioteca")
        .select("id, titulo, descricao, tipo, url, tema, autor_nome")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const publicar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("biblioteca").insert({
        titulo,
        url,
        tema: tema || null,
        tipo,
        autor_id: user!.id,
        autor_nome: perfil?.nome ?? "Aluno",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Material publicado na biblioteca!");
      setTitulo("");
      setUrl("");
      setTema("");
      setAberto(false);
      void queryClient.invalidateQueries({ queryKey: ["biblioteca"] });
    },
    onError: () => toast.error("Não foi possível publicar este material."),
  });

  return (
    <AppShell titulo="Conhecimentos" descricao="Slides e vídeos para estudar antes de escrever">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isProfessor
            ? "Publique slides e vídeos para suas turmas."
            : "Você também pode compartilhar vídeos com a turma."}
        </p>
        <Button size="sm" variant={aberto ? "secondary" : "default"} onClick={() => setAberto(!aberto)}>
          <Plus className="size-4" /> Adicionar material
        </Button>
      </div>

      {aberto && (
        <div className="card-soft mb-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Link (YouTube, Drive, slides...)</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tema">Tema ou competência</Label>
              <Input id="tema" value={tema} onChange={(e) => setTema(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipo === "video" ? "default" : "outline"}
                  onClick={() => setTipo("video")}
                >
                  <Video className="size-4" /> Vídeo
                </Button>
                <Button
                  type="button"
                  variant={tipo === "slide" ? "default" : "outline"}
                  onClick={() => setTipo("slide")}
                >
                  <FileText className="size-4" /> Slides
                </Button>
              </div>
            </div>
          </div>
          <Button
            className="mt-4"
            disabled={!titulo || !url || publicar.isPending}
            onClick={() => publicar.mutate()}
          >
            Publicar material
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((m) => (
          <a
            key={m.id}
            href={m.url}
            target="_blank"
            rel="noreferrer noopener"
            className="card-soft flex flex-col p-5 transition-shadow hover:shadow-lift"
          >
            {m.tipo === "video" ? (
              <Video className="size-5 text-primary" />
            ) : (
              <FileText className="size-5 text-accent-foreground" />
            )}
            <p className="mt-3 font-semibold leading-snug">{m.titulo}</p>
            {m.descricao && (
              <p className="mt-1 text-sm text-muted-foreground">{m.descricao}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {m.tema && <Badge variant="secondary">{m.tema}</Badge>}
              <span>por {m.autor_nome ?? "Equipe"}</span>
              <ExternalLink className="size-3" />
            </div>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
