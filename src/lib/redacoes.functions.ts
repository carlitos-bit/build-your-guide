import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EnviarInput = z.object({
  texto: z.string().min(200, "A redação precisa ter pelo menos 200 caracteres."),
  temaId: z.string().uuid().nullable(),
  temaTitulo: z.string().min(3),
  tipo: z.enum(["livre", "cronometrada"]),
  tempoGastoSeg: z.number().int().nonnegative().nullable(),
});

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

function arredondar40(valor: number) {
  const limitado = Math.max(0, Math.min(200, Math.round(valor)));
  return Math.round(limitado / 40) * 40;
}

export const enviarRedacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EnviarInput.parse(input))
  .handler(async ({ data, context }) => {
    const geminiKey = process.env["GEMINI_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (!geminiKey && !lovableKey) {
      throw new Error("A correção por IA não está configurada.");
    }

    const { streamText, Output, NoObjectGeneratedError } = await import("ai");

    const prompt = `TEMA PROPOSTO: ${data.temaTitulo}\n\nMODALIDADE: ${
      data.tipo === "cronometrada" ? "simulado cronometrado" : "treino livre"
    }\n\nREDAÇÃO DO ALUNO:\n${data.texto}`;

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

    const notas = {
      c1: arredondar40(correcao.c1.nota),
      c2: arredondar40(correcao.c2.nota),
      c3: arredondar40(correcao.c3.nota),
      c4: arredondar40(correcao.c4.nota),
      c5: arredondar40(correcao.c5.nota),
    };
    const notaTotal = notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;

    const supabase = context.supabase;
    const alunoId = context.userId;

    const { data: redacao, error: erroRedacao } = await supabase
      .from("redacoes")
      .insert({
        aluno_id: alunoId,
        tema_id: data.temaId,
        tema_titulo: data.temaTitulo,
        texto: data.texto,
        tipo: data.tipo,
        tempo_gasto_seg: data.tempoGastoSeg,
        status: "em_revisao",
      })
      .select("id")
      .single();

    if (erroRedacao || !redacao) throw new Error("Não foi possível salvar a redação.");

    // A correção da IA é registrada por função controlada e nasce como ESTIMATIVA
    // (liberada = false). Só o professor a torna oficial.
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

    const { error: erroCorrecao } = await supabase.rpc("registrar_correcao_ia" as never, {
      _redacao_id: redacao.id,
      _c1: notas.c1,
      _c2: notas.c2,
      _c3: notas.c3,
      _c4: notas.c4,
      _c5: notas.c5,
      _feedback: feedbackIa,
    } as never);

    if (erroCorrecao) throw new Error("Não foi possível salvar a correção.");

    // Gamificação: CASH, XP, nível e troféus
    const cashGanho = Math.round(notaTotal * 0.14);
    const xpGanho = Math.round(notaTotal * 0.3) + (data.tipo === "cronometrada" ? 50 : 0);

    const { data: gam } = await supabase
      .from("perfil_gamificacao")
      .select("id, nivel, xp_atual, cash_atual, sequencia_quinzenas")
      .eq("aluno_id", alunoId)
      .maybeSingle();

    const xpTotal = (gam?.xp_atual ?? 0) + xpGanho;
    const nivel = Math.max(1, Math.floor(xpTotal / 500) + 1);

    if (gam) {
      await supabase
        .from("perfil_gamificacao")
        .update({
          xp_atual: xpTotal,
          cash_atual: (gam.cash_atual ?? 0) + cashGanho,
          nivel,
        })
        .eq("id", gam.id);
    } else {
      await supabase.from("perfil_gamificacao").insert({
        aluno_id: alunoId,
        xp_atual: xpTotal,
        cash_atual: cashGanho,
        nivel,
      });
    }

    const { data: notasAnteriores } = await supabase
      .from("correcoes")
      .select("nota_total, redacoes!inner(aluno_id)")
      .eq("redacoes.aluno_id", alunoId);

    const todasNotas = (notasAnteriores ?? []).map((r) => r.nota_total as number);
    const totalRedacoes = todasNotas.length;
    const media = totalRedacoes ? todasNotas.reduce((a, b) => a + b, 0) / totalRedacoes : notaTotal;

    const novosTrofeus: string[] = [];
    if (totalRedacoes <= 1) novosTrofeus.push("primeira_redacao");
    if (notaTotal >= 900) novosTrofeus.push("nota_900");
    if (notaTotal >= 800 && notas.c3 >= 160) novosTrofeus.push("argumentador_elite");
    if (totalRedacoes >= 10) novosTrofeus.push("persistencia");
    if (totalRedacoes >= 3 && media > 850) novosTrofeus.push("mestre_escrita");

    const trofeusConquistados: string[] = [];
    for (const codigo of novosTrofeus) {
      const { error } = await supabase
        .from("trofeus_aluno")
        .insert({ aluno_id: alunoId, trofeu_codigo: codigo });
      if (!error) trofeusConquistados.push(codigo);
    }

    return {
      redacaoId: redacao.id as string,
      notaTotal,
      cashGanho,
      xpGanho,
      nivel,
      trofeusConquistados,
    };
  });

const AjustarInput = z.object({
  correcaoId: z.string().uuid(),
  notas: z.object({
    c1: z.number().int(),
    c2: z.number().int(),
    c3: z.number().int(),
    c4: z.number().int(),
    c5: z.number().int(),
  }),
  feedbackProfessor: z.string().nullable(),
  liberada: z.boolean(),
});

export const ajustarCorrecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AjustarInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: papeis } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["professor", "admin"]);

    if (!papeis || papeis.length === 0) {
      throw new Error("Apenas professores ou administradores podem revisar correções.");
    }

    const notas = {
      c1: arredondar40(data.notas.c1),
      c2: arredondar40(data.notas.c2),
      c3: arredondar40(data.notas.c3),
      c4: arredondar40(data.notas.c4),
      c5: arredondar40(data.notas.c5),
    };

    const { data: atualizada, error } = await context.supabase
      .from("correcoes")
      .update({
        nota_c1: notas.c1,
        nota_c2: notas.c2,
        nota_c3: notas.c3,
        nota_c4: notas.c4,
        nota_c5: notas.c5,
        nota_total: notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5,
        feedback_professor: data.feedbackProfessor,
        liberada: data.liberada,
        revisada_por: context.userId,
        revisada_em: new Date().toISOString(),
      } as never)
      .eq("id", data.correcaoId)
      .select("redacao_id")
      .single();

    if (error) throw new Error("Não foi possível salvar a revisão.");

    // A redação só vira "corrigida" (oficial) quando a correção é liberada.
    if (atualizada?.redacao_id) {
      await context.supabase
        .from("redacoes")
        .update({ status: data.liberada ? "corrigida" : "em_revisao" })
        .eq("id", atualizada.redacao_id);
    }

    return { ok: true };
  });

// As anotações do professor (destaques e notas de rodapé sobre o texto) ainda
// não têm tabela no banco nem tela que as use. Para reativar a função, crie a
// tabela `anotacoes_correcao` com RLS e volte a expor estes server functions.

