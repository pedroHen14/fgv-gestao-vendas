"use server";

import { revalidatePath } from "next/cache";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/auth";
import {
  adiarFollowupSchema,
  atualizarStatusPedidoSchema,
  converterOrcamentoSchema,
  pedidoSchema,
  type ConverterOrcamentoInput,
  type PedidoInput,
} from "@/lib/validators/pedido";
import {
  atualizarProximoFollowup,
  atualizarStatusPedido,
  converterOrcamentoEmPedido,
  createPedido,
  deletePedido,
  updatePedido,
} from "@/lib/services/pedidos";
import type { StatusPedido } from "@/lib/constants";

export interface PedidoActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof AuthRequiredError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function createPedidoAction(
  values: PedidoInput
): Promise<PedidoActionResult<{ id: string }>> {
  try {
    await requireAuthenticatedUser();
    const parsed = pedidoSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos do pedido.",
      };
    }

    const created = await createPedido(parsed.data);
    revalidatePath("/pedidos");
    revalidatePath(`/clientes/${parsed.data.cliente_id}`);
    revalidatePath("/fornecedores");
    revalidatePath("/");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: formatError(
        error,
        "Não foi possível salvar o orçamento/pedido. Tente novamente."
      ),
    };
  }
}

export async function updatePedidoAction(
  id: string,
  values: PedidoInput
): Promise<PedidoActionResult<{ id: string }>> {
  try {
    await requireAuthenticatedUser();
    const parsed = pedidoSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos do pedido.",
      };
    }

    const updated = await updatePedido(id, parsed.data);
    if (!updated) {
      return { success: false, error: "Registro não encontrado." };
    }

    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${id}`);
    revalidatePath(`/clientes/${parsed.data.cliente_id}`);
    revalidatePath("/fornecedores");
    revalidatePath("/");
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    return {
      success: false,
      error: formatError(
        error,
        "Não foi possível atualizar o pedido. Tente novamente."
      ),
    };
  }
}

export async function converterOrcamentoAction(
  values: ConverterOrcamentoInput
): Promise<PedidoActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = converterOrcamentoSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Confira os dados para aprovar o pedido.",
      };
    }

    const updated = await converterOrcamentoEmPedido(parsed.data);
    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${parsed.data.pedido_id}`);
    revalidatePath(`/clientes/${updated.clienteId}`);
    revalidatePath("/fornecedores");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(
        error,
        "Não foi possível converter o orçamento em pedido."
      ),
    };
  }
}

export async function atualizarStatusPedidoAction(
  pedidoId: string,
  status: StatusPedido
): Promise<PedidoActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = atualizarStatusPedidoSchema.safeParse({
      pedido_id: pedidoId,
      status,
    });
    if (!parsed.success) {
      return { success: false, error: "Status inválido." };
    }

    const updated = await atualizarStatusPedido(
      parsed.data.pedido_id,
      parsed.data.status
    );
    if (!updated) {
      return { success: false, error: "Pedido não encontrado." };
    }

    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${pedidoId}`);
    revalidatePath(`/clientes/${updated.clienteId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Não foi possível atualizar o status."),
    };
  }
}

export async function adiarFollowupAction(
  pedidoId: string,
  novaData: string
): Promise<PedidoActionResult> {
  try {
    await requireAuthenticatedUser();
    const parsed = adiarFollowupSchema.safeParse({
      pedido_id: pedidoId,
      nova_data: novaData,
    });
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Data inválida para reagendar o retorno.",
      };
    }

    const updated = await atualizarProximoFollowup(
      parsed.data.pedido_id,
      parsed.data.nova_data
    );
    if (!updated) {
      return { success: false, error: "Orçamento não encontrado." };
    }

    revalidatePath("/");
    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${pedidoId}`);
    revalidatePath(`/clientes/${updated.clienteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(
        error,
        "Não foi possível reagendar a data de retorno."
      ),
    };
  }
}

export async function deletePedidoAction(
  pedidoId: string
): Promise<PedidoActionResult> {
  try {
    await requireAuthenticatedUser();
    const deleted = await deletePedido(pedidoId);
    if (!deleted) {
      return { success: false, error: "Registro não encontrado." };
    }

    revalidatePath("/pedidos");
    revalidatePath(`/clientes/${deleted.clienteId}`);
    revalidatePath("/fornecedores");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Não foi possível excluir o registro."),
    };
  }
}
