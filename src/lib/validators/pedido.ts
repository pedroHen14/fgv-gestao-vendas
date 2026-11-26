import { z } from "zod";
import { roundMoney } from "@/lib/formatters";

export const TAMANHOS_PADRAO = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "3G",
  "4G",
  "5G",
  "ESP",
] as const;

export const gradeTamanhosSchema = z.object({
  modelo: z.enum(["MASCULINO", "FEMININO", "UNISSEX", "INFANTIL"]),
  tamanhos: z.record(z.string(), z.number().int().min(0)),
});

export type GradeTamanhos = z.infer<typeof gradeTamanhosSchema>;

export function somarGradeTamanhos(grade: GradeTamanhos | null | undefined): number {
  if (!grade) return 0;
  return Object.values(grade.tamanhos).reduce((acc, qtd) => acc + (qtd || 0), 0);
}

export function criarGradeVazia(
  modelo: GradeTamanhos["modelo"] = "UNISSEX"
): GradeTamanhos {
  const tamanhos: Record<string, number> = {};
  for (const tam of TAMANHOS_PADRAO) {
    tamanhos[tam] = 0;
  }
  return { modelo, tamanhos };
}

export const pedidoItemSchema = z
  .object({
    id: z.string().uuid().optional(),
    descricao_tecnica: z
      .string()
      .trim()
      .min(1, "Descreva o produto do item."),
    quantidade: z
      .number()
      .int("A quantidade deve ser um número inteiro.")
      .positive("A quantidade deve ser maior que zero."),
    valor_unitario: z
      .number()
      .min(0, "O valor unitário não pode ser negativo."),
    grade_tamanhos: gradeTamanhosSchema.nullable().optional(),
    mockup_storage_path: z.string().trim().nullable().optional(),
    ordem: z.number().int().positive().default(1),
  })
  .superRefine((item, ctx) => {
    if (item.grade_tamanhos) {
      const somaGrade = somarGradeTamanhos(item.grade_tamanhos);
      if (somaGrade !== item.quantidade) {
        ctx.addIssue({
          code: "custom",
          path: ["grade_tamanhos"],
          message: `A soma da grade (${somaGrade}) precisa ser igual à quantidade do item (${item.quantidade}).`,
        });
      }
    }
  });

export type PedidoItemInput = z.infer<typeof pedidoItemSchema>;

const optionalUuid = z.string().uuid().or(z.literal("")).nullable().optional();

export const STATUS_PEDIDO_VALUES = [
  "ORCAMENTO_RASCUNHO",
  "AGUARDANDO_FORNECEDOR",
  "ORCAMENTO_ENVIADO",
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
  "ENTREGUE",
  "CANCELADO",
  "PERDIDO",
] as const;

export const FORMA_PAGAMENTO_VALUES = [
  "DEPOSITO",
  "BOLETO",
  "PIX",
  "OUTRO",
] as const;

export const pedidoSchema = z
  .object({
    numero_pedido: z.string().trim().nullable().optional(),
    cliente_id: z.string().uuid("Selecione um cliente."),
    comprador_id: optionalUuid,
    fornecedor_id: optionalUuid,
    endereco_faturamento_id: optionalUuid,
    endereco_entrega_id: optionalUuid,
    entrega_mesmo_faturamento: z.boolean().default(true),
    ac_entrega: z.string().trim().nullable().optional(),

    vendedor: z.string().trim().min(1, "Informe o vendedor.").default("Flavio"),
    status: z.enum(STATUS_PEDIDO_VALUES).default("ORCAMENTO_RASCUNHO"),

    condicao_pagamento: z.string().trim().nullable().optional(),
    forma_pagamento: z
      .enum(FORMA_PAGAMENTO_VALUES)
      .or(z.literal(""))
      .nullable()
      .optional(),
    ordem_compra: z.string().trim().nullable().optional(),

    data_orcamento: z.string().trim().nullable().optional(),
    data_pedido: z.string().trim().nullable().optional(),
    proximo_followup: z.string().trim().nullable().optional(),
    prazo_entrega_dias: z
      .number()
      .int("O prazo deve ser um número inteiro de dias.")
      .positive("O prazo de entrega deve ser maior que zero.")
      .nullable()
      .optional(),
    data_saida_fabrica: z.string().trim().nullable().optional(),
    data_entrega_cliente: z.string().trim().nullable().optional(),

    desconto: z
      .number()
      .min(0, "O desconto não pode ser negativo.")
      .default(0),

    evento_feira: z.string().trim().nullable().optional(),
    obs_nota_fiscal: z.string().trim().nullable().optional(),
    observacoes: z.string().trim().nullable().optional(),
    ocorrencias: z.string().trim().nullable().optional(),

    itens: z
      .array(pedidoItemSchema)
      .min(1, "Adicione pelo menos um item ao orçamento/pedido."),

    atualizar_proximo_numero: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const subtotal = roundMoney(
      data.itens.reduce(
        (acc, item) => acc + roundMoney(item.quantidade * item.valor_unitario),
        0
      )
    );
    if (data.desconto > subtotal) {
      ctx.addIssue({
        code: "custom",
        path: ["desconto"],
        message: "O desconto não pode ser maior que o subtotal dos itens.",
      });
    }
  });

export type PedidoInput = z.infer<typeof pedidoSchema>;

export const converterOrcamentoSchema = z.object({
  pedido_id: z.string().uuid(),
  numero_pedido: z
    .string()
    .trim()
    .min(1, "Informe o número do pedido para aprovar."),
  data_pedido: z
    .string()
    .trim()
    .min(1, "Informe a data do pedido."),
  condicao_pagamento: z.string().trim().nullable().optional(),
  forma_pagamento: z
    .enum(FORMA_PAGAMENTO_VALUES)
    .or(z.literal(""))
    .nullable()
    .optional(),
  ordem_compra: z.string().trim().nullable().optional(),
  prazo_entrega_dias: z
    .number()
    .int("O prazo deve ser um número inteiro de dias.")
    .positive("O prazo de entrega deve ser maior que zero.")
    .nullable()
    .optional(),
  data_saida_fabrica: z.string().trim().nullable().optional(),
  atualizar_proximo_numero: z.boolean().default(true),
});

export type ConverterOrcamentoInput = z.infer<typeof converterOrcamentoSchema>;

export const atualizarStatusPedidoSchema = z.object({
  pedido_id: z.string().uuid(),
  status: z.enum(STATUS_PEDIDO_VALUES),
});

export interface TotaisCalculados {
  itens: { valorTotal: number }[];
  subtotal: number;
  desconto: number;
  valorTotal: number;
}

/**
 * Recalcula todos os valores financeiros com arredondamento seguro (2 casas).
 * Executado obrigatoriamente no servidor antes de persistir.
 */
export function calcularTotaisPedido(
  itens: { quantidade: number; valor_unitario: number }[],
  descontoBruto = 0
): TotaisCalculados {
  const itensCalculados = itens.map((item) => ({
    valorTotal: roundMoney(item.quantidade * item.valor_unitario),
  }));

  const subtotal = roundMoney(
    itensCalculados.reduce((acc, item) => acc + item.valorTotal, 0)
  );
  const desconto = roundMoney(Math.max(0, Math.min(descontoBruto, subtotal)));
  const valorTotal = roundMoney(Math.max(0, subtotal - desconto));

  return {
    itens: itensCalculados,
    subtotal,
    desconto,
    valorTotal,
  };
}
