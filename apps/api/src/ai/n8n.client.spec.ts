import { N8nClient, N8nGenerationError, N8nTimeoutError } from './n8n.client';

describe('N8nClient', () => {
  let client: N8nClient;

  const mockPayload = {
    sessao: 'ana.souza@escola.gov.br',
    habilidade: 'EF01CO01 — Organizar objetos físicos ou digitais...',
    instrucao: 'Criar uma atividade em duplas investigando padrões.',
    duracao: 50,
    recursos_digitais: true,
  };

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Modo Mock (N8N_MOCK_MODE=true)', () => {
    beforeEach(() => {
      process.env.N8N_MOCK_MODE = 'true';
      client = new N8nClient();
    });

    it('deve retornar resposta estruturada válida em modo mock', async () => {
      const result = await client.generateLessonPlan(mockPayload, 'req-uuid-1');

      expect(result.success).toBe(true);
      expect(result.format).toBe('markdown');
      expect(result.sessao).toBe(mockPayload.sessao);
      expect(result.habilidade).toBe(mockPayload.habilidade);
      expect(result.answer).toContain('# ');
      expect(result.answer).toContain('## Objetivos específicos');
    });

    it('deve simular timeout em modo mock quando solicitado na instrução', async () => {
      const payloadTimeout = {
        ...mockPayload,
        instrucao: 'SIMULAR_TIMEOUT_N8N para testes de resiliência',
      };

      await expect(
        client.generateLessonPlan(payloadTimeout, 'req-uuid-timeout')
      ).rejects.toThrow(N8nTimeoutError);
    });

    it('deve simular erro 500 em modo mock quando solicitado na instrução', async () => {
      const payloadErro = {
        ...mockPayload,
        instrucao: 'SIMULAR_ERRO_N8N para testes de falha atômica',
      };

      await expect(
        client.generateLessonPlan(payloadErro, 'req-uuid-erro')
      ).rejects.toThrow(N8nGenerationError);
    });
  });

  describe('Modo Real (N8N_MOCK_MODE=false)', () => {
    beforeEach(() => {
      process.env.N8N_MOCK_MODE = 'false';
      process.env.N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/gerar-plano';
      process.env.N8N_API_KEY = 'secret-api-key';
      client = new N8nClient();
    });

    it('deve chamar o fetch com cabeçalho x-api-key e validar resposta com sucesso', async () => {
      const mockFetchResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          sessao: mockPayload.sessao,
          habilidade: mockPayload.habilidade,
          answer: '# Plano Gerado no n8n\n\n## Objetivos específicos\n- Objetivo 1',
          format: 'markdown',
        }),
      };

      global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);

      const result = await client.generateLessonPlan(mockPayload, 'req-uuid-fetch');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/gerar-plano',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'secret-api-key',
            'x-request-id': 'req-uuid-fetch',
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.format).toBe('markdown');
    });

    it('deve lançar N8nGenerationError quando n8n retornar status de erro HTTP 500', async () => {
      const mockFetchResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Workflow execution failed',
      };

      global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);

      await expect(
        client.generateLessonPlan(mockPayload, 'req-uuid-500')
      ).rejects.toThrow(N8nGenerationError);
    });

    it('deve lançar N8nGenerationError quando n8n retornar payload malformado', async () => {
      const mockFetchResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: 'Missing fields',
        }),
      };

      global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);

      await expect(
        client.generateLessonPlan(mockPayload, 'req-uuid-malformed')
      ).rejects.toThrow(N8nGenerationError);
    });
  });
});
