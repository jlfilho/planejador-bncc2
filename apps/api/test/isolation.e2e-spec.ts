import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Strict Tenant Isolation between Teachers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let anaToken: string;
  let anaUserId: string;
  let marcosToken: string;
  let marcosUserId: string;
  let anaPlanId: string;

  beforeAll(async () => {
    process.env.N8N_MOCK_MODE = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Login Professora Ana
    const loginAna = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      })
      .expect(200);

    anaToken = loginAna.body.accessToken;
    anaUserId = loginAna.body.user.id;

    // Login Professor Marcos
    const loginMarcos = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'marcos.lima@escola.gov.br',
        password: process.env.DEMO_MARCOS_PASSWORD || 'senha-demo-marcos',
      })
      .expect(200);

    marcosToken = loginMarcos.body.accessToken;
    marcosUserId = loginMarcos.body.user.id;

    // Cria plano pertencente a Ana
    const genRes = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        skillCodes: ['EF01CO01'],
        instrucao: 'Plano estritamente confidencial da Professora Ana para avaliação de padrões.',
        duracao: 50,
        recursosDigitais: true,
        tituloProvisorio: 'Plano Confidencial da Ana',
      })
      .expect(201);

    anaPlanId = genRes.body.id;
  });

  afterAll(async () => {
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

  it('Professora Ana deve conseguir listar o seu próprio plano em /api/plans', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    expect(res.body.items).toBeDefined();
    const found = res.body.items.some((p: any) => p.id === anaPlanId);
    expect(found).toBe(true);
  });

  it('Professor Marcos NÃO deve ver o plano de Ana ao listar /api/plans', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Authorization', `Bearer ${marcosToken}`)
      .expect(200);

    expect(res.body.items).toBeDefined();
    const found = res.body.items.some((p: any) => p.id === anaPlanId);
    expect(found).toBe(false);
  });

  it('Professora Ana deve conseguir acessar o detalhe do seu plano por ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/plans/${anaPlanId}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    expect(res.body.id).toBe(anaPlanId);
    expect(res.body.titulo).toBeDefined();
    expect(res.body.conteudoMarkdown).toBeDefined();
  });

  it('Professor Marcos deve receber 404 Not Found ao tentar acessar o plano de Ana por ID (Prevenção IDOR)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/plans/${anaPlanId}`)
      .set('Authorization', `Bearer ${marcosToken}`)
      .expect(404);

    expect(res.body.message).toBe('Plano não encontrado.');
  });

  it('Professor Marcos deve receber 404 Not Found ao tentar editar ou sobrescrever o plano de Ana (Prevenção IDOR)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/plans/${anaPlanId}`)
      .set('Authorization', `Bearer ${marcosToken}`)
      .send({
        titulo: 'Tentativa de Alteração Indevida',
        conteudoMarkdown: '# Plano Adulterado',
      })
      .expect(404);

    expect(res.body.message).toBe('Plano não encontrado.');

    // Confirma que no banco de dados o plano de Ana não foi alterado
    const planInDb = await prisma.plan.findUnique({ where: { id: anaPlanId } });
    expect(planInDb?.titulo).not.toBe('Tentativa de Alteração Indevida');
    expect(planInDb?.conteudoMarkdown).not.toContain('Plano Adulterado');
  });

  it('Tentativa de acesso não autenticado deve receber 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .get(`/api/plans/${anaPlanId}`)
      .expect(401);
  });
});
