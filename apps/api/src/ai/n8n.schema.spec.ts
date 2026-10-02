import { N8nSuccessResponseSchema } from './n8n.schema';

describe('N8nSchema Validation', () => {
  it('deve validar com sucesso um payload aderente ao contrato n8n', () => {
    const validPayload = {
      success: true,
      sessao: 'ana.souza@escola.gov.br',
      habilidade: 'EF01CO01 — Organizar objetos físicos ou digitais...',
      answer: '# Plano de aula sobre Padrões\n\n## Objetivos específicos\n- Compreender etapas...',
      format: 'markdown',
    };

    const parsed = N8nSuccessResponseSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.format).toBe('markdown');
      expect(parsed.data.sessao).toBe('ana.souza@escola.gov.br');
    }
  });

  it('deve rejeitar payload quando success for false', () => {
    const invalidPayload = {
      success: false,
      sessao: 'ana.souza@escola.gov.br',
      habilidade: 'EF01CO01 — Organizar...',
      answer: 'Erro ocorrido',
      format: 'markdown',
    };

    const parsed = N8nSuccessResponseSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  it('deve rejeitar payload com format diferente de markdown', () => {
    const invalidPayload = {
      success: true,
      sessao: 'ana.souza@escola.gov.br',
      habilidade: 'EF01CO01 — Organizar...',
      answer: '# Plano de aula',
      format: 'html',
    };

    const parsed = N8nSuccessResponseSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  it('deve rejeitar payload quando answer estiver ausente ou vazio', () => {
    const invalidPayload = {
      success: true,
      sessao: 'ana.souza@escola.gov.br',
      habilidade: 'EF01CO01 — Organizar...',
      answer: '',
      format: 'markdown',
    };

    const parsed = N8nSuccessResponseSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
