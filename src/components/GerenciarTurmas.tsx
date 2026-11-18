import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Turma = { id: string; nome: string; escola: string | null; profiles: { id: string; nome: string }[] };

export function GerenciarTurmas({ turmas }: { turmas: Turma[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [escola, setEscola] = useState("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: ["professor-turmas"] });
    void qc.invalidateQueries({ queryKey: ["professor-correcoes"] });
  };

  async function criarTurma(e: React.FormEvent) {
    e.preventDefault();
    if (!user || nome.trim().length < 2) return;
    const { error } = await supabase.from("turmas").insert({ nome: nome.trim(), escola: escola.trim() || null, professor_id: user.id });
    if (error) { toast.error("Não foi possível criar a turma."); return; }
    toast.success("Turma criada.");
    setNome(""); setEscola(""); atualizar();
  }

  async function vincular(turmaId: string) {
    const email = emails[turmaId]?.trim();
    if (!email) return;
    const { data, error } = await supabase.rpc("professor_vincular_aluno", { _email: email, _turma_id: turmaId });
    if (error) { toast.error(error.message); return; }
    toast.success(`${data || "Aluno"} adicionado à turma.`);
    setEmails({ ...emails, [turmaId]: "" }); atualizar();
  }

  async function remover(alunoId: string) {
    const { error } = await supabase.rpc("professor_remover_aluno", { _aluno_id: alunoId });
    if (error) { toast.error(error.message); return; }
    toast.success("Aluno removido da turma."); atualizar();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={criarTurma} className="card-soft grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Nome da turma (ex.: 3º A)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input placeholder="Escola (opcional)" value={escola} onChange={(e) => setEscola(e.target.value)} />
        <Button type="submit">Criar turma</Button>
      </form>
      {turmas.length === 0 && <p className="text-sm text-muted-foreground">Crie sua primeira turma acima.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {turmas.map((t) => (
          <div key={t.id} className="card-soft p-5">
            <h3 className="font-semibold">{t.nome}</h3>
            <p className="text-sm text-muted-foreground">{t.escola || "Escola não informada"}</p>
            <div className="mt-4 flex gap-2">
              <Input type="email" placeholder="E-mail da conta do aluno" value={emails[t.id] ?? ""} onChange={(e) => setEmails({ ...emails, [t.id]: e.target.value })} />
              <Button type="button" onClick={() => void vincular(t.id)}><UserPlus className="size-4" /> Adicionar</Button>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {t.profiles.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  {a.nome || "Aluno"}
                  <Button size="sm" variant="ghost" onClick={() => void remover(a.id)} aria-label="Remover aluno"><X className="size-4" /></Button>
                </li>
              ))}
            </ul>
            {t.profiles.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nenhum aluno ainda.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
