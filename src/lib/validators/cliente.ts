import { z } from "zod";

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

export const clienteSchema = z.object({
  tipo_pessoa: z.enum(["PJ", "PF"]).default("PJ"),
  razao_social: z.string().trim().min(1, "Informe o nome ou razão social."),
  cpf_cnpj: z.string().trim().nullable().optional(),
  inscricao_estadual: z.string().trim().nullable().optional(),
  data_nascimento: z.string().trim().nullable().optional(),
  origem_indicacao: z.string().trim().nullable().optional(),
  observacoes: z.string().trim().nullable().optional(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
export type EnderecoInput = z.infer<typeof enderecoSchema>;
export type CompradorInput = z.infer<typeof compradorSchema>;
