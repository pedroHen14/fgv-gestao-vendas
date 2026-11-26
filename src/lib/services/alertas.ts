import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { pedidoItens, pedidos } from "@/db/schema";
import {
  addDaysToIsoDate,
  diffIsoDays,
  getMonthRangeFromIso,
  getTodayIsoDate,
  roundMoney,
  toSaoPauloIsoDate,
} from "@/lib/formatters";
import type { FormaPagamento, StatusPedido, TemplatePdfFornecedor } from "@/lib/constants";

const STATUS_FOLLOWUP_ALERTA: StatusPedido[] = [
  "ORCAMENTO_ENVIADO",
  "AGUARDANDO_FORNECEDOR",
];

const STATUS_ORCAMENTO_ABERTO: StatusPedido[] = [
  "ORCAMENTO_RASCUNHO",
  "AGUARDANDO_FORNECEDOR",
  "ORCAMENTO_ENVIADO",
];

const STATUS_PEDIDOS_FECHADOS: StatusPedido[] = [
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
  "ENTREGUE",
];

export interface AlertaFollowupItem {
  id: string;
  numeroPedido: string | null;
  status: StatusPedido;
  clienteId: string;
  clienteNome: string;
  compradorNome: string | null;
  fornecedor: {
    id: string;
    nome: string;
    templatePdf: TemplatePdfFornecedor;
    proximoNumeroPedido: number | null;
  } | null;
  condicaoPagamento: string | null;
  formaPagamento: FormaPagamento | null;
  ordemCompra: string | null;
  prazoEntregaDias: number | null;
  dataSaidaFabrica: string | null;
  proximoFollowup: string;
  diasAtraso: number;
  valorTotal: string;
  eventoFeira: string | null;
  primeiroItem: string | null;
}

export interface AlertaProducaoItem {
  id: string;
  numeroPedido: string | null;
  clienteId: string;
  clienteNome: string;
  fornecedorNome: string | null;
  dataPedido: string | null;
  prazoEntregaDias: number | null;
  dataSaidaFabrica: string | null;
  dataPrevistaSaida: string;
  origemDataPrevista: "saida_fabrica" | "prazo_entrega";
  diasRestantes: number;
  valorTotal: string;
  eventoFeira: string | null;
  primeiroItem: string | null;
}

export interface AlertaTransitoItem {
  id: string;
  numeroPedido: string | null;
  clienteId: string;
  clienteNome: string;
  fornecedorNome: string | null;
  dataSaidaFabrica: string | null;
  diasEmTransito: number;
  atrasado: boolean;
  valorTotal: string;
  eventoFeira: string | null;
  primeiroItem: string | null;
}

export interface AlertasDoDia {
  dataReferencia: string;
  followupsPendentes: AlertaFollowupItem[];
  producaoAlerta: AlertaProducaoItem[];
  transitoAlerta: AlertaTransitoItem[];
  todosEmTransito: AlertaTransitoItem[];
  totalEmProducao: number;
  totalPendenciasCron: number;
}

export interface ResumoPainelDoDia {
  mesLabel: string;
  pedidosFechadosMes: number;
  totalVendidoMes: number;
  fabricasEmAndamento: number;
  orcamentosAbertos: number;
  alertas: AlertasDoDia;
}

export function calcularDataPrevistaSaida(pedido: {
  dataSaidaFabrica: string | null;
  dataPedido: string | null;
  prazoEntregaDias: number | null;
}): { data: string; origem: "saida_fabrica" | "prazo_entrega" } | null {
  if (pedido.dataSaidaFabrica) {
    return { data: pedido.dataSaidaFabrica, origem: "saida_fabrica" };
  }
  if (pedido.dataPedido && pedido.prazoEntregaDias && pedido.prazoEntregaDias > 0) {
    return {
      data: addDaysToIsoDate(pedido.dataPedido, pedido.prazoEntregaDias),
      origem: "prazo_entrega",
    };
  }
  return null;
}

export function calcularDiasEmTransito(
  pedido: {
    dataSaidaFabrica: string | null;
    updatedAt: Date;
  },
  hojeIso: string
): number {
  const baseIso =
    pedido.dataSaidaFabrica && pedido.dataSaidaFabrica <= hojeIso
      ? pedido.dataSaidaFabrica
      : toSaoPauloIsoDate(pedido.updatedAt);

  return Math.max(0, diffIsoDays(baseIso, hojeIso));
}

export async function getAlertasDoDia(
  hojeIso = getTodayIsoDate()
): Promise<AlertasDoDia> {
  const db = getDb();
  const limiteSaidaIso = addDaysToIsoDate(hojeIso, 3);

  const [followupsRows, emProducaoRows, emTransitoRows] = await Promise.all([
    db.query.pedidos.findMany({
      where: and(
        inArray(pedidos.status, STATUS_FOLLOWUP_ALERTA),
        isNotNull(pedidos.proximoFollowup),
        lte(pedidos.proximoFollowup, hojeIso)
      ),
      orderBy: [asc(pedidos.proximoFollowup), asc(pedidos.createdAt)],
      with: {
        cliente: { columns: { id: true, razaoSocial: true } },
        comprador: { columns: { id: true, nome: true } },
        fornecedor: {
          columns: {
            id: true,
            nome: true,
            templatePdf: true,
            proximoNumeroPedido: true,
          },
        },
        itens: {
          columns: { descricaoTecnica: true },
          orderBy: [asc(pedidoItens.ordem)],
          limit: 1,
        },
      },
    }),
    db.query.pedidos.findMany({
      where: eq(pedidos.status, "EM_PRODUCAO"),
      orderBy: [asc(pedidos.dataSaidaFabrica), asc(pedidos.dataPedido)],
      with: {
        cliente: { columns: { id: true, razaoSocial: true } },
        fornecedor: { columns: { id: true, nome: true } },
        itens: {
          columns: { descricaoTecnica: true },
          orderBy: [asc(pedidoItens.ordem)],
          limit: 1,
        },
      },
    }),
    db.query.pedidos.findMany({
      where: eq(pedidos.status, "EM_TRANSITO"),
      orderBy: [asc(pedidos.dataSaidaFabrica), asc(pedidos.updatedAt)],
      with: {
        cliente: { columns: { id: true, razaoSocial: true } },
        fornecedor: { columns: { id: true, nome: true } },
        itens: {
          columns: { descricaoTecnica: true },
          orderBy: [asc(pedidoItens.ordem)],
          limit: 1,
        },
      },
    }),
  ]);

  const followupsPendentes: AlertaFollowupItem[] = followupsRows
    .filter((row): row is typeof row & { proximoFollowup: string } =>
      Boolean(row.proximoFollowup)
    )
    .map((row) => ({
      id: row.id,
      numeroPedido: row.numeroPedido,
      status: row.status,
      clienteId: row.clienteId,
      clienteNome: row.cliente?.razaoSocial ?? "Cliente",
      compradorNome: row.comprador?.nome ?? null,
      fornecedor: row.fornecedor
        ? {
            id: row.fornecedor.id,
            nome: row.fornecedor.nome,
            templatePdf: row.fornecedor.templatePdf,
            proximoNumeroPedido: row.fornecedor.proximoNumeroPedido,
          }
        : null,
      condicaoPagamento: row.condicaoPagamento,
      formaPagamento: row.formaPagamento,
      ordemCompra: row.ordemCompra,
      prazoEntregaDias: row.prazoEntregaDias,
      dataSaidaFabrica: row.dataSaidaFabrica,
      proximoFollowup: row.proximoFollowup,
      diasAtraso: Math.max(0, diffIsoDays(row.proximoFollowup, hojeIso)),
      valorTotal: row.valorTotal,
      eventoFeira: row.eventoFeira,
      primeiroItem: row.itens[0]?.descricaoTecnica ?? null,
    }));

  const producaoAlerta: AlertaProducaoItem[] = emProducaoRows
    .map((row): AlertaProducaoItem | null => {
      const prevista = calcularDataPrevistaSaida(row);
      if (!prevista || prevista.data > limiteSaidaIso) {
        return null;
      }
      return {
        id: row.id,
        numeroPedido: row.numeroPedido,
        clienteId: row.clienteId,
        clienteNome: row.cliente?.razaoSocial ?? "Cliente",
        fornecedorNome: row.fornecedor?.nome ?? null,
        dataPedido: row.dataPedido,
        prazoEntregaDias: row.prazoEntregaDias,
        dataSaidaFabrica: row.dataSaidaFabrica,
        dataPrevistaSaida: prevista.data,
        origemDataPrevista: prevista.origem,
        diasRestantes: diffIsoDays(hojeIso, prevista.data),
        valorTotal: row.valorTotal,
        eventoFeira: row.eventoFeira,
        primeiroItem: row.itens[0]?.descricaoTecnica ?? null,
      };
    })
    .filter((item): item is AlertaProducaoItem => item !== null)
    .sort((a, b) => a.dataPrevistaSaida.localeCompare(b.dataPrevistaSaida));

  const todosEmTransito: AlertaTransitoItem[] = emTransitoRows
    .map((row) => {
      const diasEmTransito = calcularDiasEmTransito(row, hojeIso);
      return {
        id: row.id,
        numeroPedido: row.numeroPedido,
        clienteId: row.clienteId,
        clienteNome: row.cliente?.razaoSocial ?? "Cliente",
        fornecedorNome: row.fornecedor?.nome ?? null,
        dataSaidaFabrica: row.dataSaidaFabrica,
        diasEmTransito,
        atrasado: diasEmTransito > 5,
        valorTotal: row.valorTotal,
        eventoFeira: row.eventoFeira,
        primeiroItem: row.itens[0]?.descricaoTecnica ?? null,
      };
    })
    .sort((a, b) => b.diasEmTransito - a.diasEmTransito);

  const transitoAlerta = todosEmTransito.filter((item) => item.atrasado);

  return {
    dataReferencia: hojeIso,
    followupsPendentes,
    producaoAlerta,
    transitoAlerta,
    todosEmTransito,
    totalEmProducao: emProducaoRows.length,
    totalPendenciasCron:
      followupsPendentes.length + producaoAlerta.length + transitoAlerta.length,
  };
}

export async function getResumoPainelDoDia(): Promise<ResumoPainelDoDia> {
  const db = getDb();
  const hojeIso = getTodayIsoDate();
  const { startIso, endIso, label: mesLabel } = getMonthRangeFromIso(hojeIso);

  const [alertas, pedidosFechadosRows, orcamentosAbertosRows] = await Promise.all([
    getAlertasDoDia(hojeIso),
    db
      .select({
        id: pedidos.id,
        dataPedido: pedidos.dataPedido,
        createdAt: pedidos.createdAt,
        valorTotal: pedidos.valorTotal,
      })
      .from(pedidos)
      .where(inArray(pedidos.status, STATUS_PEDIDOS_FECHADOS)),
    db
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(inArray(pedidos.status, STATUS_ORCAMENTO_ABERTO)),
  ]);

  let pedidosFechadosMes = 0;
  let totalVendidoMes = 0;

  for (const row of pedidosFechadosRows) {
    const dataRef = row.dataPedido ?? toSaoPauloIsoDate(row.createdAt);
    if (dataRef >= startIso && dataRef <= endIso) {
      pedidosFechadosMes += 1;
      totalVendidoMes += Number(row.valorTotal) || 0;
    }
  }

  return {
    mesLabel,
    pedidosFechadosMes,
    totalVendidoMes: roundMoney(totalVendidoMes),
    fabricasEmAndamento:
      alertas.totalEmProducao + alertas.todosEmTransito.length,
    orcamentosAbertos: orcamentosAbertosRows.length,
    alertas,
  };
}
