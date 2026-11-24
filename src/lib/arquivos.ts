import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "arquivos";

export async function enviarArquivo(pasta: string, arquivo: File) {
  const ext = arquivo.name.split(".").pop() ?? "bin";
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, arquivo, { upsert: false });
  if (error) throw error;
  return path;
}

export async function removerArquivo(path: string | null | undefined) {
  if (path) await supabase.storage.from(BUCKET).remove([path]);
}

export async function urlsAssinadas(paths: (string | null | undefined)[]) {
  const lista = paths.filter((p): p is string => !!p);
  if (!lista.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(lista, 3600);
  const mapa: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
  return mapa;
}
