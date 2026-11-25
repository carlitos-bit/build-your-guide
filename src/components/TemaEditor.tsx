import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TEMAS, atributosTema, normalizarTema, type TemaPerfil } from "@/lib/temas";

export function TemaEditor() {
  const { user, perfil, recarregarPerfil } = useAuth();
  const salvo = normalizarTema(perfil?.tema);
  const [t, setT] = useState<TemaPerfil>(salvo);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setT(normalizarTema(perfil?.tema)), [perfil?.tema]);
  const def = TEMAS.find((x) => x.id === t.id) ?? TEMAS[0];
  const mudou = JSON.stringify(t) !== JSON.stringify(salvo);
  const prev = atributosTema(t);

  async function aplicar() {
    if (!user) return;
    setSalvando(true);
    const { error } = await supabase.from("profiles").update({ tema: t }).eq("id", user.id);
    setSalvando(false);
    if (error) return toast.error("Não foi possível salvar o tema.");
    await recarregarPerfil();
    toast.success("Tema aplicado!");
  }

  return (
    <section className="card-soft mt-4 p-6">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold"><Palette className="size-4 text-primary" /> Personalize seu perfil</h2>
      <p className="text-sm text-muted-foreground">Só a sua área muda. Escolha, veja a prévia e aplique.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMAS.map((x) => (
          <button key={x.id} type="button" onClick={() => setT(normalizarTema({ id: x.id }))}
            className={`rounded-xl border-2 p-4 text-left transition ${t.id === x.id ? "border-primary shadow-glow" : "border-border hover:border-primary/50"}`}>
            <div className="flex gap-1">{x.cores.map((c) => <span key={c} className="size-4 rounded-full" style={{ background: c }} />)}</div>
            <p className="mt-2 font-semibold">{x.nome}</p>
            <p className="text-xs text-muted-foreground">{x.descricao}</p>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div><p className="text-sm font-semibold">Fundo</p><div className="mt-2 flex flex-wrap gap-2">{def.fundos.map((f, i) => <Button key={f} size="sm" variant={t.fundo === i ? "default" : "outline"} onClick={() => setT({ ...t, fundo: i })}>{f}</Button>)}</div></div>
        <div><p className="text-sm font-semibold">Versão</p><div className="mt-2 flex gap-2">{def.modos.map((m) => <Button key={m} size="sm" variant={t.modo === m ? "default" : "outline"} onClick={() => setT({ ...t, modo: m })}>{m === "claro" ? "Clara" : "Escura"}</Button>)}</div></div>
        <div><p className="text-sm font-semibold">Cor de destaque</p><div className="mt-2 flex gap-2">{def.cores.map((c, i) => <button key={c} type="button" aria-label={`Cor ${i + 1}`} onClick={() => setT({ ...t, cor: i })} className="grid size-8 place-items-center rounded-full border-2 border-border" style={{ background: c }}>{t.cor === i && <Check className="size-4 text-primary-foreground" />}</button>)}</div></div>
      </div>
      <p className="mt-5 text-sm font-semibold">Prévia</p>
      <div {...prev} className={`mt-2 overflow-hidden rounded-xl border border-border ${prev.className}`}>
        <div className="flex">
          <div className="w-24 bg-sidebar p-3 text-xs text-sidebar-foreground">Menu</div>
          <div className="flex-1 p-4">
            <div className="card-soft p-3 text-sm text-card-foreground">Minha redação • <span className="font-semibold text-primary">920 pontos</span></div>
            <Button size="sm" className="mt-3">Botão de exemplo</Button>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button disabled={!mudou || salvando} onClick={() => void aplicar()}>{salvando ? "Aplicando..." : "Aplicar tema"}</Button>
        {mudou && <Button variant="outline" onClick={() => setT(salvo)}>Descartar</Button>}
      </div>
    </section>
  );
}
