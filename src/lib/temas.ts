export type TemaPerfil = { id: string; modo: "claro" | "escuro"; fundo: number; cor: number };

export const TEMAS = [
  { id: "padrao", nome: "Padrão EscreveAI", descricao: "Visual original da plataforma", modos: ["claro", "escuro"], cores: ["#e8634a"], fundos: ["Liso"] },
  { id: "herois", nome: "Super-Heróis", descricao: "Cores vibrantes e pontilhado de quadrinhos", modos: ["claro", "escuro"], cores: ["#e11d2e", "#1d4ed8", "#facc15"], fundos: ["Retícula", "Raios", "Liso"] },
  { id: "galaxia", nome: "Espaço Galáctico", descricao: "Estrelas e nebulosas em roxo e azul", modos: ["escuro"], cores: ["#a855f7", "#38bdf8", "#f472b6"], fundos: ["Estrelas", "Nebulosa", "Liso"] },
  { id: "neon", nome: "Neon Gamer", descricao: "Detalhes luminosos e cores neon", modos: ["escuro"], cores: ["#22d3ee", "#a3e635", "#f0abfc"], fundos: ["Grade", "Brilho", "Liso"] },
  { id: "minimalista", nome: "Minimalista", descricao: "Limpo, claro e organizado", modos: ["claro"], cores: ["#111827", "#0f766e", "#9a3412"], fundos: ["Liso", "Linhas"] },
  { id: "dark", nome: "Dark Mode", descricao: "Fundo escuro moderno com cor à sua escolha", modos: ["escuro"], cores: ["#f97316", "#10b981", "#6366f1", "#ec4899"], fundos: ["Liso", "Gradiente"] },
] as const;

export function normalizarTema(v: unknown): TemaPerfil {
  const o = (v && typeof v === "object" ? v : {}) as Partial<TemaPerfil>;
  const t = TEMAS.find((x) => x.id === o.id) ?? TEMAS[0];
  const modo = (t.modos as readonly string[]).includes(o.modo ?? "") ? (o.modo as "claro" | "escuro") : (t.modos[0] as "claro" | "escuro");
  const fundo = Math.min(Math.max(0, Number(o.fundo) || 0), t.fundos.length - 1);
  const cor = Math.min(Math.max(0, Number(o.cor) || 0), t.cores.length - 1);
  return { id: t.id, modo, fundo, cor };
}

export function atributosTema(t: TemaPerfil) {
  const def = TEMAS.find((x) => x.id === t.id) ?? TEMAS[0];
  return {
    "data-tema": t.id,
    "data-fundo": String(t.fundo),
    className: t.modo === "escuro" ? "dark" : "",
    style: { "--tema-cor": def.cores[t.cor] } as React.CSSProperties,
  };
}
