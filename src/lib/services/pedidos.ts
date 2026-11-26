import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clientes,
  compradores,
  enderecos,
  fornecedores,
  pedidoItens,
  pedidos,
} from "@/db/schema";
import {
  extractNextNumeroFromPedido,
  getTodayIsoDate,
} from "@/lib/formatters";
import { isStatusOrcamento, type StatusPedido } from "@/lib/constants";
import {
  calcularTotaisPedido,
  type ConverterOrcamentoInput,
  type PedidoInput,
} from "@/lib/validators/pedido";

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanFormaPagamento(
  value: PedidoInput["forma_pagamento"]
): "DEPOSITO" | "BOLETO" | "PIX" | "OUTRO" | null {
  if (!value) return null;
  return value;
}

export async function listPedidos() {
  const db = getDb();
  const rows = await db.query.pedidos.findMany({
    orderBy: [desc(pedidos.updatedAt), desc(pedidos.createdAt)],
    with: {
      cliente: {
        columns: {
          id: true,
          razaoSocial: true,
          tipoPessoa: true,
        },
      },
      fornecedor: {
        columns: {
          id: true,
          nome: true,
          templatePdf: true,
          proximoNumeroPedido: true,
        },
      },
      comprador: {
        columns: {
          id: true,
          nome: true,
        },
      },
      itens: {
        columns: {
          id: true,
          descricaoTecnica: true,
          quantidade: true,
        },
        orderBy: [asc(pedidoItens.ordem)],
      },
    },
  });

  return rows;
}

export type PedidoListaItem = Awaited<ReturnType<typeof listPedidos>>[number];

export async function getPedidoById(id: string) {
  const db = getDb();
  return db.query.pedidos.findFirst({
    where: eq(pedidos.id, id),
    with: {
      cliente: {
        with: {
          enderecos: {
            orderBy: [desc(enderecos.principal), asc(enderecos.createdAt)],
          },
          compradores: {
            orderBy: [desc(compradores.ativo), asc(compradores.nome)],
          },
        },
      },
      comprador: true,
      fornecedor: true,
      enderecoFaturamento: true,
      enderecoEntrega: true,
      itens: {
        orderBy: [asc(pedidoItens.ordem)],
      },
      arquivos: true,
    },
  });
}

export type PedidoDetalhe = NonNullable<Awaited<ReturnType<typeof getPedidoById>>>;

export async function getFormOptionsParaPedido() {
  const db = getDb();
  const [listaClientes, listaFornecedores] = await Promise.all([
    db.query.clientes.findMany({
      orderBy: [asc(clientes.razaoSocial)],
      columns: {
        id: true,
        razaoSocial: true,
        tipoPessoa: true,
        cpfCnpj: true,
      },
      with: {
        enderecos: {
          orderBy: [desc(enderecos.principal), asc(enderecos.createdAt)],
        },
        compradores: {
          orderBy: [desc(compradores.ativo), asc(compradores.nome)],
        },
      },
    }),
    db.query.fornecedores.findMany({
      orderBy: [asc(fornecedores.nome)],
    }),
  ]);

  return {
    clientes: listaClientes,
    fornecedores: listaFornecedores,
  };
}

export type PedidoFormOptions = Awaited<ReturnType<typeof getFormOptionsParaPedido>>;

export async function createPedido(input: PedidoInput) {
  const db = getDb();
  const totais = calcularTotaisPedido(input.itens, input.desconto);

  return db.transaction(async (tx) => {
    const fornecedorId = cleanText(input.fornecedor_id);
    const numeroPedido = cleanText(input.numero_pedido);

    const [created] = await tx
      .insert(pedidos)
      .values({
        numeroPedido,
        clienteId: input.cliente_id,
        compradorId: cleanText(input.comprador_id),
        fornecedorId,
        enderecoFaturamentoId: cleanText(input.endereco_faturamento_id),
        enderecoEntregaId: input.entrega_mesmo_faturamento
          ? null
          : cleanText(input.endereco_entrega_id),
        entregaMesmoFaturamento: input.entrega_mesmo_faturamento,
        acEntrega: cleanText(input.ac_entrega),
        vendedor: input.vendedor.trim() || "Flavio",
        status: input.status,
        condicaoPagamento: cleanText(input.condicao_pagamento),
        formaPagamento: cleanFormaPagamento(input.forma_pagamento),
        ordemCompra: cleanText(input.ordem_compra),
        dataOrcamento: cleanText(input.data_orcamento) ?? getTodayIsoDate(),
        dataPedido: cleanText(input.data_pedido),
        proximoFollowup: cleanText(input.proximo_followup),
        prazoEntregaDias: input.prazo_entrega_dias ?? null,
        dataSaidaFabrica: cleanText(input.data_saida_fabrica),
        dataEntregaCliente: cleanText(input.data_entrega_cliente),
        subtotal: totais.subtotal.toFixed(2),
        desconto: totais.desconto.toFixed(2),
        valorTotal: totais.valorTotal.toFixed(2),
        eventoFeira: cleanText(input.evento_feira),
        obsNotaFiscal: cleanText(input.obs_nota_fiscal),
        observacoes: cleanText(input.observacoes),
        ocorrencias: cleanText(input.ocorrencias),
      })
      .returning();

    await tx.insert(pedidoItens).values(
      input.itens.map((item, idx) => ({
        pedidoId: created.id,
        descricaoTecnica: item.descricao_tecnica.trim(),
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario.toFixed(2),
        valorTotal: totais.itens[idx].valorTotal.toFixed(2),
        gradeTamanhos: item.grade_tamanhos ?? null,
        mockupStoragePath: cleanText(item.mockup_storage_path),
        ordem: idx + 1,
      }))
    );

    if (input.atualizar_proximo_numero && fornecedorId && numeroPedido) {
      const forn = await tx.query.fornecedores.findFirst({
        where: eq(fornecedores.id, fornecedorId),
      });
      if (forn) {
        const nextNum = extractNextNumeroFromPedido(
          numeroPedido,
          forn.proximoNumeroPedido
        );
        if (nextNum !== null) {
          await tx
            .update(fornecedores)
            .set({ proximoNumeroPedido: nextNum })
            .where(eq(fornecedores.id, fornecedorId));
        }
      }
    }

    return created;
  });
}

export async function updatePedido(id: string, input: PedidoInput) {
  const db = getDb();
  const totais = calcularTotaisPedido(input.itens, input.desconto);

  return db.transaction(async (tx) => {
    const fornecedorId = cleanText(input.fornecedor_id);
    const numeroPedido = cleanText(input.numero_pedido);

    const [updated] = await tx
      .update(pedidos)
      .set({
        numeroPedido,
        clienteId: input.cliente_id,
        compradorId: cleanText(input.comprador_id),
        fornecedorId,
        enderecoFaturamentoId: cleanText(input.endereco_faturamento_id),
        enderecoEntregaId: input.entrega_mesmo_faturamento
          ? null
          : cleanText(input.endereco_entrega_id),
        entregaMesmoFaturamento: input.entrega_mesmo_faturamento,
        acEntrega: cleanText(input.ac_entrega),
        vendedor: input.vendedor.trim() || "Flavio",
        status: input.status,
        condicaoPagamento: cleanText(input.condicao_pagamento),
        formaPagamento: cleanFormaPagamento(input.forma_pagamento),
        ordemCompra: cleanText(input.ordem_compra),
        dataOrcamento: cleanText(input.data_orcamento),
        dataPedido: cleanText(input.data_pedido),
        proximoFollowup: cleanText(input.proximo_followup),
        prazoEntregaDias: input.prazo_entrega_dias ?? null,
        dataSaidaFabrica: cleanText(input.data_saida_fabrica),
        dataEntregaCliente: cleanText(input.data_entrega_cliente),
        subtotal: totais.subtotal.toFixed(2),
        desconto: totais.desconto.toFixed(2),
        valorTotal: totais.valorTotal.toFixed(2),
        eventoFeira: cleanText(input.evento_feira),
        obsNotaFiscal: cleanText(input.obs_nota_fiscal),
        observacoes: cleanText(input.observacoes),
        ocorrencias: cleanText(input.ocorrencias),
        updatedAt: new Date(),
      })
      .where(eq(pedidos.id, id))
      .returning();

    if (!updated) {
      return null;
    }

    await tx.delete(pedidoItens).where(eq(pedidoItens.pedidoId, id));

    await tx.insert(pedidoItens).values(
      input.itens.map((item, idx) => ({
        pedidoId: id,
        descricaoTecnica: item.descricao_tecnica.trim(),
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario.toFixed(2),
        valorTotal: totais.itens[idx].valorTotal.toFixed(2),
        gradeTamanhos: item.grade_tamanhos ?? null,
        mockupStoragePath: cleanText(item.mockup_storage_path),
        ordem: idx + 1,
      }))
    );

    if (input.atualizar_proximo_numero && fornecedorId && numeroPedido) {
      const forn = await tx.query.fornecedores.findFirst({
        where: eq(fornecedores.id, fornecedorId),
      });
      if (forn) {
        const nextNum = extractNextNumeroFromPedido(
          numeroPedido,
          forn.proximoNumeroPedido
        );
        if (nextNum !== null) {
          await tx
            .update(fornecedores)
            .set({ proximoNumeroPedido: nextNum })
            .where(eq(fornecedores.id, fornecedorId));
        }
      }
    }

    return updated;
  });
}

/**
 * Converte um orçamento existente em Pedido Aprovado NO MESMO REGISTRO (nunca duplica).
 * Opcionalmente incrementa `fornecedores.proximo_numero_pedido`.
 */
export async function converterOrcamentoEmPedido(input: ConverterOrcamentoInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const existing = await tx.query.pedidos.findFirst({
      where: eq(pedidos.id, input.pedido_id),
      with: { fornecedor: true },
    });

    if (!existing) {
      throw new Error("Orçamento não encontrado.");
    }

    if (!isStatusOrcamento(existing.status)) {
      throw new Error("Este registro já foi convertido ou finalizado.");
    }

    const [updated] = await tx
      .update(pedidos)
      .set({
        status: "APROVADO",
        numeroPedido: input.numero_pedido.trim(),
        dataPedido: input.data_pedido.trim(),
        condicaoPagamento:
          cleanText(input.condicao_pagamento) ?? existing.condicaoPagamento,
        formaPagamento:
          cleanFormaPagamento(input.forma_pagamento) ?? existing.formaPagamento,
        ordemCompra: cleanText(input.ordem_compra) ?? existing.ordemCompra,
        prazoEntregaDias:
          input.prazo_entrega_dias ?? existing.prazoEntregaDias,
        dataSaidaFabrica:
          cleanText(input.data_saida_fabrica) ?? existing.dataSaidaFabrica,
        proximoFollowup: null,
        updatedAt: new Date(),
      })
      .where(eq(pedidos.id, input.pedido_id))
      .returning();

    if (input.atualizar_proximo_numero && existing.fornecedorId) {
      const nextNum = extractNextNumeroFromPedido(
        input.numero_pedido,
        existing.fornecedor?.proximoNumeroPedido
      );
      if (nextNum !== null) {
        await tx
          .update(fornecedores)
          .set({ proximoNumeroPedido: nextNum })
          .where(eq(fornecedores.id, existing.fornecedorId));
      }
    }

    return updated;
  });
}

export async function atualizarStatusPedido(id: string, status: StatusPedido) {
  const db = getDb();
  const existing = await db.query.pedidos.findFirst({
    where: eq(pedidos.id, id),
    columns: { id: true, dataPedido: true, dataEntregaCliente: true },
  });

  if (!existing) return null;

  const updates: Partial<typeof pedidos.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "APROVADO" && !existing.dataPedido) {
    updates.dataPedido = getTodayIsoDate();
  }
  if (status === "ENTREGUE" && !existing.dataEntregaCliente) {
    updates.dataEntregaCliente = getTodayIsoDate();
  }

  const [updated] = await db
    .update(pedidos)
    .set(updates)
    .where(eq(pedidos.id, id))
    .returning();

  return updated ?? null;
}

export async function deletePedido(id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(pedidos)
    .where(eq(pedidos.id, id))
    .returning({ id: pedidos.id, clienteId: pedidos.clienteId });

  return deleted ?? null;
}
