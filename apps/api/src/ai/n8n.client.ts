import { Injectable, Logger } from '@nestjs/common';
import { N8nSuccessResponse, N8nSuccessResponseSchema } from './n8n.schema';

export interface N8nLessonPlanPayload {
  sessao: string;
  habilidade: string;
  instrucao: string;
  duracao: number;
  recursos_digitais: boolean;
}

export class N8nGenerationError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'N8nGenerationError';
  }
}

export class N8nTimeoutError extends N8nGenerationError {
  constructor(message = 'Tempo limite de resposta do n8n excedido (45 segundos).') {
    super(message);
    this.name = 'N8nTimeoutError';
  }
}

@Injectable()
export class N8nClient {
  private readonly logger = new Logger(N8nClient.name);

  async generateLessonPlan(
    payload: N8nLessonPlanPayload,
    requestId: string,
  ): Promise<N8nSuccessResponse> {
    const isMock = process.env.N8N_MOCK_MODE === 'true';

    if (isMock) {
      this.logger.log(
        `[n8n-mock] Gerando plano em modo mock (requestId: ${requestId}, sessao: ${payload.sessao})`,
      );

      if (payload.instrucao && payload.instrucao.includes('SIMULAR_TIMEOUT_N8N')) {
        throw new N8nTimeoutError('Timeout simulado no n8n após 45s');
      }

      if (payload.instrucao && payload.instrucao.includes('SIMULAR_ERRO_N8N')) {
        throw new N8nGenerationError('Erro 500 simulado no n8n: Falha na execução do workflow');
      }

      // Extrai código da habilidade ou usa título padrão
      const habMatch = payload.habilidade.match(/^([A-Z0-9]+)/);
      const codigo = habMatch ? habMatch[1] : 'BNCC';
      const duracaoTotal = payload.duracao || 50;
      const duracaoAtividade = Math.max(10, duracaoTotal - 20);

      const mockAnswer = [
        `# Plano de Aula: Exploração Prática e Investigativa (${codigo})`,
        '',
        '## Objetivos específicos',
        `- Desenvolver a compreensão prática das competências previstas na habilidade ${codigo}.`,
        '- Estimular o raciocínio colaborativo, a investigação ativa e a troca de saberes.',
        '',
        '## Introdução — 10 min',
        `Apresentação contextualizada e levantamento de conhecimentos prévios relacionados a ${codigo}.`,
        '',
        `## Desenvolvimento — ${duracaoAtividade} min`,
        `${payload.instrucao || 'Atividade orientada para análise e resolução de problemas.'}`,
        payload.recursos_digitais
          ? 'Utilização de recursos digitais e ferramentas interativas de suporte.'
          : 'Atividade desplugada utilizando materiais concretos e manipuláveis.',
        '',
        '## Avaliação e Fechamento — 10 min',
        'Roda de conversa, socialização das conclusões dos alunos e fechamento pedagógico com síntese do aprendizado.',
      ].join('\n');

      return {
        success: true,
        sessao: payload.sessao,
        habilidade: payload.habilidade,
        answer: mockAnswer,
        format: 'markdown',
      };
    }

    const webhookUrl =
      process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/gerar-plano';
    const apiKey = process.env.N8N_API_KEY || '';

    // Sanitized log: do NOT log x-api-key or payload details
    this.logger.log(
      `[n8n] Enviando requisição para webhook n8n (requestId: ${requestId}, sessao: ${payload.sessao})`,
    );

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-request-id': requestId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
      });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.name === 'TimeoutError' || err.name === 'AbortError')
      ) {
        throw new N8nTimeoutError('Tempo limite de resposta do n8n excedido (45 segundos).');
      }
      throw new N8nGenerationError(
        `Falha na comunicação com o n8n: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // Ignora erro de leitura
      }
      throw new N8nGenerationError(
        `Erro HTTP ${response.status} ${response.statusText} retornado pelo n8n${
          errorBody ? `: ${errorBody.slice(0, 200)}` : ''
        }`,
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      throw new N8nGenerationError('Falha ao decodificar JSON retornado pelo n8n', err);
    }

    const parsed = N8nSuccessResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new N8nGenerationError(
        `Resposta do n8n não atende ao contrato esperado: ${parsed.error.message}`,
        parsed.error,
      );
    }

    return parsed.data;
  }
}
