import { z } from "zod";

export const TIPO_ARQUIVO_VALUES = [
  "PEDIDO_PDF",
  "MOCKUP",
  "ORDEM_COMPRA",
  "NOTA_FISCAL",
  "COMPROVANTE",
  "OUTRO",
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB (limite do bucket)

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/csv",
]);

export const uploadArquivoMetaSchema = z.object({
  pedido_id: z.string().uuid("Pedido inválido."),
  tipo: z.enum(TIPO_ARQUIVO_VALUES).default("OUTRO"),
});

export const deleteArquivoSchema = z.object({
  pedido_id: z.string().uuid("Pedido inválido."),
  arquivo_id: z.string().uuid("Arquivo inválido."),
});

export type UploadArquivoMetaInput = z.infer<typeof uploadArquivoMetaSchema>;
