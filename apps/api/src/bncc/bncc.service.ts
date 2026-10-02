import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface BnccQueryFilters {
  q?: string;
  nivel?: string;
  ano?: number;
  eixo?: string;
}

@Injectable()
export class BnccService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: BnccQueryFilters = {}) {
    const where: Prisma.BnccSkillWhereInput = {};

    if (filters.nivel) {
      where.nivel = { equals: filters.nivel, mode: 'insensitive' };
    }

    if (filters.ano !== undefined && !isNaN(filters.ano)) {
      where.ano = filters.ano;
    }

    if (filters.eixo) {
      where.eixo = { equals: filters.eixo, mode: 'insensitive' };
    }

    if (filters.q && filters.q.trim().length > 0) {
      const term = filters.q.trim();
      where.OR = [
        { codigo: { contains: term, mode: 'insensitive' } },
        { descricao: { contains: term, mode: 'insensitive' } },
        { eixo: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.bnccSkill.findMany({
        where,
        orderBy: [{ nivel: 'asc' }, { ano: 'asc' }, { codigo: 'asc' }],
      }),
      this.prisma.bnccSkill.count({ where }),
    ]);

    return {
      total,
      items,
    };
  }

  async findByCodigo(codigo: string) {
    const skill = await this.prisma.bnccSkill.findUnique({
      where: { codigo },
    });

    if (!skill) {
      throw new NotFoundException('Habilidade BNCC não encontrada para o código informado.');
    }

    return skill;
  }
}
