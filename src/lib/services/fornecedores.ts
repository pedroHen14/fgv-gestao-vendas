import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { fornecedores, pedidos } from "@/db/schema";
import type { FornecedorInput } from "@/lib/validators/fornecedor";

function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface FornecedorResumo {
  id: string;
  nome: string;
  templatePdf: "BONES_MOCKUP" | "CONFECCAO_GRADE" | "PADRAO";
  proximoNumeroPedido: number | null;
  contato: string | null;
  observacoes: string | null;
  createdAt: Date;
  totalPedidos: number;
}

export async function listFornecedores(): Promise<FornecedorResumo[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: fornecedores.id,
      nome: fornecedores.nome,
      templatePdf: fornecedores.templatePdf,
      proximoNumeroPedido: fornecedores.proximoNumeroPedido,
      contato: fornecedores.contato,
      observacoes: fornecedores.observacoes,
      createdAt: fornecedores.createdAt,
      totalPedidos: sql<number>`count(${pedidos.id})::int`,
    })
    .from(fornecedores)
    .leftJoin(pedidos, eq(pedidos.fornecedorId, fornecedores.id))
    .groupBy(fornecedores.id)
    .orderBy(asc(fornecedores.nome));

  return rows;
}

export async function getFornecedorById(id: string) {
  const db = getDb();
  return db.query.fornecedores.findFirst({
    where: eq(fornecedores.id, id),
  });
}

export async function createFornecedor(input: FornecedorInput) {
  const db = getDb();
  const [created] = await db
    .insert(fornecedores)
    .values({
      nome: input.nome.trim(),
      templatePdf: input.template_pdf,
      proximoNumeroPedido: input.proximo_numero_pedido ?? null,
      contato: cleanOptionalText(input.contato),
      observacoes: cleanOptionalText(input.observacoes),
    })
    .returning();

  return created;
}

export async function updateFornecedor(id: string, input: FornecedorInput) {
  const db = getDb();
  const [updated] = await db
    .update(fornecedores)
    .set({
      nome: input.nome.trim(),
      templatePdf: input.template_pdf,
      proximoNumeroPedido: input.proximo_numero_pedido ?? null,
      contato: cleanOptionalText(input.contato),
      observacoes: cleanOptionalText(input.observacoes),
    })
    .where(eq(fornecedores.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteFornecedor(id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(fornecedores)
    .where(eq(fornecedores.id, id))
    .returning({ id: fornecedores.id });

  return Boolean(deleted);
}
