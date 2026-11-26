import type { AlertasDoDia } from "@/lib/services/alertas";
import { STATUS_PEDIDO_META } from "@/lib/constants";
import {
  formatCurrencyBRL,
  formatDateBR,
  formatPrazoRelativo,
} from "@/lib/formatters";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAppUrl(appUrl?: string | null): string {
  const raw = appUrl?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export interface AlertasEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildAlertasEmailContent(
  alertas: AlertasDoDia,
  appUrlInput?: string | null
): AlertasEmailContent {
  const appUrl = normalizeAppUrl(appUrlInput);
  const dataBR = formatDateBR(alertas.dataReferencia);
  const total = alertas.totalPendenciasCron;

  const subject = `Resumo Diário FGV (${dataBR}) — ${total} ${
    total === 1 ? "pendência" : "pendências"
  }`;

  const sectionsHtml: string[] = [];
  const sectionsText: string[] = [];

  // 1. Orçamentos para Cobrar
  if (alertas.followupsPendentes.length > 0) {
    const rows = alertas.followupsPendentes
      .map((item) => {
        const urgencia =
          item.diasAtraso === 0
            ? "Retorno hoje"
            : item.diasAtraso === 1
              ? "Atrasado há 1 dia"
              : `Atrasado há ${item.diasAtraso} dias`;
        const badgeBg = item.diasAtraso > 0 ? "#fee2e2" : "#fef3c7";
        const badgeColor = item.diasAtraso > 0 ? "#991b1b" : "#92400e";
        const link = `${appUrl}/pedidos/${item.id}`;
        const statusLabel = STATUS_PEDIDO_META[item.status].shortLabel;

        return `
          <tr>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
              <div style="margin-bottom: 4px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor};">
                  ${escapeHtml(urgencia)}
                </span>
                <span style="display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #334155;">
                  ${escapeHtml(statusLabel)}
                </span>
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                ${escapeHtml(item.clienteNome)}
              </div>
              <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                ${
                  item.compradorNome
                    ? `Comprador: ${escapeHtml(item.compradorNome)}`
                    : "Sem comprador definido"
                }${
                  item.fornecedor
                    ? ` • Fábrica: ${escapeHtml(item.fornecedor.nome)}`
                    : ""
                }
              </div>
              ${
                item.primeiroItem
                  ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px;">${escapeHtml(
                      item.primeiroItem
                    )}</div>`
                  : ""
              }
            </td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap; vertical-align: top;">
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                ${escapeHtml(formatCurrencyBRL(item.valorTotal))}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Previsto: ${escapeHtml(formatDateBR(item.proximoFollowup))}
              </div>
              <div style="margin-top: 8px;">
                <a href="${escapeHtml(link)}" style="display: inline-block; padding: 5px 10px; border-radius: 6px; background: #155e3b; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600;">
                  Abrir
                </a>
              </div>
            </td>
          </tr>`;
      })
      .join("");

    sectionsHtml.push(`
      <div style="margin-top: 24px;">
        <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #92400e;">
          Orçamentos para Cobrar (${alertas.followupsPendentes.length})
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
          ${rows}
        </table>
      </div>
    `);

    const textLines = alertas.followupsPendentes.map((item) => {
      const urgencia =
        item.diasAtraso === 0
          ? "Retorno hoje"
          : `Atrasado há ${item.diasAtraso} dia(s)`;
      return `- [${urgencia}] ${item.clienteNome} | ${formatCurrencyBRL(
        item.valorTotal
      )} | Previsto: ${formatDateBR(
        item.proximoFollowup
      )} | ${appUrl}/pedidos/${item.id}`;
    });
    sectionsText.push(
      `ORÇAMENTOS PARA COBRAR (${alertas.followupsPendentes.length}):\n${textLines.join("\n")}`
    );
  }

  // 2. Pedidos em Produção próximos da saída / atrasados
  if (alertas.producaoAlerta.length > 0) {
    const rows = alertas.producaoAlerta
      .map((item) => {
        const prazo = formatPrazoRelativo(
          item.dataPrevistaSaida,
          alertas.dataReferencia
        );
        const badgeBg = prazo.urgencia === "atrasado" ? "#fee2e2" : "#ffedd5";
        const badgeColor =
          prazo.urgencia === "atrasado" ? "#991b1b" : "#9a3412";
        const link = `${appUrl}/pedidos/${item.id}`;
        const numLabel = item.numeroPedido
          ? `Pedido ${item.numeroPedido}`
          : "Sem número";

        return `
          <tr>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
              <div style="margin-bottom: 4px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor};">
                  ${escapeHtml(prazo.texto)}
                </span>
                <span style="display: inline-block; margin-left: 6px; font-size: 12px; font-weight: 600; color: #475569;">
                  ${escapeHtml(numLabel)}
                </span>
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                ${escapeHtml(item.clienteNome)}
              </div>
              <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                Fábrica: ${escapeHtml(item.fornecedorNome ?? "Não informada")}
              </div>
              ${
                item.primeiroItem
                  ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px;">${escapeHtml(
                      item.primeiroItem
                    )}</div>`
                  : ""
              }
            </td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap; vertical-align: top;">
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                ${escapeHtml(formatCurrencyBRL(item.valorTotal))}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Saída: ${escapeHtml(formatDateBR(item.dataPrevistaSaida))}
              </div>
              <div style="margin-top: 8px;">
                <a href="${escapeHtml(link)}" style="display: inline-block; padding: 5px 10px; border-radius: 6px; background: #155e3b; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600;">
                  Abrir
                </a>
              </div>
            </td>
          </tr>`;
      })
      .join("");

    sectionsHtml.push(`
      <div style="margin-top: 24px;">
        <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #9a3412;">
          Em Produção — Cobrar Fábrica (${alertas.producaoAlerta.length})
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
          ${rows}
        </table>
      </div>
    `);

    const textLines = alertas.producaoAlerta.map((item) => {
      const prazo = formatPrazoRelativo(
        item.dataPrevistaSaida,
        alertas.dataReferencia
      );
      const numLabel = item.numeroPedido
        ? `Pedido ${item.numeroPedido}`
        : "Sem número";
      return `- [${prazo.texto}] ${numLabel} • ${item.clienteNome} (${
        item.fornecedorNome ?? "Sem fábrica"
      }) | Saída: ${formatDateBR(item.dataPrevistaSaida)} | ${appUrl}/pedidos/${
        item.id
      }`;
    });
    sectionsText.push(
      `EM PRODUÇÃO - COBRAR FÁBRICA (${alertas.producaoAlerta.length}):\n${textLines.join("\n")}`
    );
  }

  // 3. Pedidos em Trânsito há mais de 5 dias
  if (alertas.transitoAlerta.length > 0) {
    const rows = alertas.transitoAlerta
      .map((item) => {
        const link = `${appUrl}/pedidos/${item.id}`;
        const numLabel = item.numeroPedido
          ? `Pedido ${item.numeroPedido}`
          : "Sem número";

        return `
          <tr>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
              <div style="margin-bottom: 4px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #fee2e2; color: #991b1b;">
                  Em trânsito há ${item.diasEmTransito} dias
                </span>
                <span style="display: inline-block; margin-left: 6px; font-size: 12px; font-weight: 600; color: #475569;">
                  ${escapeHtml(numLabel)}
                </span>
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                ${escapeHtml(item.clienteNome)}
              </div>
              <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                Fábrica: ${escapeHtml(item.fornecedorNome ?? "Não informada")}
              </div>
            </td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap; vertical-align: top;">
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                ${escapeHtml(formatCurrencyBRL(item.valorTotal))}
              </div>
              <div style="margin-top: 8px;">
                <a href="${escapeHtml(link)}" style="display: inline-block; padding: 5px 10px; border-radius: 6px; background: #155e3b; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600;">
                  Confirmar
                </a>
              </div>
            </td>
          </tr>`;
      })
      .join("");

    sectionsHtml.push(`
      <div style="margin-top: 24px;">
        <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #991b1b;">
          Em Trânsito há mais de 5 dias (${alertas.transitoAlerta.length})
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
          ${rows}
        </table>
      </div>
    `);

    const textLines = alertas.transitoAlerta.map((item) => {
      const numLabel = item.numeroPedido
        ? `Pedido ${item.numeroPedido}`
        : "Sem número";
      return `- [Há ${item.diasEmTransito} dias em trânsito] ${numLabel} • ${
        item.clienteNome
      } | ${formatCurrencyBRL(item.valorTotal)} | ${appUrl}/pedidos/${item.id}`;
    });
    sectionsText.push(
      `EM TRÂNSITO HÁ MAIS DE 5 DIAS (${alertas.transitoAlerta.length}):\n${textLines.join("\n")}`
    );
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin: 0; padding: 24px 12px; background-color: #f6f8f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #dde5e1; border-radius: 16px; overflow: hidden;">
      <div style="background: #155e3b; padding: 20px 24px; color: #ffffff;">
        <p style="margin: 0; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.85;">
          FGV Representações Comerciais
        </p>
        <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 700;">
          Resumo Diário de Acompanhamento — ${escapeHtml(dataBR)}
        </h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">
          Você tem ${total} ${
            total === 1 ? "item que pede" : "itens que pedem"
          } atenção hoje.
        </p>
      </div>

      <div style="padding: 16px 24px 28px 24px;">
        ${sectionsHtml.join("")}

        <div style="margin-top: 28px; text-align: center;">
          <a href="${escapeHtml(appUrl)}/" style="display: inline-block; padding: 12px 22px; border-radius: 10px; background: #155e3b; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700;">
            Abrir Painel do Dia
          </a>
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 12px; color: #64748b; text-align: center;">
        Enviado automaticamente pelo sistema FGV Gestão de Vendas.
      </div>
    </div>
  </body>
</html>`;

  const text = `FGV REPRESENTAÇÕES COMERCIAIS — RESUMO DIÁRIO (${dataBR})

Você tem ${total} ${total === 1 ? "pendência" : "pendências"} para hoje.

${sectionsText.join("\n\n")}

Abrir Painel do Dia: ${appUrl}/`;

  return { subject, html, text };
}

export interface EnviarResendParams {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export async function enviarEmailAlertasViaResend(
  params: EnviarResendParams
): Promise<{ id: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Falha ao enviar e-mail via Resend (HTTP ${response.status}): ${
        errorBody || response.statusText
      }`
    );
  }

  const data = (await response.json()) as { id?: string };
  return { id: data.id ?? "enviado" };
}
