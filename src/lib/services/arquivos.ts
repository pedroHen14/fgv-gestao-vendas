import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pedidoArquivos, pedidoItens, pedidos } from "@/db/schema";
import type { TipoArquivoPedido } from "@/lib/constants";
import {
  buildPedidoPdfFilename,
  buildPedidoStoragePath,
  deleteFromStorage,
  uploadBufferToStorage,
} from "@/lib/storage";

export async function listArquivosByPedido(pedidoId: string) {
  const db = getDb();
  return db.query.pedidoArquivos.findMany({
    where: eq(pedidoArquivos.pedidoId, pedidoId),
    orderBy: [desc(pedidoArquivos.createdAt)],
  });
}

export async function getPedidoArquivoById(pedidoId: string, arquivoId: string) {
  const db = getDb();
  return db.query.pedidoArquivos.findFirst({
    where: and(
      eq(pedidoArquivos.id, arquivoId),
      eq(pedidoArquivos.pedidoId, pedidoId)
    ),
  });
}

export async function uploadArquivoPedido(params: {
  pedidoId: string;
  tipo: TipoArquivoPedido;
  nomeOriginal: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const db = getDb();
  const pedido = await db.query.pedidos.findFirst({
    where: eq(pedidos.id, params.pedidoId),
    columns: {
      id: true,
      numeroPedido: true,
      dataPedido: true,
      dataOrcamento: true,
    },
    with: {
      cliente: {
        columns: {
          razaoSocial: true,
        },
      },
    },
  });

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  const refDate = pedido.dataPedido ?? pedido.dataOrcamento;
  const ano = refDate
    ? Number.parseInt(refDate.slice(0, 4), 10) || new Date().getFullYear()
    : new Date().getFullYear();

  const storagePath = buildPedidoStoragePath({
    ano,
    clienteNome: pedido.cliente.razaoSocial,
    numeroPedidoOuId: pedido.numeroPedido || pedido.id.slice(0, 8),
    tipo: params.tipo,
    nomeOriginal: params.nomeOriginal,
  });

  await uploadBufferToStorage({
    storagePath,
    buffer: params.buffer,
    contentType: params.mimeType || "application/octet-stream",
  });

  try {
    const [created] = await db
      .insert(pedidoArquivos)
      .values({
        pedidoId: params.pedidoId,
        tipo: params.tipo,
        nomeOriginal: params.nomeOriginal,
        storagePath,
        mimeType: params.mimeType || null,
        tamanhoBytes: params.buffer.byteLength,
      })
      .returning();

    return created;
  } catch (error) {
    // Limpa o arquivo órfão caso a gravação no banco falhe
    await deleteFromStorage(storagePath).catch(() => undefined);
    throw error;
  }
}

export async function saveGeneratedPdfToPedido(params: {
  pedidoId: string;
  numeroPedido: string | null;
  clienteNome: string;
  pdfBuffer: Buffer;
}) {
  const filename = buildPedidoPdfFilename({
    numeroPedido: params.numeroPedido,
    clienteNome: params.clienteNome,
  });

  return uploadArquivoPedido({
    pedidoId: params.pedidoId,
    tipo: "PEDIDO_PDF",
    nomeOriginal: filename,
    mimeType: "application/pdf",
    buffer: params.pdfBuffer,
  });
}

export async function deleteArquivoPedido(pedidoId: string, arquivoId: string) {
  const db = getDb();
  const existing = await getPedidoArquivoById(pedidoId, arquivoId);

  if (!existing) {
    return null;
  }

  // Remove do Storage primeiro (se já não existir, segue removendo do banco)
  await deleteFromStorage(existing.storagePath).catch(() => undefined);

  // Limpa eventual referência de mockup em itens do pedido
  await db
    .update(pedidoItens)
    .set({ mockupStoragePath: null })
    .where(
      and(
        eq(pedidoItens.pedidoId, pedidoId),
        eq(pedidoItens.mockupStoragePath, existing.storagePath)
      )
    );

  const [deleted] = await db
    .delete(pedidoArquivos)
    .where(
      and(
        eq(pedidoArquivos.id, arquivoId),
        eq(pedidoArquivos.pedidoId, pedidoId)
      )
    )
    .returning();

  return deleted ?? null;
}
