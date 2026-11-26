import { z } from "zod";
import { onlyDigits } from "@/lib/formatters";

export const enderecoSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(["FATURAMENTO", "ENTREGA", "FILIAL"]).default("FATURAMENTO"),
  rotulo: z.string().trim().nullable().optional(),
  cnpj_filial: z.string().trim().nullable().optional(),
  ie_filial: z.string().trim().nullable().optional(),
  logradouro: z.string().trim().min(1, "Informe o endereço."),
  bairro: z.string().trim().nullable().optional(),
  cidade: z.string().trim().min(1, "Informe a cidade."),
  uf: z
    .string()
    .trim()
    .length(2, "Informe a sigla do estado (UF) com 2 letras.")
    .transform((v) => v.toUpperCase()),
  cep: z.string().trim().nullable().optional(),
  principal: z.boolean().default(false),
});

export const compradorSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Informe o nome do comprador."),
  email: z
    .string()
    .trim()
    .email("Digite um e-mail válido.")
    .or(z.literal(""))
    .nullable()
    .optional(),
  email_financeiro: z
    .string()
    .trim()
    .email("Digite um e-mail financeiro válido.")
    .or(z.literal(""))
    .nullable()
    .optional(),
  telefone: z.string().trim().nullable().optional(),
  departamento: z.string().trim().nullable().optional(),
  ativo: z.boolean().default(true),
});

export const clienteSchema = z
  .object({
    tipo_pessoa: z.enum(["PJ", "PF"]).default("PJ"),
    razao_social: z.string().trim().min(1, "Informe o nome ou razão social."),
    cpf_cnpj: z.string().trim().nullable().optional(),
    inscricao_estadual: z.string().trim().nullable().optional(),
    data_nascimento: z.string().trim().nullable().optional(),
    origem_indicacao: z.string().trim().nullable().optional(),
    observacoes: z.string().trim().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const rawDoc = data.cpf_cnpj?.trim();
    if (rawDoc) {
      const digits = onlyDigits(rawDoc);
      if (data.tipo_pessoa === "PJ" && digits.length !== 14) {
        ctx.addIssue({
          code: "custom",
          path: ["cpf_cnpj"],
          message: "Informe um CNPJ válido com 14 números.",
        });
      }
      if (data.tipo_pessoa === "PF" && digits.length !== 11) {
        ctx.addIssue({
          code: "custom",
          path: ["cpf_cnpj"],
          message: "Informe um CPF válido com 11 números.",
        });
      }
    }
  });

export const clienteComInicialSchema = z.object({
  cliente: clienteSchema,
  endereco: enderecoSchema.nullable().optional(),
  comprador: compradorSchema.nullable().optional(),
});

export const interacaoSchema = z.object({
  tipo: z
    .enum(["EMAIL", "WHATSAPP", "LIGACAO", "FOLLOWUP", "OBSERVACAO"])
    .default("EMAIL"),
  resumo: z.string().trim().min(1, "Descreva o contato ou anotação."),
  comprador_id: z.string().uuid().or(z.literal("")).nullable().optional(),
  pedido_id: z.string().uuid().or(z.literal("")).nullable().optional(),
  data_interacao: z.string().trim().nullable().optional(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
export type EnderecoInput = z.infer<typeof enderecoSchema>;
export type CompradorInput = z.infer<typeof compradorSchema>;
export type ClienteComInicialInput = z.infer<typeof clienteComInicialSchema>;
export type InteracaoInput = z.infer<typeof interacaoSchema>;
