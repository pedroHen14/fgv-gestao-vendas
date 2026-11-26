import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const PEDIDOS_BUCKET = "pedidos-arquivos";

export function slugifySegment(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "sem-nome"
  );
}

export function sanitizeFilename(filename: string): string {
  const parts = filename.split(".");
  const ext =
    parts.length > 1
      ? `.${parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}`
      : "";
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

export function buildPedidoPdfFilename(params: {
  numeroPedido: string | null | undefined;
  clienteNome: string;
}): string {
  const numero = params.numeroPedido?.trim()
    ? slugifySegment(params.numeroPedido.trim()).toUpperCase()
    : "ORCAMENTO";
  const cliente = slugifySegment(params.clienteNome).slice(0, 40);
  return `PEDIDO_${numero}_${cliente}.pdf`;
}

export function buildPedidoZipFilename(params: {
  numeroPedido: string | null | undefined;
  clienteNome: string;
}): string {
  const numero = params.numeroPedido?.trim()
    ? slugifySegment(params.numeroPedido.trim()).toUpperCase()
    : "ORCAMENTO";
  const cliente = slugifySegment(params.clienteNome).slice(0, 40);
  return `PED_${numero}_${cliente}.zip`;
}

export function buildClienteXlsxFilename(clienteNome: string): string {
  const cliente = slugifySegment(clienteNome).slice(0, 50);
  return `HISTORICO_${cliente}.xlsx`;
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

export async function uploadBufferToStorage(params: {
  storagePath: string;
  buffer: Buffer | Uint8Array;
  contentType: string;
  upsert?: boolean;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(PEDIDOS_BUCKET)
    .upload(params.storagePath, params.buffer, {
      contentType: params.contentType,
      upsert: params.upsert ?? false,
    });

  if (error) {
    throw new Error(
      `Não foi possível enviar o arquivo para a pasta do pedido: ${error.message}`
    );
  }
}

export async function downloadBufferFromStorage(
  storagePath: string
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PEDIDOS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Não foi possível baixar o arquivo da pasta do pedido: ${error?.message ?? "arquivo indisponível"}`
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: data.type || null,
  };
}

export async function deleteFromStorage(storagePath: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(PEDIDOS_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(
      `Não foi possível remover o arquivo da pasta: ${error.message}`
    );
  }
}
