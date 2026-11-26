const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatCurrencyBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return brlFormatter.format(0);
  }
  const numeric = typeof value === "string" ? Number(value) : value;
  return brlFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDateBR(value: Date | string | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTimeBR(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value;
}

export function formatCep(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = onlyDigits(value);
  if (digits.length === 8) {
    return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
  }
  return value;
}

export function formatTelefone(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return value;
}

export function getTodayIsoDate(): string {
  return toSaoPauloIsoDate(new Date());
}

export function toSaoPauloIsoDate(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "2026-01-01";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function parseIsoDateUtc(isoDate: string): Date {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number.parseInt(yearStr ?? "2026", 10);
  const month = Number.parseInt(monthStr ?? "1", 10);
  const day = Number.parseInt(dayStr ?? "1", 10);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = parseIsoDateUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function diffIsoDays(fromIsoDate: string, toIsoDate: string): number {
  const from = parseIsoDateUtc(fromIsoDate).getTime();
  const to = parseIsoDateUtc(toIsoDate).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function getMonthRangeFromIso(isoDate: string): {
  startIso: string;
  endIso: string;
  label: string;
} {
  const [yearStr, monthStr] = isoDate.split("-");
  const year = Number.parseInt(yearStr ?? "2026", 10);
  const month = Number.parseInt(monthStr ?? "1", 10);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startIso = `${year}-${String(month).padStart(2, "0")}-01`;
  const endIso = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const rawLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));

  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  return { startIso, endIso, label };
}

export function formatPrazoRelativo(
  targetIsoDate: string,
  todayIso: string
): { texto: string; urgencia: "atrasado" | "hoje" | "proximo" | "normal" } {
  const diff = diffIsoDays(todayIso, targetIsoDate);
  if (diff < 0) {
    const dias = Math.abs(diff);
    return {
      texto: dias === 1 ? "Atrasado há 1 dia" : `Atrasado há ${dias} dias`,
      urgencia: "atrasado",
    };
  }
  if (diff === 0) {
    return { texto: "Vence hoje", urgencia: "hoje" };
  }
  if (diff === 1) {
    return { texto: "Amanhã", urgencia: "proximo" };
  }
  if (diff <= 3) {
    return { texto: `Em ${diff} dias`, urgencia: "proximo" };
  }
  return { texto: `Em ${diff} dias`, urgencia: "normal" };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatSuggestedPedidoNumero(
  proximoNumero: number | null | undefined,
  templatePdf?: string | null
): string {
  if (proximoNumero === null || proximoNumero === undefined) return "";
  const raw = String(proximoNumero);
  if (templatePdf === "BONES_MOCKUP" && raw.length < 4) {
    return raw.padStart(4, "0");
  }
  return raw;
}

export function extractNextNumeroFromPedido(
  numeroPedido: string | null | undefined,
  currentProximo: number | null | undefined
): number | null {
  if (numeroPedido) {
    const match = numeroPedido.trim().match(/^(\d+)/);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.max(parsed + 1, (currentProximo ?? 0));
      }
    }
  }
  if (currentProximo && currentProximo > 0) {
    return currentProximo + 1;
  }
  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
