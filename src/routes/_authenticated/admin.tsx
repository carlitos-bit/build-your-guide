import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — EscreveAI" },
      { name: "description", content: "Gerencie alunos, professores e a biblioteca da plataforma." },
      { property: "og:title", content: "Administração — EscreveAI" },
      { property: "og:description", content: "Painel administrativo do EscreveAI." },
    ],
  }),
  component: Admin,
});

type ConfigBiblioteca = {
  alunos_podem_publicar: boolean;
  moderacao_previa: boolean;
};

function Admin() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");

  const { data } = useQuery({
    queryKey: ["admin"],
    enabled: isAdmin,
    queryFn: async () => {
      const [perfis, papeis, redacoes, biblioteca, config] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, perfil, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("redacoes").select("aluno_id, correcoes(nota_total)"),
        supabase
          .from("biblioteca")
          .select("id, titulo, tipo, autor_nome, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("configuracoes").select("valor").eq("chave", "biblioteca").maybeSingle(),
      ]);
      return {
        perfis: perfis.data ?? [],
        papeis: papeis.data ?? [],
        redacoes: redacoes.data ?? [],
        biblioteca: biblioteca.data ?? [],
        config: (config.data?.valor ?? {}) as Partial<ConfigBiblioteca>,
      };
    },
  });

  const usuarios = useMemo(() => {
    const termo = busca.toLowerCase();
    return (data?.perfis ?? [])
      .map((p) => {
        const minhas = (data?.redacoes ?? []).filter((r) => r.aluno_id === p.id);
        const notas = minhas
          .map((r) => (Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes)?.nota_total)
          .filter((n): n is number => typeof n === "number");
        return {
          ...p,
          admin: (data?.papeis ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
          total: minhas.length,
          media: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null,
        };
      })
      .filter((u) => !termo || u.nome.toLowerCase().includes(termo) || (u.email ?? "").includes(termo));
  }, [data, busca]);

  const definirPapel = useMutation({
    mutationFn: async (v: { id: string; papel: "aluno" | "professor" | "admin"; ativo: boolean }) => {
      const { error } = await supabase.rpc("admin_definir_papel" as never, {
        _user_id: v.id,
        _papel: v.papel,
        _ativo: v.ativo,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível alterar."),
  });

  const salvarConfig = useMutation({
    mutationFn: async (valor: ConfigBiblioteca) => {
      const { error } = await supabase
        .from("configuracoes" as never)
        .upsert({ chave: "biblioteca", valor, updated_at: new Date().toISOString() } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações da biblioteca salvas.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
      void qc.invalidateQueries({ queryKey: ["config-biblioteca"] });
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const removerMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("biblioteca").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Material removido.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (!isAdmin) {
    return (
      <AppShell titulo="Administração">
        <div className="card-soft p-8 text-center">
          <p className="font-display text-lg font-semibold">Acesso restrito</p>
          <p className="mt-1 text-sm text-muted-foreground">Área exclusiva para administradores.</p>
        </div>
      </AppShell>
    );
  }

  const config: ConfigBiblioteca = {
    alunos_podem_publicar: data?.config.alunos_podem_publicar ?? true,
    moderacao_previa: data?.config.moderacao_previa ?? false,
  };
  const pendentes = (data?.perfis ?? []).filter((p) => p.perfil === "professor_pendente").length;
  const totalAlunos = (data?.perfis ?? []).filter(
    (p) => p.perfil !== "professor" && p.perfil !== "professor_pendente",
  ).length;
  const totalProf = (data?.perfis ?? []).filter((p) => p.perfil === "professor").length;

  const stats = [
    { label: "Alunos", valor: totalAlunos, icon: Users },
    { label: "Professores", valor: totalProf, icon: GraduationCap },
    ...(pendentes > 0
      ? [{ label: "Pedidos de professor", valor: pendentes, icon: ShieldCheck }]
      : []),
    { label: "Redações enviadas", valor: data?.redacoes.length ?? 0, icon: ShieldCheck },
    { label: "Materiais na biblioteca", valor: data?.biblioteca.length ?? 0, icon: BookOpen },
  ];

  return (
    <AppShell titulo="Administração" descricao="Usuários, permissões e configurações da plataforma">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, valor, icon: Icon }) => (
          <div key={label} className="card-soft p-5">
            <Icon className="size-4 text-primary" />
            <p className="mt-2 nota-grande text-2xl">{valor}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="usuarios" className="mt-6">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <div className="card-soft p-5">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="pl-9"
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="text-right">Redações</TableHead>
                    <TableHead className="text-right">Média</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">{u.nome}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell>
                        {u.perfil === "professor" ? (
                          <Badge variant="default">Professor</Badge>
                        ) : u.perfil === "professor_pendente" ? (
                          <Badge variant="outline" className="border-warning text-warning">
                            Professor (pendente)
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Aluno</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{u.total}</TableCell>
                      <TableCell className="text-right">{u.media ?? "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={u.admin}
                          disabled={u.id === user?.id || definirPapel.isPending}
                          onCheckedChange={(v) =>
                            definirPapel.mutate({ id: u.id, papel: "admin", ativo: v })
                          }
                          aria-label={`Admin ${u.nome}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={definirPapel.isPending}
                          onClick={() =>
                            definirPapel.mutate({
                              id: u.id,
                              papel: u.perfil === "professor" ? "aluno" : "professor",
                              ativo: true,
                            })
                          }
                        >
                          Tornar {u.perfil === "professor" ? "aluno" : "professor"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="biblioteca" className="mt-4 space-y-4">
          <div className="card-soft divide-y divide-border p-5">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="font-semibold">Alunos podem publicar materiais</p>
                <p className="text-sm text-muted-foreground">
                  Quando desligado, só professores e admins adicionam conteúdo.
                </p>
              </div>
              <Switch
                checked={config.alunos_podem_publicar}
                onCheckedChange={(v) => salvarConfig.mutate({ ...config, alunos_podem_publicar: v })}
              />
            </div>
          </div>

          <div className="card-soft p-5">
            <h2 className="font-display text-base font-semibold">Materiais publicados</h2>
            <div className="mt-3 divide-y divide-border">
              {(data?.biblioteca ?? []).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.tipo} • {m.autor_nome ?? "—"} •{" "}
                      {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover material"
                    onClick={() => removerMaterial.mutate(m.id)}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
