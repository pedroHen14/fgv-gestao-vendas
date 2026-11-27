import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import { gerarConteudoIaInputSchema } from "@/lib/validators/conteudo";
import {
  gerarConteudoComGemini,
  IaConfigError,
  IaGenerationError,
} from "@/lib/services/ia-conteudo";
import { saveIaResultToConteudo } from "@/lib/services/conteudos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Não foi possível ler os dados enviados." },
        { status: 400 }
      );
    }

    const parsed = gerarConteudoIaInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Confira os campos antes de gerar o conteúdo.",
        },
        { status: 400 }
      );
    }

    const resultado = await gerarConteudoComGemini(parsed.data);

    let conteudoAtualizado = null;
    if (parsed.data.conteudo_id) {
      conteudoAtualizado = await saveIaResultToConteudo({
        id: parsed.data.conteudo_id,
        tema: parsed.data.tema,
        formato: parsed.data.formato,
        ocasiaoFeira: parsed.data.ocasiao_feira ?? null,
        legendaIa: resultado.legenda_completa,
        roteiroCenasIa: resultado.roteiro_cenas,
      });
      if (conteudoAtualizado) {
        revalidatePath("/conteudos");
      }
    }

    return NextResponse.json(
      {
        legenda_completa: resultado.legenda_completa,
        legenda: resultado.legenda,
        chamada_orcamento: resultado.chamada_orcamento,
        hashtags: resultado.hashtags,
        dica_musica_ou_canva: resultado.dica_musica_ou_canva,
        roteiro_cenas: resultado.roteiro_cenas,
        conteudo_atualizado: conteudoAtualizado,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof IaConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof IaGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      {
        error:
          "Ocorreu um erro inesperado ao gerar o conteúdo com IA. Tente novamente.",
      },
      { status: 500 }
    );
  }
}
