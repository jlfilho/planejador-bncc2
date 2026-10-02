import { z } from 'zod';

export const UpdatePlanSchema = z.object({
  titulo: z
    .string()
    .min(1, 'O título não pode ser vazio')
    .max(100, 'O título deve conter no máximo 100 caracteres')
    .optional(),
  conteudoMarkdown: z
    .string()
    .min(1, 'O conteúdo markdown não pode ser vazio')
    .optional(),
});

export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;
