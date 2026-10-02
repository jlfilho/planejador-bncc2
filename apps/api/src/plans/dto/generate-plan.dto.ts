import { z } from 'zod';

export const GeneratePlanSchema = z.object({
  skillCodes: z
    .array(z.string().min(1))
    .min(1, 'Selecione ao menos 1 habilidade da BNCC'),
  instrucao: z
    .string()
    .min(10, 'A instrução pedagógica deve conter no mínimo 10 caracteres')
    .max(1000, 'A instrução pedagógica deve conter no máximo 1000 caracteres'),
  duracao: z
    .number()
    .int('A duração deve ser um número inteiro')
    .min(15, 'A duração mínima é de 15 minutos')
    .max(360, 'A duração máxima é de 360 minutos'),
  recursosDigitais: z.boolean(),
  tituloProvisorio: z
    .string()
    .max(100, 'O título provisório deve conter no máximo 100 caracteres')
    .optional(),
});

export type GeneratePlanDto = z.infer<typeof GeneratePlanSchema>;
