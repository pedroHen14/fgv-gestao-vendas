import { z } from "zod";

export const formatoConteudoSchema = z.enum([
  "CARROSSEL",
  "REELS_SEM_APARECER",
  "FOTO_UNICA",
]);

export const statusConteudoSchema = z.enum([
  "IDEIA",
  "ROTEIRO_PRONTO",
  "ARTE_CANVA",
  "POSTADO",
]);

export const roteiroCenaSchema = z.object({
  ordem: z.number().int().positive(),
  duracao_ou_slide: z.string().trim().min(1, "Informe o slide ou tempo da cena."),
  visual_sugerido: z
    .string()
    .trim()
    .min(1, "Descreva a foto ou cena do produto."),
  texto_tela: z.string().trim().min(1, "Informe o texto curto para a tela."),
});

export const roteiroCenasSchema = z.array(roteiroCenaSchema);

const optionalIsoDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Informe uma data de publicação válida."
  );

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => {
    if (!value) return true;
    try {
      const normalized = /^https?:\/\//i.test(value)
        ? value
        : `https://${value}`;
      const url = new URL(normalized);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Informe um link válido do Canva (ex.: https://www.canva.com/...).");

export const conteudoSchema = z.object({
  tema: z
    .string()
    .trim()
    .min(3, "Informe o tema ou assunto do post (mínimo 3 caracteres).")
    .max(200, "O tema deve ter no máximo 200 caracteres."),
  formato: formatoConteudoSchema.default("CARROSSEL"),
  ocasiao_feira: z
    .string()
    .trim()
    .max(120, "A ocasião/feira deve ter no máximo 120 caracteres.")
    .optional()
    .nullable(),
  data_publicacao: optionalIsoDateSchema,
  status: statusConteudoSchema.default("IDEIA"),
  legenda_ia: z
    .string()
    .trim()
    .max(5000, "A legenda deve ter no máximo 5000 caracteres.")
    .optional()
    .nullable(),
  roteiro_cenas_ia: roteiroCenasSchema.optional().nullable(),
  link_canva: optionalUrlSchema,
});

export const conteudoStatusUpdateSchema = z.object({
  status: statusConteudoSchema,
});

export const gerarConteudoIaInputSchema = z.object({
  conteudo_id: z.string().uuid().optional().nullable(),
  tema: z
    .string()
    .trim()
    .min(3, "Escreva o tema ou produto do post antes de gerar com a IA.")
    .max(200, "O tema deve ter no máximo 200 caracteres."),
  formato: formatoConteudoSchema.default("CARROSSEL"),
  ocasiao_feira: z
    .string()
    .trim()
    .max(120, "A ocasião/feira deve ter no máximo 120 caracteres.")
    .optional()
    .nullable(),
  produto_destaque: z
    .string()
    .trim()
    .max(200, "O produto em destaque deve ter no máximo 200 caracteres.")
    .optional()
    .nullable(),
  observacoes_extras: z
    .string()
    .trim()
    .max(500, "As observações extras devem ter no máximo 500 caracteres.")
    .optional()
    .nullable(),
});

export const respostaIaConteudoSchema = z.object({
  legenda: z.string().trim().min(10),
  chamada_orcamento: z.string().trim().min(5),
  hashtags: z.array(z.string().trim().min(2)).min(3).max(20),
  dica_musica_ou_canva: z.string().trim().min(5),
  roteiro_cenas: roteiroCenasSchema.min(1).max(12),
});

export type RoteiroCena = z.infer<typeof roteiroCenaSchema>;
export type RoteiroCenas = z.infer<typeof roteiroCenasSchema>;
export type ConteudoInput = z.infer<typeof conteudoSchema>;
export type GerarConteudoIaInput = z.infer<typeof gerarConteudoIaInputSchema>;
export type RespostaIaConteudo = z.infer<typeof respostaIaConteudoSchema>;
