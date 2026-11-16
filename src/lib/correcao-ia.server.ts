import { z } from "zod";

const competenciaSchema = z.object({
  nota: z.number(),
  analise: z.string(),
  sugestoes: z.array(z.string()),
});

const correcaoSchema = z.object({
  resumo: z.string(),
  c1: competenciaSchema,
  c2: competenciaSchema,
  c3: competenciaSchema,
  c4: competenciaSchema,
  c5: competenciaSchema,
  pontos_fortes: z.array(z.string()),
  pontos_a_melhorar: z.array(z.string()),
  trechos: z.array(
    z.object({
      trecho: z.string(),
      comentario: z.string(),
      sugestao_reescrita: z.string(),
      gravidade: z.string(),
    }),
  ),
});

const PROMPT_SISTEMA = `Você é um corretor experiente de redações do ENEM.
Corrija a redação dissertativo-argumentativa seguindo EXATAMENTE as 5 competências oficiais:
C1 — domínio da norma padrão da língua escrita.
C2 — compreensão da proposta e aplicação de repertório sociocultural produtivo.
C3 — seleção, organização e interpretação de informações em defesa de uma tese.
C4 — conhecimento dos mecanismos linguísticos de coesão e coerência.
C5 — proposta de intervenção detalhada (agente, ação, meio, finalidade, detalhamento).

Regras obrigatórias:
- Cada competência recebe nota de 0 a 200, sempre múltiplo de 40 (0, 40, 80, 120, 160 ou 200).
- Seja rigoroso e justo, como a banca oficial.
- Em "trechos", cite entre 3 e 6 trechos LITERAIS da redação com comentário e sugestão de reescrita; gravidade deve ser "leve", "media" ou "grave".
- Escreva tudo em português do Brasil, em tom de professor que ensina, direto e específico.
- Nunca invente conteúdo que não está na redação.`;

export function arredondar40(valor: number) {
  const limitado = Math.max(0, Math.min(200, Math.round(valor)));
  return Math.round(limitado / 40) * 40;
}

export type CorrecaoIa = z.infer<typeof correcaoSchema>;

export async function gerarCorrecaoIa(input: { temaTitulo: string; texto: string; tipo: string }) {
    const geminiKey = process.env["GEMINI_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (!geminiKey && !lovableKey) {
      throw new Error("A correção por IA não está configurada.");
    }

    const { streamText, Output, NoObjectGeneratedError } = await import("ai");

    const prompt = `TEMA PROPOSTO: ${input.temaTitulo}\n\nMODALIDADE: ${
      input.tipo === "cronometrada" ? "simulado cronometrado" : "treino livre"
    }\n\nREDAÇÃO DO ALUNO:\n${input.texto}`;

    let correcao: z.infer<typeof correcaoSchema> | undefined;

    // Provedor principal: Google Gemini. Basta configurar GEMINI_API_KEY (plano gratuito).
    // Usa o endpoint compatível com OpenAI, então não precisamos de dependências extras.
    if (geminiKey) {
      try {
        const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
        const gemini = createOpenAICompatible({
          name: "gemini",
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
          apiKey: geminiKey,
        });
        const resultado = streamText({
          model: gemini(process.env["GEMINI_MODEL"] ?? "gemini-2.5-pro"),
          system: PROMPT_SISTEMA,
          output: Output.object({ schema: correcaoSchema }),
          prompt,
        });
        correcao = (await resultado.output) as z.infer<typeof correcaoSchema>;
      } catch (error) {
        console.error("[correcao] Gemini indisponível, usando fallback:", error);
        correcao = undefined;
      }
    }

    // Fallback: AI Gateway da Lovable (usa os créditos do workspace).
    if (!correcao) {
      if (!lovableKey) {
        throw new Error("Não conseguimos corrigir esta redação agora. Tente novamente.");
      }

      const { createLovableAiGatewayRunIdFetch } = await import("./ai-gateway.server");
      const { createOpenAI } = await import("@ai-sdk/openai");

      const runIdFetch = createLovableAiGatewayRunIdFetch();
      const lovable = createOpenAI({
        baseURL: "https://ai.gateway.lovable.dev/v1",
        apiKey: lovableKey,
        headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        fetch: runIdFetch.fetch,
      });

      try {
        const resultado = streamText({
          model: lovable.responses(process.env["LOVABLE_MODEL"] ?? "openai/gpt-6-astra"),
          system: PROMPT_SISTEMA,
          output: Output.object({ schema: correcaoSchema }),
          prompt,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              store: false,
            },
          },
        });
        correcao = (await resultado.output) as z.infer<typeof correcaoSchema>;
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error)) {
          throw new Error("Não conseguimos corrigir esta redação agora. Tente novamente.");
        }
        throw error;
      }
    }

    if (!correcao) {
      throw new Error("Não conseguimos corrigir esta redação agora. Tente novamente.");
    }

    return correcao;
}

export function montarFeedbackIa(correcao: CorrecaoIa) {
  const notas = {
    c1: arredondar40(correcao.c1.nota),
    c2: arredondar40(correcao.c2.nota),
    c3: arredondar40(correcao.c3.nota),
    c4: arredondar40(correcao.c4.nota),
    c5: arredondar40(correcao.c5.nota),
  };
  const feedbackIa = {
    resumo: correcao.resumo,
    competencias: {
      c1: { ...correcao.c1, nota: notas.c1 },
      c2: { ...correcao.c2, nota: notas.c2 },
      c3: { ...correcao.c3, nota: notas.c3 },
      c4: { ...correcao.c4, nota: notas.c4 },
      c5: { ...correcao.c5, nota: notas.c5 },
    },
    pontos_fortes: correcao.pontos_fortes,
    pontos_a_melhorar: correcao.pontos_a_melhorar,
    trechos: correcao.trechos,
  };
  return { notas, feedbackIa };
}
