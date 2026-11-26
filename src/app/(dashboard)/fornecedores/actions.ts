"use server";

import { revalidatePath } from "next/cache";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import { fornecedorSchema, type FornecedorInput } from "@/lib/validators/fornecedor";
import {
  createFornecedor,
  deleteFornecedor,
  updateFornecedor,
} from "@/lib/services/fornecedores";

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

function getDbErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthRequiredError) {
    return error.message;
  }
  const pgCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : typeof error === "object" &&
          error !== null &&
          "cause" in error &&
          typeof (error as { cause?: { code?: unknown } }).cause?.code === "string"
        ? (error as { cause: { code: string } }).cause.code
        : null;

  if (pgCode === "23505") {
    return "Já existe um fornecedor cadastrado com esse nome.";
  }
  return fallback;
}

export async function createFornecedorAction(
  values: FornecedorInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuthenticatedUser();
    const parsed = fornecedorSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os dados do fornecedor.",
      };
    }

    const created = await createFornecedor(parsed.data);
    revalidatePath("/fornecedores");
    revalidatePath("/pedidos");
    revalidatePath("/pedidos/novo");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: getDbErrorMessage(
        error,
        "Não foi possível cadastrar o fornecedor. Tente novamente."
      ),
    };
  }
}

export async function updateFornecedorAction(
  id: string,
  values: FornecedorInput
): Promise<ActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = fornecedorSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os dados do fornecedor.",
      };
    }

    const updated = await updateFornecedor(id, parsed.data);
    if (!updated) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    revalidatePath("/fornecedores");
    revalidatePath("/pedidos");
    revalidatePath("/pedidos/novo");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getDbErrorMessage(
        error,
        "Não foi possível atualizar o fornecedor. Tente novamente."
      ),
    };
  }
}

export async function deleteFornecedorAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthenticatedUser();
    const deleted = await deleteFornecedor(id);
    if (!deleted) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    revalidatePath("/fornecedores");
    revalidatePath("/pedidos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getDbErrorMessage(
        error,
        "Não foi possível excluir o fornecedor. Tente novamente."
      ),
    };
  }
}
