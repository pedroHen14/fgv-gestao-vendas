import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { conteudos } from "@/db/schema";
import type { FormatoConteudo, StatusConteudo } from "@/lib/constants";
import type { ConteudoInput, RoteiroCenas } from "@/lib/validators/conteudo";

function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export interface ConteudoItem {
  id: string;
  tema: string;
  formato: FormatoConteudo;
  ocasiaoFeira: string | null;
  dataPublicacao: string | null;
  status: StatusConteudo;
  legendaIa: string | null;
  roteiroCenasIa: RoteiroCenas | null;
  linkCanva: string | null;
  createdAt: string;
  updatedAt: string;
}

function serializeConteudo(
  row: typeof conteudos.$inferSelect
): ConteudoItem {
  return {
    id: row.id,
    tema: row.tema,
    formato: row.formato,
    ocasiaoFeira: row.ocasiaoFeira,
    dataPublicacao: row.dataPublicacao,
    status: row.status,
    legendaIa: row.legendaIa,
    roteiroCenasIa: row.roteiroCenasIa ?? null,
    linkCanva: row.linkCanva,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listConteudos(): Promise<ConteudoItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(conteudos)
    .orderBy(
      sql`${conteudos.dataPublicacao} IS NULL`,
      asc(conteudos.dataPublicacao),
      desc(conteudos.createdAt)
    );

  return rows.map(serializeConteudo);
}

export async function getConteudoById(id: string): Promise<ConteudoItem | null> {
  const db = getDb();
  const row = await db.query.conteudos.findFirst({
    where: eq(conteudos.id, id),
  });
  return row ? serializeConteudo(row) : null;
}

export async function createConteudo(
  input: ConteudoInput
): Promise<ConteudoItem> {
  const db = getDb();
  const cenasLimpos =
    input.roteiro_cenas_ia && input.roteiro_cenas_ia.length > 0
      ? input.roteiro_cenas_ia.map((cena, idx) => ({
          ...cena,
          ordem: idx + 1,
        }))
      : null;

  const [created] = await db
    .insert(conteudos)
    .values({
      tema: input.tema.trim(),
      formato: input.formato,
      ocasiaoFeira: cleanOptionalText(input.ocasiao_feira),
      dataPublicacao: cleanOptionalText(input.data_publicacao),
      status: input.status,
      legendaIa: cleanOptionalText(input.legenda_ia),
      roteiroCenasIa: cenasLimpos,
      linkCanva: normalizeUrl(input.link_canva),
    })
    .returning();

  return serializeConteudo(created);
}

export async function updateConteudo(
  id: string,
  input: ConteudoInput
): Promise<ConteudoItem | null> {
  const db = getDb();
  const cenasLimpos =
    input.roteiro_cenas_ia && input.roteiro_cenas_ia.length > 0
      ? input.roteiro_cenas_ia.map((cena, idx) => ({
          ...cena,
          ordem: idx + 1,
        }))
      : null;

  const [updated] = await db
    .update(conteudos)
    .set({
      tema: input.tema.trim(),
      formato: input.formato,
      ocasiaoFeira: cleanOptionalText(input.ocasiao_feira),
      dataPublicacao: cleanOptionalText(input.data_publicacao),
      status: input.status,
      legendaIa: cleanOptionalText(input.legenda_ia),
      roteiroCenasIa: cenasLimpos,
      linkCanva: normalizeUrl(input.link_canva),
    })
    .where(eq(conteudos.id, id))
    .returning();

  return updated ? serializeConteudo(updated) : null;
}

export async function updateConteudoStatus(
  id: string,
  status: StatusConteudo
): Promise<ConteudoItem | null> {
  const db = getDb();
  const [updated] = await db
    .update(conteudos)
    .set({ status })
    .where(eq(conteudos.id, id))
    .returning();

  return updated ? serializeConteudo(updated) : null;
}

export async function saveIaResultToConteudo(params: {
  id: string;
  tema?: string;
  formato?: FormatoConteudo;
  ocasiaoFeira?: string | null;
  legendaIa: string;
  roteiroCenasIa: RoteiroCenas;
}): Promise<ConteudoItem | null> {
  const db = getDb();
  const existing = await db.query.conteudos.findFirst({
    where: eq(conteudos.id, params.id),
  });

  if (!existing) return null;

  const nextStatus: StatusConteudo =
    existing.status === "IDEIA" ? "ROTEIRO_PRONTO" : existing.status;

  const [updated] = await db
    .update(conteudos)
    .set({
      ...(params.tema ? { tema: params.tema.trim() } : {}),
      ...(params.formato ? { formato: params.formato } : {}),
      ...(params.ocasiaoFeira !== undefined
        ? { ocasiaoFeira: cleanOptionalText(params.ocasiaoFeira) }
        : {}),
      legendaIa: params.legendaIa.trim(),
      roteiroCenasIa: params.roteiroCenasIa.map((cena, idx) => ({
        ...cena,
        ordem: idx + 1,
      })),
      status: nextStatus,
    })
    .where(eq(conteudos.id, params.id))
    .returning();

  return updated ? serializeConteudo(updated) : null;
}

export async function deleteConteudo(id: string): Promise<boolean> {
  const db = getDb();
  const [deleted] = await db
    .delete(conteudos)
    .where(eq(conteudos.id, id))
    .returning({ id: conteudos.id });

  return Boolean(deleted);
}
