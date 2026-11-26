import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import { getPedidoById } from "@/lib/services/pedidos";
import { saveGeneratedPdfToPedido } from "@/lib/services/arquivos";
import { buildPedidoPdfFilename } from "@/lib/storage";
import { renderPedidoPdf } from "@/components/pdf/render-pedido-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export async function GET(
  request: Request,
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

    const pdfBuffer = await renderPedidoPdf(pedido);
    const filename = buildPedidoPdfFilename({
      numeroPedido: pedido.numeroPedido,
      clienteNome: pedido.cliente.razaoSocial,
    });

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "1";
    const shouldSave = url.searchParams.get("save") === "1";

    let savedArquivoId: string | null = null;
    if (shouldSave) {
      const saved = await saveGeneratedPdfToPedido({
        pedidoId: pedido.id,
        numeroPedido: pedido.numeroPedido,
        clienteNome: pedido.cliente.razaoSocial,
        pdfBuffer,
      });
      savedArquivoId = saved.id;
      revalidatePath(`/pedidos/${pedido.id}`);
    }

    const disposition = shouldDownload ? "attachment" : "inline";
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
    };

    if (savedArquivoId) {
      headers["X-Saved-Arquivo-Id"] = savedArquivoId;
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers,
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
            : "Não foi possível gerar o PDF do pedido.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const pdfBuffer = await renderPedidoPdf(pedido);
    const saved = await saveGeneratedPdfToPedido({
      pedidoId: pedido.id,
      numeroPedido: pedido.numeroPedido,
      clienteNome: pedido.cliente.razaoSocial,
      pdfBuffer,
    });

    revalidatePath(`/pedidos/${pedido.id}`);

    return NextResponse.json({ arquivo: saved }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o PDF na pasta do pedido.",
      },
      { status: 500 }
    );
  }
}
