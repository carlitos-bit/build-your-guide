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

function arredondar40(valor: number) {
  const limitado = Math.max(0, Math.min(200, Math.round(valor)));
  return Math.round(limitado / 40) * 40;
}

export const enviarRedacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EnviarInput.parse(input))
  .handler(async ({ data, context }) => {
    const { gerarCorrecaoIa, montarFeedbackIa } = await import("./correcao-ia.server");
    const correcao = await gerarCorrecaoIa(data);
    const { notas, feedbackIa: feedbackGerado } = montarFeedbackIa(correcao);

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
    const feedbackIa = feedbackGerado;

    const { error: erroCorrecao } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.rpc("registrar_correcao_ia", {
      _redacao_id: redacao.id,
      _c1: notas.c1,
      _c2: notas.c2,
      _c3: notas.c3,
      _c4: notas.c4,
      _c5: notas.c5,
      _feedback: feedbackIa,
    });

    if (erroCorrecao) throw new Error("Não foi possível salvar a correção.");

    // Pending AI scores never cross the student-facing RPC boundary.
    return { redacaoId: redacao.id, status: "em_revisao" as const };

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
      })
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


export const corrigirComIa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ correcaoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: papeis } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["professor", "admin"]);
    if (!papeis || papeis.length === 0) {
      throw new Error("Apenas professores ou administradores podem corrigir com IA.");
    }

    // RLS garante que o professor só enxerga correções das suas turmas.
    const { data: atual, error } = await context.supabase
      .from("correcoes")
      .select("id, redacoes(tema_titulo, texto, tipo)")
      .eq("id", data.correcaoId)
      .maybeSingle();
    const redacao = atual?.redacoes as { tema_titulo: string; texto: string; tipo: string } | null;
    if (error || !atual || !redacao) throw new Error("Redação não encontrada.");

    const { gerarCorrecaoIa, montarFeedbackIa } = await import("./correcao-ia.server");
    const correcao = await gerarCorrecaoIa({
      temaTitulo: redacao.tema_titulo,
      texto: redacao.texto,
      tipo: redacao.tipo,
    });
    const { notas, feedbackIa } = montarFeedbackIa(correcao);

    const { error: erroUpd } = await context.supabase
      .from("correcoes")
      .update({ feedback_ia: feedbackIa })
      .eq("id", data.correcaoId);
    if (erroUpd) throw new Error("Não foi possível salvar a correção da IA.");

    // As notas sugeridas voltam para o professor revisar antes de liberar.
    return { notas, resumo: correcao.resumo };
  });
