import { z } from "zod";

export const roteiroCenaSchema = z.object({
  ordem: z.number().int().positive(),
  duracao_ou_slide: z.string().trim().min(1),
  visual_sugerido: z.string().trim().min(1),
  texto_tela: z.string().trim().min(1),
});

export const roteiroCenasSchema = z.array(roteiroCenaSchema);

export type RoteiroCena = z.infer<typeof roteiroCenaSchema>;
export type RoteiroCenas = z.infer<typeof roteiroCenasSchema>;
