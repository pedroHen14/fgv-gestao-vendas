import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clientes,
  compradores,
  enderecos,
  interacoesCliente,
  pedidos,
} from "@/db/schema";
import { onlyDigits } from "@/lib/formatters";
import type {
  ClienteComInicialInput,
  ClienteInput,
  CompradorInput,
  EnderecoInput,
  InteracaoInput,
} from "@/lib/validators/cliente";

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanDigitsOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = onlyDigits(trimmed);
  return digits || trimmed;
}

export interface ClienteResumo {
  id: string;
  tipoPessoa: "PJ" | "PF";
  razaoSocial: string;
  cpfCnpj: string | null;
  inscricaoEstadual: string | null;
  origemIndicacao: string | null;
  cidadeUfPrincipal: string | null;
  compradoresResumo: { id: string; nome: string; email: string | null }[];
  totalEnderecos: number;
  totalPedidos: number;
  valorVendidoTotal: number;
}

const STATUS_FATURADO = new Set([
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
  "ENTREGUE",
]);

export async function listClientes(): Promise<ClienteResumo[]> {
  const db = getDb();
  const rows = await db.query.clientes.findMany({
    orderBy: [asc(clientes.razaoSocial)],
    with: {
      enderecos: {
        orderBy: [desc(enderecos.principal), asc(enderecos.createdAt)],
      },
      compradores: {
        orderBy: [desc(compradores.ativo), asc(compradores.nome)],
      },
      pedidos: {
        columns: {
          id: true,
          status: true,
          valorTotal: true,
        },
      },
    },
  });

  return rows.map((cliente) => {
    const enderecoPrincipal = cliente.enderecos[0] ?? null;
    const valorVendidoTotal = cliente.pedidos.reduce((acc, p) => {
      if (!STATUS_FATURADO.has(p.status)) return acc;
      return acc + Number(p.valorTotal ?? 0);
    }, 0);

    return {
      id: cliente.id,
      tipoPessoa: cliente.tipoPessoa,
      razaoSocial: cliente.razaoSocial,
      cpfCnpj: cliente.cpfCnpj,
      inscricaoEstadual: cliente.inscricaoEstadual,
      origemIndicacao: cliente.origemIndicacao,
      cidadeUfPrincipal: enderecoPrincipal
        ? `${enderecoPrincipal.cidade}/${enderecoPrincipal.uf.trim()}`
        : null,
      compradoresResumo: cliente.compradores.map((c) => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
      })),
      totalEnderecos: cliente.enderecos.length,
      totalPedidos: cliente.pedidos.length,
      valorVendidoTotal,
    };
  });
}

export async function getClienteById(id: string) {
  const db = getDb();
  return db.query.clientes.findFirst({
    where: eq(clientes.id, id),
    with: {
      enderecos: {
        orderBy: [desc(enderecos.principal), asc(enderecos.createdAt)],
      },
      compradores: {
        orderBy: [desc(compradores.ativo), asc(compradores.nome)],
      },
      pedidos: {
        orderBy: [desc(pedidos.createdAt)],
        with: {
          fornecedor: true,
          comprador: true,
        },
      },
      interacoes: {
        orderBy: [desc(interacoesCliente.dataInteracao)],
        with: {
          comprador: true,
          pedido: {
            columns: {
              id: true,
              numeroPedido: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export type ClienteDetalhe = NonNullable<Awaited<ReturnType<typeof getClienteById>>>;

export async function createClienteComInicial(input: ClienteComInicialInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [createdCliente] = await tx
      .insert(clientes)
      .values({
        tipoPessoa: input.cliente.tipo_pessoa,
        razaoSocial: input.cliente.razao_social.trim(),
        cpfCnpj: cleanDigitsOrNull(input.cliente.cpf_cnpj),
        inscricaoEstadual: cleanText(input.cliente.inscricao_estadual),
        dataNascimento: cleanText(input.cliente.data_nascimento),
        origemIndicacao: cleanText(input.cliente.origem_indicacao),
        observacoes: cleanText(input.cliente.observacoes),
      })
      .returning();

    if (input.endereco) {
      await tx.insert(enderecos).values({
        clienteId: createdCliente.id,
        tipo: input.endereco.tipo,
        rotulo: cleanText(input.endereco.rotulo) ?? "Matriz",
        cnpjFilial: cleanDigitsOrNull(input.endereco.cnpj_filial),
        ieFilial: cleanText(input.endereco.ie_filial),
        logradouro: input.endereco.logradouro.trim(),
        bairro: cleanText(input.endereco.bairro),
        cidade: input.endereco.cidade.trim(),
        uf: input.endereco.uf.trim().toUpperCase(),
        cep: cleanDigitsOrNull(input.endereco.cep),
        principal: true,
      });
    }

    if (input.comprador) {
      await tx.insert(compradores).values({
        clienteId: createdCliente.id,
        nome: input.comprador.nome.trim(),
        email: cleanText(input.comprador.email),
        emailFinanceiro: cleanText(input.comprador.email_financeiro),
        telefone: cleanText(input.comprador.telefone),
        departamento: cleanText(input.comprador.departamento),
        ativo: input.comprador.ativo ?? true,
      });
    }

    return createdCliente;
  });
}

export async function updateCliente(id: string, input: ClienteInput) {
  const db = getDb();
  const [updated] = await db
    .update(clientes)
    .set({
      tipoPessoa: input.tipo_pessoa,
      razaoSocial: input.razao_social.trim(),
      cpfCnpj: cleanDigitsOrNull(input.cpf_cnpj),
      inscricaoEstadual: cleanText(input.inscricao_estadual),
      dataNascimento:
        input.tipo_pessoa === "PF" ? cleanText(input.data_nascimento) : null,
      origemIndicacao: cleanText(input.origem_indicacao),
      observacoes: cleanText(input.observacoes),
      updatedAt: new Date(),
    })
    .where(eq(clientes.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteCliente(id: string) {
  const db = getDb();
  const existingPedido = await db.query.pedidos.findFirst({
    where: eq(pedidos.clienteId, id),
    columns: { id: true },
  });

  if (existingPedido) {
    throw new Error(
      "Este cliente possui orçamentos ou pedidos registrados e não pode ser excluído."
    );
  }

  const [deleted] = await db
    .delete(clientes)
    .where(eq(clientes.id, id))
    .returning({ id: clientes.id });

  return Boolean(deleted);
}

// ==========================================
// ENDEREÇOS / FILIAIS
// ==========================================
export async function createEndereco(clienteId: string, input: EnderecoInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const existing = await tx.query.enderecos.findMany({
      where: eq(enderecos.clienteId, clienteId),
      columns: { id: true },
    });

    const shouldBePrincipal = input.principal || existing.length === 0;
    if (shouldBePrincipal && existing.length > 0) {
      await tx
        .update(enderecos)
        .set({ principal: false })
        .where(eq(enderecos.clienteId, clienteId));
    }

    const [created] = await tx
      .insert(enderecos)
      .values({
        clienteId,
        tipo: input.tipo,
        rotulo: cleanText(input.rotulo),
        cnpjFilial: cleanDigitsOrNull(input.cnpj_filial),
        ieFilial: cleanText(input.ie_filial),
        logradouro: input.logradouro.trim(),
        bairro: cleanText(input.bairro),
        cidade: input.cidade.trim(),
        uf: input.uf.trim().toUpperCase(),
        cep: cleanDigitsOrNull(input.cep),
        principal: shouldBePrincipal,
      })
      .returning();

    return created;
  });
}

export async function updateEndereco(
  id: string,
  clienteId: string,
  input: EnderecoInput
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    if (input.principal) {
      await tx
        .update(enderecos)
        .set({ principal: false })
        .where(eq(enderecos.clienteId, clienteId));
    }

    const [updated] = await tx
      .update(enderecos)
      .set({
        tipo: input.tipo,
        rotulo: cleanText(input.rotulo),
        cnpjFilial: cleanDigitsOrNull(input.cnpj_filial),
        ieFilial: cleanText(input.ie_filial),
        logradouro: input.logradouro.trim(),
        bairro: cleanText(input.bairro),
        cidade: input.cidade.trim(),
        uf: input.uf.trim().toUpperCase(),
        cep: cleanDigitsOrNull(input.cep),
        principal: input.principal,
      })
      .where(and(eq(enderecos.id, id), eq(enderecos.clienteId, clienteId)))
      .returning();

    return updated ?? null;
  });
}

export async function deleteEndereco(id: string, clienteId: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(enderecos)
    .where(and(eq(enderecos.id, id), eq(enderecos.clienteId, clienteId)))
    .returning({ id: enderecos.id });

  return Boolean(deleted);
}

// ==========================================
// COMPRADORES
// ==========================================
export async function createComprador(clienteId: string, input: CompradorInput) {
  const db = getDb();
  const [created] = await db
    .insert(compradores)
    .values({
      clienteId,
      nome: input.nome.trim(),
      email: cleanText(input.email),
      emailFinanceiro: cleanText(input.email_financeiro),
      telefone: cleanText(input.telefone),
      departamento: cleanText(input.departamento),
      ativo: input.ativo ?? true,
    })
    .returning();

  return created;
}

export async function updateComprador(
  id: string,
  clienteId: string,
  input: CompradorInput
) {
  const db = getDb();
  const [updated] = await db
    .update(compradores)
    .set({
      nome: input.nome.trim(),
      email: cleanText(input.email),
      emailFinanceiro: cleanText(input.email_financeiro),
      telefone: cleanText(input.telefone),
      departamento: cleanText(input.departamento),
      ativo: input.ativo,
    })
    .where(and(eq(compradores.id, id), eq(compradores.clienteId, clienteId)))
    .returning();

  return updated ?? null;
}

export async function deleteComprador(id: string, clienteId: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(compradores)
    .where(and(eq(compradores.id, id), eq(compradores.clienteId, clienteId)))
    .returning({ id: compradores.id });

  return Boolean(deleted);
}

// ==========================================
// INTERAÇÕES / LINHA DO TEMPO
// ==========================================
export async function createInteracao(clienteId: string, input: InteracaoInput) {
  const db = getDb();
  const dataInteracao = input.data_interacao
    ? new Date(input.data_interacao)
    : new Date();

  const [created] = await db
    .insert(interacoesCliente)
    .values({
      clienteId,
      tipo: input.tipo,
      resumo: input.resumo.trim(),
      compradorId: cleanText(input.comprador_id),
      pedidoId: cleanText(input.pedido_id),
      dataInteracao: Number.isNaN(dataInteracao.getTime())
        ? new Date()
        : dataInteracao,
    })
    .returning();

  return created;
}

export async function deleteInteracao(id: string, clienteId: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(interacoesCliente)
    .where(
      and(
        eq(interacoesCliente.id, id),
        eq(interacoesCliente.clienteId, clienteId)
      )
    )
    .returning({ id: interacoesCliente.id });

  return Boolean(deleted);
}
