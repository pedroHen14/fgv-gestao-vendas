import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const PEDIDOS_BUCKET = "pedidos-arquivos";

export function slugifySegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sem-nome";
}

export function sanitizeFilename(filename: string): string {
  const parts = filename.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
  const base = slugifySegment(parts.join(".") || "arquivo");
  return `${base}${ext}`;
}

export function buildPedidoStoragePath(params: {
  ano?: number;
  clienteNome: string;
  numeroPedidoOuId: string;
  tipo: string;
  nomeOriginal: string;
}): string {
  const ano = params.ano ?? new Date().getFullYear();
  const clienteSlug = slugifySegment(params.clienteNome);
  const pedidoSegment = slugifySegment(params.numeroPedidoOuId);
  const tipoSegment = slugifySegment(params.tipo);
  const timestamp = Date.now();
  const nomeSanitizado = sanitizeFilename(params.nomeOriginal);

  return `${ano}/${clienteSlug}/${pedidoSegment}/${tipoSegment}_${timestamp}_${nomeSanitizado}`;
}

export async function createSignedStorageUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PEDIDOS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Não foi possível gerar link temporário para o arquivo: ${error?.message ?? "erro desconhecido"}`
    );
  }

  return data.signedUrl;
}
