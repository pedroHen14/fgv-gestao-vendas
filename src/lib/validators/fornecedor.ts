import { z } from "zod";

export const fornecedorSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do fornecedor ou fábrica."),
  template_pdf: z
    .enum(["BONES_MOCKUP", "CONFECCAO_GRADE", "PADRAO"])
    .default("PADRAO"),
  proximo_numero_pedido: z
    .number()
    .int("Informe um número inteiro.")
    .positive("O número inicial deve ser maior que zero.")
    .nullable()
    .optional(),
  contato: z.string().trim().nullable().optional(),
  observacoes: z.string().trim().nullable().optional(),
});

export type FornecedorInput = z.infer<typeof fornecedorSchema>;
