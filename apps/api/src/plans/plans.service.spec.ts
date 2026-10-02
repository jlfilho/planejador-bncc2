import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { N8nClient, N8nGenerationError, N8nTimeoutError } from '../ai/n8n.client';
import { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';

describe('PlansService', () => {
  let service: PlansService;
  let prisma: any;
  let n8nClient: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'ana.souza@escola.gov.br',
    name: 'Ana Souza',
    role: 'DOCENTE',
  };

  const mockSkill = {
    id: 'skill-uuid-1',
    codigo: 'EF01CO01',
    nivel: 'Ensino Fundamental',
    ano: 1,
    eixo: 'Pensamento Computacional (PC)',
    descricao: 'Organizar objetos físicos ou digitais...',
  };

  beforeEach(async () => {
    prisma = {
      bnccSkill: {
        findMany: jest.fn(),
      },
      aiRun: {
        create: jest.fn(),
        update: jest.fn(),
      },
      plan: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    n8nClient = {
      generateLessonPlan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: prisma },
        { provide: N8nClient, useValue: n8nClient },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
  });

  describe('generatePlan', () => {
    const generateDto = {
      skillCodes: ['EF01CO01'],
      instrucao: 'Criar atividade em duplas com foco em padrões.',
      duracao: 50,
      recursosDigitais: true,
      tituloProvisorio: 'Padrões na Escola',
    };

    it('deve gerar plano e persistir atomicamente AiRun (SUCCEEDED) e Plan (RASCUNHO)', async () => {
      prisma.bnccSkill.findMany.mockResolvedValue([mockSkill]);
      prisma.aiRun.create.mockResolvedValue({ id: 'airun-uuid-1' });

      n8nClient.generateLessonPlan.mockResolvedValue({
        success: true,
        sessao: mockUser.email,
        habilidade: 'EF01CO01 — Organizar objetos...',
        answer: '# Padrões na Escola\n\n## Objetivos específicos\n- Objetivo 1',
        format: 'markdown',
      });

      const createdPlan = {
        id: 'plan-uuid-1',
        userId: mockUser.id,
        titulo: 'Padrões na Escola',
        instrucao: generateDto.instrucao,
        duracao: 50,
        recursosDigitais: true,
        conteudoMarkdown: '# Padrões na Escola\n\n## Objetivos específicos\n- Objetivo 1',
        status: 'RASCUNHO',
        aiAssisted: true,
        aiRunId: 'airun-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        skills: [
          {
            skill: mockSkill,
          },
        ],
      };

      prisma.plan.create.mockResolvedValue(createdPlan);
      prisma.aiRun.update.mockResolvedValue({});

      const result = await service.generatePlan(mockUser, generateDto);

      expect(prisma.bnccSkill.findMany).toHaveBeenCalledWith({
        where: { codigo: { in: generateDto.skillCodes } },
      });
      expect(prisma.aiRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
            status: 'PENDING',
          }),
        }),
      );
      expect(n8nClient.generateLessonPlan).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.plan.create).toHaveBeenCalled();
      expect(prisma.aiRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'airun-uuid-1' },
          data: expect.objectContaining({
            status: 'SUCCEEDED',
          }),
        }),
      );
      expect(result.id).toBe('plan-uuid-1');
      expect(result.status).toBe('RASCUNHO');
      expect(result.aiAssisted).toBe(true);
      expect(result.skills[0].codigo).toBe('EF01CO01');
    });

    it('deve marcar AiRun como FAILED e NÃO persistir nenhum plano em caso de erro na IA', async () => {
      prisma.bnccSkill.findMany.mockResolvedValue([mockSkill]);
      prisma.aiRun.create.mockResolvedValue({ id: 'airun-uuid-fail' });
      n8nClient.generateLessonPlan.mockRejectedValue(
        new N8nGenerationError('Erro 500 simulado no n8n'),
      );

      await expect(service.generatePlan(mockUser, generateDto)).rejects.toThrow(HttpException);

      expect(prisma.plan.create).not.toHaveBeenCalled();
      expect(prisma.aiRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'airun-uuid-fail' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: expect.stringContaining('Erro 500'),
          }),
        }),
      );
    });

    it('deve marcar AiRun como FAILED com status 504 em caso de timeout na IA', async () => {
      prisma.bnccSkill.findMany.mockResolvedValue([mockSkill]);
      prisma.aiRun.create.mockResolvedValue({ id: 'airun-uuid-timeout' });
      n8nClient.generateLessonPlan.mockRejectedValue(
        new N8nTimeoutError('Tempo limite excedido'),
      );

      try {
        await service.generatePlan(mockUser, generateDto);
        fail('Deveria ter lançado HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
      }

      expect(prisma.plan.create).not.toHaveBeenCalled();
      expect(prisma.aiRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'airun-uuid-timeout' },
          data: expect.objectContaining({
            status: 'FAILED',
          }),
        }),
      );
    });

    it('deve lançar BadRequestException se nenhum código de habilidade for válido', async () => {
      prisma.bnccSkill.findMany.mockResolvedValue([]);

      await expect(
        service.generatePlan(mockUser, { ...generateDto, skillCodes: ['INVALIDO'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listPlans', () => {
    it('deve filtrar obrigatoriamente por userId', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          titulo: 'Plano 1',
          duracao: 50,
          recursosDigitais: false,
          status: 'RASCUNHO',
          aiAssisted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          skills: [{ skill: mockSkill }],
        },
      ];

      prisma.plan.findMany.mockResolvedValue(mockPlans);
      prisma.plan.count.mockResolvedValue(1);

      const result = await service.listPlans(mockUser.id, 'padrões');

      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUser.id,
          }),
        }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('plan-1');
    });
  });

  describe('getPlanById (Proteção IDOR)', () => {
    it('deve retornar plano pertencente ao usuário', async () => {
      const mockPlan = {
        id: 'plan-1',
        userId: mockUser.id,
        titulo: 'Plano 1',
        instrucao: 'Instrução',
        duracao: 50,
        recursosDigitais: true,
        conteudoMarkdown: '# Plano 1',
        status: 'RASCUNHO',
        aiAssisted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        skills: [{ skill: mockSkill }],
      };

      prisma.plan.findFirst.mockResolvedValue(mockPlan);

      const result = await service.getPlanById('plan-1', mockUser.id);
      expect(result.id).toBe('plan-1');
      expect(prisma.plan.findFirst).toHaveBeenCalledWith({
        where: { id: 'plan-1', userId: mockUser.id },
        include: expect.any(Object),
      });
    });

    it('deve lançar 404 Not Found caso plano pertença a outro usuário', async () => {
      prisma.plan.findFirst.mockResolvedValue(null);

      await expect(service.getPlanById('plan-alheio', mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePlan', () => {
    it('deve atualizar plano pertencente ao usuário', async () => {
      prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1', userId: mockUser.id });
      prisma.plan.update.mockResolvedValue({
        id: 'plan-1',
        titulo: 'Novo Título',
        conteudoMarkdown: '# Novo Conteúdo',
        status: 'RASCUNHO',
        updatedAt: new Date(),
      });

      const result = await service.updatePlan('plan-1', mockUser.id, {
        titulo: 'Novo Título',
        conteudoMarkdown: '# Novo Conteúdo',
      });

      expect(result.titulo).toBe('Novo Título');
      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: expect.objectContaining({
          titulo: 'Novo Título',
          conteudoMarkdown: '# Novo Conteúdo',
        }),
      });
    });

    it('deve lançar 404 Not Found se tentar atualizar plano de outro usuário', async () => {
      prisma.plan.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePlan('plan-alheio', mockUser.id, { titulo: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
