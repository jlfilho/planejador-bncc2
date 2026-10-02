import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'ana.souza@escola.gov.br',
    name: 'Profª Ana Souza',
    passwordHash: '',
    role: 'DOCENTE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('senha-demo-ana', 10);
  });

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('deve autenticar docente com credenciais válidas e emitir tokens', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockPrismaService.session.create.mockResolvedValue({ id: 'session-1' });

    const result = await service.login('ana.souza@escola.gov.br', 'senha-demo-ana');

    expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
    expect(result).toHaveProperty('rawRefreshToken');
    expect(result.user).toEqual({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      role: mockUser.role,
    });
    expect(mockPrismaService.session.create).toHaveBeenCalled();
  });

  it('deve rejeitar login com senha incorreta', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      service.login('ana.souza@escola.gov.br', 'senha-incorreta')
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve rejeitar login para usuário inexistente', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('inexistente@escola.gov.br', 'senha-qualquer')
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve rotacionar refresh token válido com sucesso', async () => {
    const rawToken = 'valid-refresh-token';
    const tokenHash = service.hashToken(rawToken);

    mockPrismaService.session.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: mockUser.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null,
      user: mockUser,
    });
    mockPrismaService.session.update.mockResolvedValue({});
    mockPrismaService.session.create.mockResolvedValue({ id: 'session-2' });

    const result = await service.refresh(rawToken);

    expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
    expect(result).toHaveProperty('rawRefreshToken');
    expect(mockPrismaService.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      })
    );
  });

  it('deve invalidar e rejeitar refresh com sessão revogada ou expirada', async () => {
    mockPrismaService.session.findUnique.mockResolvedValue(null);

    await expect(service.refresh('token-invalido')).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('deve revogar sessão no logout', async () => {
    const rawToken = 'token-to-logout';
    mockPrismaService.session.update.mockResolvedValue({});

    const result = await service.logout(rawToken);

    expect(result).toEqual({ success: true, message: 'Sessão encerrada com sucesso.' });
  });
});
