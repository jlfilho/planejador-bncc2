import { Test, TestingModule } from '@nestjs/testing';
import { BnccService } from './bncc.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('BnccService', () => {
  let service: BnccService;
  let prisma: PrismaService;

  const mockSkills = [
    {
      id: 'skill-uuid-1',
      codigo: 'EF01CO01',
      nivel: 'Ensino Fundamental',
      ano: 1,
      eixo: 'Pensamento Computacional (PC)',
      descricao: 'Organizar objetos físicos ou digitais...',
      explicacao: 'Explicacao 1',
      exemplos: 'Exemplos 1',
      createdAt: new Date(),
    },
    {
      id: 'skill-uuid-2',
      codigo: 'EF02CO04',
      nivel: 'Ensino Fundamental',
      ano: 2,
      eixo: 'Mundo Digital (MD)',
      descricao: 'Diferenciar componentes físicos e programas...',
      explicacao: 'Explicacao 2',
      exemplos: 'Exemplos 2',
      createdAt: new Date(),
    },
  ];

  const mockPrismaService = {
    bnccSkill: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BnccService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BnccService>(BnccService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('deve listar habilidades sem filtros', async () => {
    mockPrismaService.bnccSkill.findMany.mockResolvedValue(mockSkills);
    mockPrismaService.bnccSkill.count.mockResolvedValue(2);

    const result = await service.findAll();

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it('deve aplicar filtro por termo de busca q', async () => {
    mockPrismaService.bnccSkill.findMany.mockResolvedValue([mockSkills[0]]);
    mockPrismaService.bnccSkill.count.mockResolvedValue(1);

    const result = await service.findAll({ q: 'EF01' });

    expect(result.total).toBe(1);
    expect(mockPrismaService.bnccSkill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { codigo: { contains: 'EF01', mode: 'insensitive' } },
            { descricao: { contains: 'EF01', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  it('deve retornar habilidade específica por código', async () => {
    mockPrismaService.bnccSkill.findUnique.mockResolvedValue(mockSkills[0]);

    const result = await service.findByCodigo('EF01CO01');

    expect(result.codigo).toBe('EF01CO01');
  });

  it('deve lançar NotFoundException quando código não existir', async () => {
    mockPrismaService.bnccSkill.findUnique.mockResolvedValue(null);

    await expect(service.findByCodigo('INEXISTENTE')).rejects.toThrow(
      NotFoundException
    );
  });
});
