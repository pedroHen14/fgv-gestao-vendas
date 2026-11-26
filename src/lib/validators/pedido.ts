import { z } from "zod";

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
      const somaGrade = Object.values(item.grade_tamanhos.tamanhos).reduce(
        (acc, qtd) => acc + qtd,
        0
      );
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
