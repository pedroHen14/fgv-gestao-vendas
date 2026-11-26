import type { PedidoDetalhe } from "@/lib/services/pedidos";
import { formatCep, formatCpfCnpj, formatDateBR } from "@/lib/formatters";

export interface PdfImageAsset {
  dataUri: string;
  label?: string;
}

export interface PedidoPdfDocumentProps {
  pedido: PedidoDetalhe;
  mockups: PdfImageAsset[];
}

export interface FaturamentoDocInfo {
  docLabel: "CNPJ" | "CPF";
  docValue: string;
  ie: string;
  dataNascimento: string | null;
}

export function resolveFaturamentoDoc(pedido: PedidoDetalhe): FaturamentoDocInfo {
  const endFat = pedido.enderecoFaturamento;
  const docRaw = endFat?.cnpjFilial || pedido.cliente.cpfCnpj;
  const ieRaw = endFat?.ieFilial || pedido.cliente.inscricaoEstadual;
  const isPF = pedido.cliente.tipoPessoa === "PF" && !endFat?.cnpjFilial;

  return {
    docLabel: isPF ? "CPF" : "CNPJ",
    docValue: docRaw ? formatCpfCnpj(docRaw) : "—",
    ie: ieRaw?.trim() || "—",
    dataNascimento:
      pedido.cliente.tipoPessoa === "PF" && pedido.cliente.dataNascimento
        ? formatDateBR(pedido.cliente.dataNascimento)
        : null,
  };
}

export function formatEnderecoResumo(
  end:
    | {
        logradouro: string;
        bairro: string | null;
        cidade: string;
        uf: string;
        cep: string | null;
      }
    | null
    | undefined
): {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  completo: string;
} {
  if (!end) {
    return {
      logradouro: "—",
      bairro: "—",
      cidade: "—",
      uf: "—",
      cep: "—",
      completo: "Não informado",
    };
  }

  const uf = end.uf.trim().toUpperCase();
  const cep = end.cep ? formatCep(end.cep) : "—";
  const bairro = end.bairro?.trim() || "—";
  const completo = [
    end.logradouro,
    end.bairro?.trim() ? `Bairro ${end.bairro.trim()}` : null,
    `${end.cidade}/${uf}`,
    end.cep ? `CEP ${cep}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    logradouro: end.logradouro,
    bairro,
    cidade: end.cidade,
    uf,
    cep,
    completo,
  };
}

export function getPedidoDataReferencia(pedido: PedidoDetalhe): string {
  return formatDateBR(pedido.dataPedido ?? pedido.dataOrcamento);
}

export function getPedidoTituloNumero(pedido: PedidoDetalhe): string {
  return pedido.numeroPedido?.trim()
    ? `PEDIDO ${pedido.numeroPedido.trim()}`
    : "ORÇAMENTO";
}
