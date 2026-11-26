import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import {
  deleteArquivoPedido,
  getPedidoArquivoById,
} from "@/lib/services/arquivos";
import { downloadBufferFromStorage } from "@/lib/storage";
import { deleteArquivoSchema } from "@/lib/validators/arquivo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; arquivoId: string }> }
) {
  try {
    await requireAuthenticatedUser();
    const { id, arquivoId } = await context.params;

    const parsed = deleteArquivoSchema.safeParse({
      pedido_id: id,
      arquivo_id: arquivoId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Arquivo inválido." },
        { status: 400 }
      );
    }

    const arquivo = await getPedidoArquivoById(
      parsed.data.pedido_id,
      parsed.data.arquivo_id
    );
    if (!arquivo) {
      return NextResponse.json(
        { error: "Arquivo não encontrado na pasta deste pedido." },
        { status: 404 }
      );
    }

    const { buffer, contentType } = await downloadBufferFromStorage(
      arquivo.storagePath
    );

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "1";
    const disposition = shouldDownload ? "attachment" : "inline";
    const safeName = arquivo.nomeOriginal.replace(/["\r\n]/g, "");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          arquivo.mimeType || contentType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
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
            : "Não foi possível abrir o arquivo.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; arquivoId: string }> }
) {
  try {
    await requireAuthenticatedUser();
    const { id, arquivoId } = await context.params;

    const parsed = deleteArquivoSchema.safeParse({
      pedido_id: id,
      arquivo_id: arquivoId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Arquivo inválido." },
        { status: 400 }
      );
    }

    const deleted = await deleteArquivoPedido(
      parsed.data.pedido_id,
      parsed.data.arquivo_id
    );
    if (!deleted) {
      return NextResponse.json(
        { error: "Arquivo não encontrado." },
        { status: 404 }
      );
    }

    revalidatePath(`/pedidos/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível remover o arquivo.",
      },
      { status: 500 }
    );
  }
}
