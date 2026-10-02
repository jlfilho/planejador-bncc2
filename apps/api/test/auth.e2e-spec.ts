import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login - deve autenticar com sucesso e emitir cookie HttpOnly', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.user).toMatchObject({
      email: 'ana.souza@escola.gov.br',
      name: 'Profª Ana Souza',
      role: 'DOCENTE',
    });

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = (cookies as unknown as string[]).find((c) =>
      c.startsWith('refreshToken='),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth');
    expect(refreshCookie).toContain('SameSite=Lax');
  });

  it('POST /api/auth/login - deve rejeitar credenciais inválidas com erro 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: 'senha-totalmente-errada',
      })
      .expect(401);

    expect(response.body.message).toContain('Credenciais inválidas');
  });

  it('GET /api/auth/me - deve rejeitar requisição sem token Bearer', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me - deve retornar perfil com token Bearer válido', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      });

    const token = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.user.email).toBe('ana.souza@escola.gov.br');
  });

  it('POST /api/auth/refresh - deve renovar sessão utilizando cookie seguro', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      });

    const cookie = loginRes.headers['set-cookie'];

    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body.user.email).toBe('ana.souza@escola.gov.br');
  });

  it('POST /api/auth/logout - deve encerrar sessão e limpar o cookie', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana.souza@escola.gov.br',
        password: process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana',
      });

    const cookie = loginRes.headers['set-cookie'];

    const logoutRes = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    expect(logoutRes.body.success).toBe(true);

    const cookies = logoutRes.headers['set-cookie'];
    if (cookies) {
      const refreshCookie = (cookies as unknown as string[]).find((c) =>
        c.startsWith('refreshToken='),
      );
      if (refreshCookie) {
        expect(refreshCookie).toContain('refreshToken=;');
      }
    }
  });
});
