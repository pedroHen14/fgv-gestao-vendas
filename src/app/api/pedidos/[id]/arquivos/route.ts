import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import {
  listArquivosByPedido,
  uploadArquivoPedido,
} from "@/lib/services/arquivos";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  uploadArquivoMetaSchema,
} from "@/lib/validators/arquivo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

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

    const arquivos = await listArquivosByPedido(id);
    return NextResponse.json({ arquivos });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Não foi possível listar os arquivos do pedido." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthenticatedUser();
    const { id } = await context.params;

    const formData = await request.formData();
    const rawFile = formData.get("file");
    const rawTipo = String(formData.get("tipo") ?? "OUTRO");

    const parsedMeta = uploadArquivoMetaSchema.safeParse({
      pedido_id: id,
      tipo: rawTipo,
    });

    if (!parsedMeta.success) {
      return NextResponse.json(
        {
          error:
            parsedMeta.error.issues[0]?.message ??
            "Dados do arquivo inválidos.",
        },
        { status: 400 }
      );
    }

    if (!(rawFile instanceof File)) {
      return NextResponse.json(
        { error: "Selecione um arquivo para enviar." },
        { status: 400 }
      );
    }

    if (rawFile.size <= 0) {
      return NextResponse.json(
        { error: "O arquivo selecionado está vazio." },
        { status: 400 }
      );
    }

    if (rawFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo ultrapassa o limite máximo de 20 MB." },
        { status: 400 }
      );
    }

    const mimeType = rawFile.type || "application/octet-stream";
    if (
      rawFile.type &&
      !ALLOWED_UPLOAD_MIME_TYPES.has(rawFile.type.toLowerCase())
    ) {
      return NextResponse.json(
        {
          error:
            "Formato de arquivo não permitido. Envie imagens (JPG, PNG, WebP), PDF, Excel, Word ou TXT.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await rawFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const created = await uploadArquivoPedido({
      pedidoId: parsedMeta.data.pedido_id,
      tipo: parsedMeta.data.tipo,
      nomeOriginal: rawFile.name || "arquivo",
      mimeType,
      buffer,
    });

    revalidatePath(`/pedidos/${id}`);

    return NextResponse.json({ arquivo: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o arquivo.",
      },
      { status: 500 }
    );
  }
}
