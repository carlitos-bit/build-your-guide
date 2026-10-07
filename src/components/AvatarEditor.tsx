import { useEffect, useState } from "react";
import { Check, Save, Shuffle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { avatarOptions, normalizeAvatar, randomAvatar, type AvatarKey } from "@/lib/avatar";
import { StudentAvatar } from "@/components/StudentAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categories: { key: AvatarKey; label: string }[] = [
  { key: "head", label: "Cabeça" }, { key: "body", label: "Corpo" }, { key: "hair", label: "Cabelo" }, { key: "face", label: "Rosto" }, { key: "clothes", label: "Roupas" }, { key: "shoes", label: "Sapatos" }, { key: "accessory", label: "Acessórios" },
];
export function AvatarEditor() {
  const { user, perfil, recarregarPerfil } = useAuth();
  const [draft, setDraft] = useState(() => normalizeAvatar(null));
  const [category, setCategory] = useState<AvatarKey>("head");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(normalizeAvatar(perfil?.avatar)); }, [perfil?.avatar]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(normalizeAvatar(perfil?.avatar));
  async function save() {
    if (!user || saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("profiles").update({ avatar: { ...draft } }).eq("id", user.id).select("id").single();
      if (error || !data) throw error || new Error("Perfil não encontrado");
      await recarregarPerfil();
      toast.success("Avatar salvo!");
    } catch { toast.error("Não foi possível salvar seu avatar. Tente novamente."); }
    finally { setSaving(false); }
  }
  return <section className="mt-6 border-y border-border py-6" aria-labelledby="avatar-title">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id="avatar-title" className="font-display text-xl font-semibold">Meu avatar</h2>
      <Button onClick={save} disabled={!dirty || saving || !perfil}><Save className="size-4" />{saving ? "Salvando…" : "Salvar avatar"}</Button>
    </div>
    <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex flex-col items-center justify-center rounded-lg bg-secondary py-5">
        <StudentAvatar value={draft} className="h-64 w-44" />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="icon" title="Criar combinação aleatória" aria-label="Criar combinação aleatória" disabled={saving} onClick={() => setDraft(randomAvatar())}><Shuffle /></Button>
          <Button variant="outline" size="icon" title="Desfazer alterações" aria-label="Desfazer alterações" disabled={!dirty || saving} onClick={() => setDraft(normalizeAvatar(perfil?.avatar))}><Undo2 /></Button>
        </div>
      </div>
      <div className="min-w-0">
        <Tabs value={category} onValueChange={value => setCategory(value as AvatarKey)}>
          <div className="overflow-x-auto pb-2"><TabsList className="h-auto w-max">{categories.map(c => <TabsTrigger key={c.key} value={c.key} disabled={saving}>{c.label}</TabsTrigger>)}</TabsList></div>
        </Tabs>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label={categories.find(c => c.key === category)?.label}>
          {avatarOptions[category].map((label, index) => <Button key={label} variant="outline" aria-label={label} aria-pressed={draft[category] === index} disabled={saving} className={`relative flex h-36 flex-col gap-1 rounded-lg ${draft[category] === index ? "border-primary bg-primary/5 ring-1 ring-primary" : ""}`} onClick={() => setDraft(d => ({ ...d, [category]: index }))}>
            <StudentAvatar value={{ ...draft, [category]: index }} portrait={category !== "body" && category !== "clothes" && category !== "shoes"} className="h-24 w-20" />
            <span className="text-xs">{label}</span>{draft[category] === index && <Check className="absolute right-2 top-2 size-4 text-primary" />}
          </Button>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-5">
          {([{ key: "skin", label: "Tom de pele", prefix: "avatar-skin" }, { key: "hairColor", label: "Cor do cabelo", prefix: "avatar-hair" }, { key: "outfitColor", label: "Cor da roupa", prefix: "avatar-outfit" }] as const).map(group => <fieldset key={group.key}>
            <legend className="mb-2 text-xs font-medium text-muted-foreground">{group.label}</legend>
            <div className="flex gap-2">{avatarOptions[group.key].map((label, index) => <Button key={label} variant="outline" size="icon" title={label} aria-label={`${group.label}: ${label}`} aria-pressed={draft[group.key] === index} disabled={saving} className={`size-8 rounded-full p-1 ${draft[group.key] === index ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`} onClick={() => setDraft(d => ({ ...d, [group.key]: index }))}><span className={`size-full rounded-full bg-${group.prefix}-${index}`} /></Button>)}</div>
          </fieldset>)}
        </div>
      </div>
    </div>
  </section>;
}