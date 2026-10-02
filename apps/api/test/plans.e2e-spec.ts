import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Plans Endpoints and AI Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let anaToken: string;
  let anaUserId: string;
  let marcosToken: string;
  let marcosUserId: string;

  beforeAll(async () => {
    // Garante que o ambiente e2e opere em modo mock por padrão
    process.env.N8N_MOCK_MODE = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Login Ana Souza
    const loginAna = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      })
      .expect(200);

    anaToken = loginAna.body.accessToken;
    anaUserId = loginAna.body.user.id;

    // Login Marcos Lima
    const loginMarcos = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'marcos.lima@escola.gov.br',
        password: process.env.DEMO_MARCOS_PASSWORD || 'senha-demo-marcos',
      })
      .expect(200);

    marcosToken = loginMarcos.body.accessToken;
    marcosUserId = loginMarcos.body.user.id;
  });

  afterAll(async () => {
    // Limpeza de planos de teste criados durante a suíte
    await prisma.plan.deleteMany({
      where: {
        userId: { in: [anaUserId, marcosUserId] },
      },
    });
    await prisma.aiRun.deleteMany({
      where: {
        userId: { in: [anaUserId, marcosUserId] },
      },
    });
    await app.close();
  });

  describe('POST /api/plans/generate (Modo Mock e Persistência Atômica)', () => {
    it('deve gerar plano em modo mock, persistir AiRun (SUCCEEDED) e Plan (RASCUNHO)', async () => {
      const plansBefore = await prisma.plan.count({ where: { userId: anaUserId } });

      const response = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillCodes: ['EF01CO01'],
          instrucao:
            'Proponha uma investigação prática de organização e classificação de materiais em grupos.',
          duracao: 50,
          recursosDigitais: true,
          tituloProvisorio: 'Organização e Padrões na Sala de Aula',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('RASCUNHO');
      expect(response.body.aiAssisted).toBe(true);
      expect(response.body.skills).toHaveLength(1);
      expect(response.body.skills[0].codigo).toBe('EF01CO01');
      expect(response.body.conteudoMarkdown).toContain('# ');
      expect(response.body.conteudoMarkdown).toContain('## Objetivos específicos');

      // Verifica no banco de dados
      const plansAfter = await prisma.plan.count({ where: { userId: anaUserId } });
      expect(plansAfter).toBe(plansBefore + 1);

      const dbPlan = await prisma.plan.findUnique({
        where: { id: response.body.id },
        include: { aiRun: true, skills: true },
      });

      expect(dbPlan).toBeDefined();
      expect(dbPlan?.userId).toBe(anaUserId);
      expect(dbPlan?.aiRun?.status).toBe('SUCCEEDED');
      expect(dbPlan?.skills).toHaveLength(1);
    });

    it('deve abortar atomicamente sem salvar plano quando o n8n falhar (HTTP 502)', async () => {
      const plansBefore = await prisma.plan.count();
      const aiRunsBefore = await prisma.aiRun.count();

      const response = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillCodes: ['EF01CO01'],
          instrucao: 'SIMULAR_ERRO_N8N teste de falha atômica do backend',
          duracao: 50,
          recursosDigitais: false,
        })
        .expect(502);

      expect(response.body.message).toBe(
        'Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.',
      );

      // Nenhum plano parcial criado no banco
      const plansAfter = await prisma.plan.count();
      expect(plansAfter).toBe(plansBefore);

      // AiRun registrado como FAILED
      const aiRunsAfter = await prisma.aiRun.count();
      expect(aiRunsAfter).toBe(aiRunsBefore + 1);

      const failedRun = await prisma.aiRun.findFirst({
        where: { userId: anaUserId, status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(failedRun).toBeDefined();
      expect(failedRun?.errorMessage).toContain('Erro 500');
    });

    it('deve abortar atomicamente sem salvar plano em caso de timeout simulado (HTTP 504)', async () => {
      const plansBefore = await prisma.plan.count();

      const response = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillCodes: ['EF01CO01'],
          instrucao: 'SIMULAR_TIMEOUT_N8N teste de timeout aos 45 segundos',
          duracao: 50,
          recursosDigitais: false,
        })
        .expect(504);

      expect(response.body.message).toBe(
        'Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.',
      );

      const plansAfter = await prisma.plan.count();
      expect(plansAfter).toBe(plansBefore);
    });

    it('deve rejeitar requisição com dados inválidos (HTTP 400)', async () => {
      await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillCodes: [],
          instrucao: 'curto',
          duracao: 5,
          recursosDigitais: false,
        })
        .expect(400);
    });
  });

  describe('GET /api/plans e Isolamento Multiusuário', () => {
    it('deve listar apenas planos pertencentes ao professor autenticado', async () => {
      const resAna = await request(app.getHttpServer())
        .get('/api/plans')
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(200);

      expect(resAna.body).toHaveProperty('total');
      expect(resAna.body.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(resAna.body.items)).toBe(true);

      const resMarcos = await request(app.getHttpServer())
        .get('/api/plans')
        .set('Authorization', `Bearer ${marcosToken}`)
        .expect(200);

      expect(resMarcos.body.total).toBe(0);
      expect(resMarcos.body.items).toHaveLength(0);
    });
  });

  describe('GET /api/plans/:id e PUT /api/plans/:id (Proteção Estrita IDOR)', () => {
    let anaPlanId: string;

    beforeAll(async () => {
      // Cria plano para Ana
      const genRes = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillCodes: ['EF01CO01'],
          instrucao: 'Plano confidencial da Professora Ana para avaliação de padrões.',
          duracao: 50,
          recursosDigitais: true,
          tituloProvisorio: 'Plano Confidencial Ana',
        });

      anaPlanId = genRes.body.id;
    });

    it('Ana deve conseguir acessar e visualizar os detalhes do seu próprio plano', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(200);

      expect(res.body.id).toBe(anaPlanId);
      expect(res.body.conteudoMarkdown).toBeDefined();
    });

    it('Marcos deve receber 404 Not Found ao tentar acessar o plano de Ana (Proteção IDOR)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${marcosToken}`)
        .expect(404);

      expect(res.body.message).toBe('Plano não encontrado.');
    });

    it('Marcos deve receber 404 Not Found ao tentar atualizar o plano de Ana (Proteção IDOR)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${marcosToken}`)
        .send({
          titulo: 'Tentativa de Invasão por Marcos',
          conteudoMarkdown: '# Hacker Attack',
        })
        .expect(404);

      expect(res.body.message).toBe('Plano não encontrado.');

      // Garante que o plano de Ana permaneceu intacto no banco
      const planInDb = await prisma.plan.findUnique({ where: { id: anaPlanId } });
      expect(planInDb?.titulo).not.toBe('Tentativa de Invasão por Marcos');
    });

    it('Ana deve conseguir atualizar o título e o Markdown do seu próprio plano', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          titulo: 'Plano de Aula: Objetos e Padrões (Revisado)',
          conteudoMarkdown: '# Plano Revisado\n\n- Novo objetivo ajustado pela professora.',
        })
        .expect(200);

      expect(res.body.titulo).toBe('Plano de Aula: Objetos e Padrões (Revisado)');
      expect(res.body.conteudoMarkdown).toContain('Novo objetivo ajustado');

      // Verifica no banco de dados
      const updatedInDb = await prisma.plan.findUnique({ where: { id: anaPlanId } });
      expect(updatedInDb?.titulo).toBe('Plano de Aula: Objetos e Padrões (Revisado)');
    });
  });
});
