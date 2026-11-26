import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAlertasDoDia } from "@/lib/services/alertas";
import {
  buildAlertasEmailContent,
  enviarEmailAlertasViaResend,
} from "@/lib/services/email-alertas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request, secret: string): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const provided = authHeader.slice("Bearer ".length).trim();
  if (!provided) return false;

  const expectedHash = createHash("sha256").update(secret).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
}

function parseDestinatarios(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret === "gere_uma_string_aleatoria_segura") {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor." },
      { status: 503 }
    );
  }

  if (!isAuthorizedCronRequest(request, cronSecret)) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401 }
    );
  }

  try {
    // Executa consultas no PostgreSQL (também mantém o banco gratuito ativo)
    const alertas = await getAlertasDoDia();

    const resumo = {
      dataReferencia: alertas.dataReferencia,
      followupsPendentes: alertas.followupsPendentes.length,
      producaoAlerta: alertas.producaoAlerta.length,
      transitoAlerta: alertas.transitoAlerta.length,
      totalPendencias: alertas.totalPendenciasCron,
    };

    if (alertas.totalPendenciasCron === 0) {
      return NextResponse.json(
        {
          ok: true,
          emailEnviado: false,
          motivo: "Nenhuma pendência encontrada para hoje.",
          resumo,
        },
        { status: 200 }
      );
    }

    const url = new URL(request.url);
    const isDryRun = url.searchParams.get("dryRun") === "1";

    const emailContent = buildAlertasEmailContent(
      alertas,
      process.env.NEXT_PUBLIC_APP_URL
    );

    if (isDryRun) {
      return NextResponse.json(
        {
          ok: true,
          dryRun: true,
          emailEnviado: false,
          assunto: emailContent.subject,
          resumo,
        },
        { status: 200 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const destinatarios = parseDestinatarios(process.env.ALERTAS_EMAIL_DESTINO);
    const remetente =
      process.env.ALERTAS_EMAIL_REMETENTE?.trim() ||
      "Alertas FGV <onboarding@resend.dev>";

    if (
      !resendApiKey ||
      resendApiKey === "re_sua_chave_resend" ||
      destinatarios.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          emailEnviado: false,
          error:
            "Configuração de envio de e-mail pendente (RESEND_API_KEY ou ALERTAS_EMAIL_DESTINO).",
          resumo,
        },
        { status: 503 }
      );
    }

    const sent = await enviarEmailAlertasViaResend({
      apiKey: resendApiKey,
      from: remetente,
      to: destinatarios,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json(
      {
        ok: true,
        emailEnviado: true,
        emailId: sent.id,
        destinatariosCount: destinatarios.length,
        resumo,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao processar alertas diários.",
      },
      { status: 500 }
    );
  }
}
