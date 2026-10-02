import { z } from 'zod';

export const N8nSuccessResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1),
  habilidade: z.string().min(1),
  answer: z.string().min(10, 'Conteúdo pedagógico deve conter no mínimo 10 caracteres'),
  format: z.literal('markdown'),
});

export type N8nSuccessResponse = z.infer<typeof N8nSuccessResponseSchema>;
