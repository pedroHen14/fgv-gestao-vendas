export type TipoPessoa = "PJ" | "PF";
export type TipoEndereco = "FATURAMENTO" | "ENTREGA" | "FILIAL";
export type TemplatePdfFornecedor = "BONES_MOCKUP" | "CONFECCAO_GRADE" | "PADRAO";
export type StatusPedido =
  | "ORCAMENTO_RASCUNHO"
  | "AGUARDANDO_FORNECEDOR"
  | "ORCAMENTO_ENVIADO"
  | "APROVADO"
  | "EM_PRODUCAO"
  | "EM_TRANSITO"
  | "ENTREGUE"
  | "CANCELADO"
  | "PERDIDO";
export type FormaPagamento = "DEPOSITO" | "BOLETO" | "PIX" | "OUTRO";
export type TipoArquivoPedido =
  | "PEDIDO_PDF"
  | "MOCKUP"
  | "ORDEM_COMPRA"
  | "NOTA_FISCAL"
  | "COMPROVANTE"
  | "OUTRO";
export type TipoInteracao =
  | "EMAIL"
  | "WHATSAPP"
  | "LIGACAO"
  | "FOLLOWUP"
  | "OBSERVACAO";
export type ModeloGrade = "MASCULINO" | "FEMININO" | "UNISSEX" | "INFANTIL";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

export const TIPO_PESSOA_LABELS: Record<TipoPessoa, string> = {
  PJ: "Empresa (PJ)",
  PF: "Produtor Rural / Pessoa Física (PF)",
};

export const TIPO_PESSOA_CURTO: Record<TipoPessoa, string> = {
  PJ: "Empresa (PJ)",
  PF: "Produtor Rural / PF",
};

export const TIPO_ENDERECO_LABELS: Record<TipoEndereco, string> = {
  FATURAMENTO: "Faturamento / Matriz",
  ENTREGA: "Local de Entrega",
  FILIAL: "Filial",
};

export const TEMPLATE_PDF_LABELS: Record<TemplatePdfFornecedor, string> = {
  BONES_MOCKUP: "Bonés com Mockup (ex.: DKS)",
  CONFECCAO_GRADE: "Confecção com Grade (ex.: Agatha)",
  PADRAO: "Padrão FGV",
};

export const TEMPLATE_PDF_DESCRIPTIONS: Record<TemplatePdfFornecedor, string> = {
  BONES_MOCKUP:
    "Destaca imagem grande da arte/mockup, observação de NF e prazo em dias.",
  CONFECCAO_GRADE:
    "Inclui tabela de grade de tamanhos (PP ao ESP), forma de pagamento e data de saída.",
  PADRAO:
    "Layout limpo da FGV para brindes corporativos e outros fornecedores.",
};

export const STATUS_PEDIDO_META: Record<
  StatusPedido,
  { label: string; shortLabel: string; variant: BadgeVariant; isOrcamento: boolean }
> = {
  ORCAMENTO_RASCUNHO: {
    label: "Orçamento (Rascunho)",
    shortLabel: "Rascunho",
    variant: "outline",
    isOrcamento: true,
  },
  AGUARDANDO_FORNECEDOR: {
    label: "Aguardando Fornecedor",
    shortLabel: "Aguard. Fábrica",
    variant: "warning",
    isOrcamento: true,
  },
  ORCAMENTO_ENVIADO: {
    label: "Orçamento Enviado",
    shortLabel: "Enviado",
    variant: "secondary",
    isOrcamento: true,
  },
  APROVADO: {
    label: "Pedido Aprovado",
    shortLabel: "Aprovado",
    variant: "default",
    isOrcamento: false,
  },
  EM_PRODUCAO: {
    label: "Em Produção",
    shortLabel: "Produção",
    variant: "warning",
    isOrcamento: false,
  },
  EM_TRANSITO: {
    label: "Em Trânsito",
    shortLabel: "Trânsito",
    variant: "secondary",
    isOrcamento: false,
  },
  ENTREGUE: {
    label: "Entregue",
    shortLabel: "Entregue",
    variant: "success",
    isOrcamento: false,
  },
  CANCELADO: {
    label: "Cancelado",
    shortLabel: "Cancelado",
    variant: "destructive",
    isOrcamento: false,
  },
  PERDIDO: {
    label: "Orçamento Perdido",
    shortLabel: "Perdido",
    variant: "destructive",
    isOrcamento: false,
  },
};

export const STATUS_ORCAMENTO: StatusPedido[] = [
  "ORCAMENTO_RASCUNHO",
  "AGUARDANDO_FORNECEDOR",
  "ORCAMENTO_ENVIADO",
];

export const STATUS_FLUXO_PRINCIPAL: StatusPedido[] = [
  "ORCAMENTO_RASCUNHO",
  "AGUARDANDO_FORNECEDOR",
  "ORCAMENTO_ENVIADO",
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
  "ENTREGUE",
];

export function isStatusOrcamento(status: StatusPedido): boolean {
  return STATUS_ORCAMENTO.includes(status);
}

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  DEPOSITO: "Depósito",
  BOLETO: "Boleto",
  PIX: "PIX",
  OUTRO: "Outro",
};

export const TIPO_ARQUIVO_LABELS: Record<TipoArquivoPedido, string> = {
  MOCKUP: "Arte / Mockup",
  ORDEM_COMPRA: "Ordem de Compra",
  NOTA_FISCAL: "Nota Fiscal",
  COMPROVANTE: "Comprovante",
  PEDIDO_PDF: "Folha do Pedido (PDF)",
  OUTRO: "Outro Documento",
};

export const TIPO_ARQUIVO_ORDEM_UI: TipoArquivoPedido[] = [
  "MOCKUP",
  "ORDEM_COMPRA",
  "NOTA_FISCAL",
  "COMPROVANTE",
  "PEDIDO_PDF",
  "OUTRO",
];

export const TIPO_ARQUIVO_ZIP_PREFIX: Record<TipoArquivoPedido, string> = {
  MOCKUP: "02_MOCKUP",
  ORDEM_COMPRA: "03_ORDEM_COMPRA",
  NOTA_FISCAL: "04_NOTA_FISCAL",
  COMPROVANTE: "05_COMPROVANTE",
  PEDIDO_PDF: "06_PEDIDO_SALVO",
  OUTRO: "07_OUTRO",
};

export const TIPO_INTERACAO_LABELS: Record<TipoInteracao, string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  LIGACAO: "Ligação",
  FOLLOWUP: "Retorno / Cobrança",
  OBSERVACAO: "Anotação",
};

export const MODELO_GRADE_LABELS: Record<ModeloGrade, string> = {
  MASCULINO: "Masculino",
  FEMININO: "Feminino",
  UNISSEX: "Unissex",
  INFANTIL: "Infantil",
};

export const UF_LIST = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export const FEIRAS_AGRO_COMUNS = [
  "AGRISHOW",
  "SHOW RURAL",
  "EXPO DIRETO",
  "HORTITEC",
  "FEMAGRI",
  "SHOW SAFRA",
  "SHOWTEC",
  "AGROTINS",
  "ANDAV",
  "SIPAT",
] as const;
