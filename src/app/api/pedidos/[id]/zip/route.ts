import { NextResponse } from "next/server";
import JSZip from "jszip";
import { z } from "zod";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import { TIPO_ARQUIVO_ZIP_PREFIX, type TipoArquivoPedido } from "@/lib/constants";
import { getPedidoById } from "@/lib/services/pedidos";
import {
  buildPedidoZipFilename,
  downloadBufferFromStorage,
  sanitizeFilename,
  slugifySegment,
} from "@/lib/storage";
import { renderPedidoPdf } from "@/components/pdf/render-pedido-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const uuidSchema = z.string().uuid();

const TIPO_SORT_ORDER: Record<TipoArquivoPedido, number> = {
  MOCKUP: 1,
  ORDEM_COMPRA: 2,
  NOTA_FISCAL: 3,
  COMPROVANTE: 4,
  PEDIDO_PDF: 5,
  OUTRO: 6,
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthenticatedUser();

    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    const pedido = await getPedidoById(id);
    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    // 1. Gera e inclui o PDF atualizado do pedido na raiz do pacote
    const pdfBuffer = await renderPedidoPdf(pedido);
    const numeroSeg = pedido.numeroPedido?.trim()
      ? slugifySegment(pedido.numeroPedido.trim()).toUpperCase()
      : "ORCAMENTO";
    zip.file(`01_PEDIDO_${numeroSeg}.pdf`, pdfBuffer);

    // 2. Ordena os anexos por categoria e baixa do bucket privado
    const arquivosOrdenados = [...pedido.arquivos].sort((a, b) => {
      const diff = TIPO_SORT_ORDER[a.tipo] - TIPO_SORT_ORDER[b.tipo];
      if (diff !== 0) return diff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const usedNames = new Set<string>([`01_PEDIDO_${numeroSeg}.pdf`]);
    const counters: Partial<Record<TipoArquivoPedido, number>> = {};
    const avisos: string[] = [];

    const downloads = await Promise.allSettled(
      arquivosOrdenados.map(async (arq) => {
        const { buffer } = await downloadBufferFromStorage(arq.storagePath);
        return { arq, buffer };
      })
    );

    downloads.forEach((result, index) => {
      const arq = arquivosOrdenados[index];
      if (result.status !== "fulfilled") {
        avisos.push(
          `- ${arq.nomeOriginal} (${arq.tipo}): não foi possível baixar da pasta.`
        );
        return;
      }

      const nextCount = (counters[arq.tipo] ?? 0) + 1;
      counters[arq.tipo] = nextCount;

      const prefix = TIPO_ARQUIVO_ZIP_PREFIX[arq.tipo];
      const safeOriginal = sanitizeFilename(arq.nomeOriginal);
      let entryName = `${prefix}_${String(nextCount).padStart(2, "0")}_${safeOriginal}`;

      // Evita qualquer colisão de nome dentro do .zip
      let suffix = 2;
      while (usedNames.has(entryName)) {
        entryName = `${prefix}_${String(nextCount).padStart(2, "0")}_${suffix}_${safeOriginal}`;
        suffix++;
      }
      usedNames.add(entryName);

      zip.file(entryName, result.value.buffer);
    });

    if (avisos.length > 0) {
      zip.file(
        "99_AVISO_ARQUIVOS_INDISPONIVEIS.txt",
        [
          "Alguns anexos registrados não puderam ser baixados neste momento:",
          "",
          ...avisos,
        ].join("\n")
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const filename = buildPedidoZipFilename({
      numeroPedido: pedido.numeroPedido,
      clienteNome: pedido.cliente.razaoSocial,
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o arquivo .zip da pasta do pedido.",
      },
      { status: 500 }
    );
  }
}
