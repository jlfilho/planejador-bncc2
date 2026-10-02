import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { N8nClient, N8nTimeoutError } from '../src/ai/n8n.client';

describe('AI Generation Resilience and Atomicity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let n8nClient: N8nClient;

  let anaToken: string;
  let anaUserId: string;

  beforeAll(async () => {
    process.env.N8N_MOCK_MODE = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    n8nClient = app.get<N8nClient>(N8nClient);

    const loginAna = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      })
      .expect(200);

    anaToken = loginAna.body.accessToken;
    anaUserId = loginAna.body.user.id;
  });

  afterAll(async () => {
    await prisma.plan.deleteMany({
      where: { userId: anaUserId },
    });
    await prisma.aiRun.deleteMany({
      where: { userId: anaUserId },
    });
    await app.close();
  });

  it('Sucesso: deve registrar AiRun (SUCCEEDED) e criar o Plan (RASCUNHO) atomicamente', async () => {
    const plansBefore = await prisma.plan.count({ where: { userId: anaUserId } });
    const aiRunsBefore = await prisma.aiRun.count({ where: { userId: anaUserId } });

    const response = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        skillCodes: ['EF01CO01'],
        instrucao: 'Atividade pedagógica de classificação de objetos para testar sucesso.',
        duracao: 50,
        recursosDigitais: true,
      })
      .expect(201);

    expect(response.body.id).toBeDefined();

    const plansAfter = await prisma.plan.count({ where: { userId: anaUserId } });
    const aiRunsAfter = await prisma.aiRun.count({ where: { userId: anaUserId } });

    expect(plansAfter).toBe(plansBefore + 1);
    expect(aiRunsAfter).toBe(aiRunsBefore + 1);

    const createdPlan = await prisma.plan.findUnique({
      where: { id: response.body.id },
      include: { skills: true },
    });

    expect(createdPlan?.status).toBe('RASCUNHO');
    expect(createdPlan?.skills.length).toBe(1);

    const latestRun = await prisma.aiRun.findFirst({
      where: { userId: anaUserId },
      orderBy: { createdAt: 'desc' },
    });

    expect(latestRun?.status).toBe('SUCCEEDED');
    expect(createdPlan?.aiRunId).toBe(latestRun?.id);
  });

  it('Falha / Timeout n8n: deve registrar AiRun (FAILED) e NÃO criar registro em Plan (Atomicidade)', async () => {
    // Espiona o método generateLessonPlan do N8nClient para simular timeout
    const n8nSpy = jest
      .spyOn(n8nClient, 'generateLessonPlan')
      .mockRejectedValueOnce(
        new N8nTimeoutError('Tempo limite da requisição ao n8n atingido (timeout de 60000ms).'),
      );

    const plansBefore = await prisma.plan.count({ where: { userId: anaUserId } });
    const aiRunsBefore = await prisma.aiRun.count({ where: { userId: anaUserId } });

    const response = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        skillCodes: ['EF01CO01'],
        instrucao: 'Instrução para testar resiliência com timeout simulado.',
        duracao: 50,
        recursosDigitais: false,
      })
      .expect(504);

    expect(response.body.message).toBe(
      'Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.',
    );

    const plansAfter = await prisma.plan.count({ where: { userId: anaUserId } });
    const aiRunsAfter = await prisma.aiRun.count({ where: { userId: anaUserId } });

    // Garante que o plano NÃO foi criado no banco
    expect(plansAfter).toBe(plansBefore);

    // Garante que o AiRun foi registrado como FAILED para fins de auditoria
    expect(aiRunsAfter).toBe(aiRunsBefore + 1);

    const latestFailedRun = await prisma.aiRun.findFirst({
      where: { userId: anaUserId },
      orderBy: { createdAt: 'desc' },
    });

    expect(latestFailedRun?.status).toBe('FAILED');
    expect(latestFailedRun?.errorMessage).toContain('Tempo limite');

    const planWithFailedRun = await prisma.plan.findFirst({
      where: { aiRunId: latestFailedRun?.id },
    });
    expect(planWithFailedRun).toBeNull();

    n8nSpy.mockRestore();
  });

  it('Falha de payload inválido do n8n: deve rejeitar com 502 sem persistir Plan', async () => {
    // Simula resposta com erro genérico / indisponibilidade
    const n8nSpy = jest
      .spyOn(n8nClient, 'generateLessonPlan')
      .mockRejectedValueOnce(
        new Error('Resposta do workflow n8n inválida ou fora do contrato.'),
      );

    const plansBefore = await prisma.plan.count({ where: { userId: anaUserId } });

    const response = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        skillCodes: ['EF01CO01'],
        instrucao: 'Instrução para testar resposta corrompida do n8n.',
        duracao: 45,
        recursosDigitais: true,
      })
      .expect(502);

    expect(response.body.message).toBe(
      'Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.',
    );

    const plansAfter = await prisma.plan.count({ where: { userId: anaUserId } });
    expect(plansAfter).toBe(plansBefore);

    n8nSpy.mockRestore();
  });
});
