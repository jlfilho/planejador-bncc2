import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('BNCC Catalog Endpoints (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    // Login com a conta de demonstração da Ana Souza
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/bncc/skills - deve rejeitar acesso sem token Bearer', async () => {
    await request(app.getHttpServer()).get('/api/bncc/skills').expect(401);
  });

  it('GET /api/bncc/skills - deve listar todas as habilidades para professor autenticado', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('items');
    expect(response.body.total).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/bncc/skills?q=EF01CO01 - deve filtrar por código de habilidade', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills?q=EF01CO01')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].codigo).toBe('EF01CO01');
  });

  it('GET /api/bncc/skills?ano=1 - deve filtrar por ano escolar', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills?ano=1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.total).toBeGreaterThanOrEqual(2);
    response.body.items.forEach((item: any) => {
      expect(item.ano).toBe(1);
    });
  });

  it('GET /api/bncc/skills/:codigo - deve retornar detalhes de habilidade específica', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills/EF01CO01')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.codigo).toBe('EF01CO01');
    expect(response.body.nivel).toBe('Ensino Fundamental');
    expect(response.body).toHaveProperty('descricao');
  });

  it('GET /api/bncc/skills/:codigo - deve retornar 404 para código inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/bncc/skills/CODIGO_INVALIDO')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
