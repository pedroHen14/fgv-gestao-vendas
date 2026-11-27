"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import type { StatusConteudo } from "@/lib/constants";
import {
  conteudoSchema,
  conteudoStatusUpdateSchema,
  type ConteudoInput,
} from "@/lib/validators/conteudo";
import {
  createConteudo,
  deleteConteudo,
  updateConteudo,
  updateConteudoStatus,
  type ConteudoItem,
} from "@/lib/services/conteudos";

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

const uuidSchema = z.string().uuid();

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthRequiredError) {
    return error.message;
  }
  return fallback;
}

export async function createConteudoAction(
  values: ConteudoInput
): Promise<ActionResult<{ conteudo: ConteudoItem }>> {
  try {
    await requireAuthenticatedUser();
    const parsed = conteudoSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Confira os campos preenchidos do conteúdo.",
      };
    }

    const created = await createConteudo(parsed.data);
    revalidatePath("/conteudos");
    return { success: true, data: { conteudo: created } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Não foi possível salvar o conteúdo. Tente novamente."
      ),
    };
  }
}

export async function updateConteudoAction(
  id: string,
  values: ConteudoInput
): Promise<ActionResult<{ conteudo: ConteudoItem }>> {
  try {
    await requireAuthenticatedUser();
    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Conteúdo inválido." };
    }

    const parsed = conteudoSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Confira os campos preenchidos do conteúdo.",
      };
    }

    const updated = await updateConteudo(id, parsed.data);
    if (!updated) {
      return { success: false, error: "Conteúdo não encontrado." };
    }

    revalidatePath("/conteudos");
    return { success: true, data: { conteudo: updated } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Não foi possível atualizar o conteúdo. Tente novamente."
      ),
    };
  }
}

export async function updateStatusConteudoAction(
  id: string,
  status: StatusConteudo
): Promise<ActionResult<{ conteudo: ConteudoItem }>> {
  try {
    await requireAuthenticatedUser();
    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Conteúdo inválido." };
    }

    const parsed = conteudoStatusUpdateSchema.safeParse({ status });
    if (!parsed.success) {
      return { success: false, error: "Status de conteúdo inválido." };
    }

    const updated = await updateConteudoStatus(id, parsed.data.status);
    if (!updated) {
      return { success: false, error: "Conteúdo não encontrado." };
    }

    revalidatePath("/conteudos");
    return { success: true, data: { conteudo: updated } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Não foi possível alterar a etapa do conteúdo."
      ),
    };
  }
}

export async function deleteConteudoAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthenticatedUser();
    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Conteúdo inválido." };
    }

    const deleted = await deleteConteudo(id);
    if (!deleted) {
      return { success: false, error: "Conteúdo não encontrado." };
    }

    revalidatePath("/conteudos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Não foi possível excluir o conteúdo. Tente novamente."
      ),
    };
  }
}
