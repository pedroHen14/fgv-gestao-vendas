"use server";

import { revalidatePath } from "next/cache";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import {
  clienteComInicialSchema,
  clienteSchema,
  compradorSchema,
  enderecoSchema,
  interacaoSchema,
  type ClienteComInicialInput,
  type ClienteInput,
  type CompradorInput,
  type EnderecoInput,
  type InteracaoInput,
} from "@/lib/validators/cliente";
import {
  createClienteComInicial,
  createComprador,
  createEndereco,
  createInteracao,
  deleteCliente,
  deleteComprador,
  deleteEndereco,
  deleteInteracao,
  updateCliente,
  updateComprador,
  updateEndereco,
} from "@/lib/services/clientes";

export interface ClienteActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
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
    return "Já existe um cliente cadastrado com este CPF/CNPJ.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function createClienteAction(
  values: ClienteComInicialInput
): Promise<ClienteActionResult<{ id: string }>> {
  try {
    await requireAuthenticatedUser();
    const parsed = clienteComInicialSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os dados do cliente.",
      };
    }

    const created = await createClienteComInicial(parsed.data);
    revalidatePath("/clientes");
    revalidatePath("/pedidos/novo");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Não foi possível cadastrar o cliente. Tente novamente."
      ),
    };
  }
}

export async function updateClienteAction(
  id: string,
  values: ClienteInput
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = clienteSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os dados do cliente.",
      };
    }

    const updated = await updateCliente(id, parsed.data);
    if (!updated) {
      return { success: false, error: "Cliente não encontrado." };
    }

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/pedidos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Não foi possível atualizar o cliente. Tente novamente."
      ),
    };
  }
}

export async function deleteClienteAction(
  id: string
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const deleted = await deleteCliente(id);
    if (!deleted) {
      return { success: false, error: "Cliente não encontrado." };
    }

    revalidatePath("/clientes");
    revalidatePath("/pedidos/novo");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Não foi possível excluir o cliente."
      ),
    };
  }
}

// ==========================================
// ENDEREÇOS
// ==========================================
export async function saveEnderecoAction(
  clienteId: string,
  values: EnderecoInput,
  enderecoId?: string
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = enderecoSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os dados do endereço.",
      };
    }

    if (enderecoId) {
      const updated = await updateEndereco(enderecoId, clienteId, parsed.data);
      if (!updated) {
        return { success: false, error: "Endereço não encontrado." };
      }
    } else {
      await createEndereco(clienteId, parsed.data);
    }

    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Não foi possível salvar o endereço."),
    };
  }
}

export async function deleteEnderecoAction(
  clienteId: string,
  enderecoId: string
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const deleted = await deleteEndereco(enderecoId, clienteId);
    if (!deleted) {
      return { success: false, error: "Endereço não encontrado." };
    }
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Não foi possível excluir o endereço."),
    };
  }
}

// ==========================================
// COMPRADORES
// ==========================================
export async function saveCompradorAction(
  clienteId: string,
  values: CompradorInput,
  compradorId?: string
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = compradorSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os dados do comprador.",
      };
    }

    if (compradorId) {
      const updated = await updateComprador(compradorId, clienteId, parsed.data);
      if (!updated) {
        return { success: false, error: "Comprador não encontrado." };
      }
    } else {
      await createComprador(clienteId, parsed.data);
    }

    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Não foi possível salvar o comprador."),
    };
  }
}

export async function deleteCompradorAction(
  clienteId: string,
  compradorId: string
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const deleted = await deleteComprador(compradorId, clienteId);
    if (!deleted) {
      return { success: false, error: "Comprador não encontrado." };
    }
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Não foi possível excluir o comprador."),
    };
  }
}

// ==========================================
// INTERAÇÕES
// ==========================================
export async function createInteracaoAction(
  clienteId: string,
  values: InteracaoInput
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = interacaoSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os dados do contato.",
      };
    }

    await createInteracao(clienteId, parsed.data);
    revalidatePath(`/clientes/${clienteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Não foi possível registrar o contato."),
    };
  }
}

export async function deleteInteracaoAction(
  clienteId: string,
  interacaoId: string
): Promise<ClienteActionResult> {
  try {
    await requireAuthenticatedUser();
    const deleted = await deleteInteracao(interacaoId, clienteId);
    if (!deleted) {
      return { success: false, error: "Registro de contato não encontrado." };
    }
    revalidatePath(`/clientes/${clienteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Não foi possível excluir o contato."),
    };
  }
}
