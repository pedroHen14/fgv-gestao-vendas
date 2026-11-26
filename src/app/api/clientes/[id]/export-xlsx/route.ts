import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import { getClienteParaExportacaoXlsx } from "@/lib/services/clientes";
import { generateClienteHistoricoXlsx } from "@/lib/services/cliente-export-xlsx";
import { buildClienteXlsxFilename } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const uuidSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthenticatedUser();

    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: "Identificador de cliente inválido." },
        { status: 400 }
      );
    }

    const cliente = await getClienteParaExportacaoXlsx(id);
    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const buffer = await generateClienteHistoricoXlsx(cliente);
    const filename = buildClienteXlsxFilename(cliente.razaoSocial);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
            : "Não foi possível gerar a planilha do cliente.",
      },
      { status: 500 }
    );
  }
}
