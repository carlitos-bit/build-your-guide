export const COMPETENCIAS = [
  { chave: "c1", titulo: "C1 — Norma padrão", resumo: "Domínio da escrita formal" },
  { chave: "c2", titulo: "C2 — Tema e repertório", resumo: "Compreensão da proposta" },
  { chave: "c3", titulo: "C3 — Argumentação", resumo: "Defesa organizada da tese" },
  { chave: "c4", titulo: "C4 — Coesão", resumo: "Mecanismos linguísticos" },
  { chave: "c5", titulo: "C5 — Intervenção", resumo: "Proposta detalhada" },
] as const;

export function corDaNota(nota: number) {
  if (nota >= 800) return "text-success";
  if (nota >= 600) return "text-warning";
  return "text-danger";
}

export function rotuloDaNota(nota: number) {
  if (nota >= 800) return "Bom";
  if (nota >= 600) return "Atenção";
  return "Crítico";
}

export function corDaCompetencia(nota: number) {
  if (nota >= 160) return "text-success";
  if (nota >= 120) return "text-warning";
  return "text-danger";
}

export type FeedbackCompetencia = {
  nota: number;
  analise: string;
  sugestoes: string[];
};

export type FeedbackIA = {
  resumo?: string;
  competencias?: Record<string, FeedbackCompetencia>;
  pontos_fortes?: string[];
  pontos_a_melhorar?: string[];
  trechos?: Array<{
    trecho: string;
    comentario: string;
    sugestao_reescrita: string;
    gravidade: string;
  }>;
};
