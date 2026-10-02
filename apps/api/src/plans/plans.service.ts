import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { N8nClient, N8nTimeoutError } from '../ai/n8n.client';
import { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nClient: N8nClient,
  ) {}

  async generatePlan(user: AuthenticatedUser, dto: GeneratePlanDto) {
    const skills = await this.prisma.bnccSkill.findMany({
      where: {
        codigo: { in: dto.skillCodes },
      },
    });

    if (!skills || skills.length === 0) {
      throw new BadRequestException(
        'Nenhuma habilidade válida encontrada para os códigos informados.',
      );
    }

    const habilidadeString = skills
      .map((s) => `${s.codigo} — ${s.descricao}`)
      .join('\n\n');

    const requestId = randomUUID();
    const startTime = Date.now();

    const aiRun = await this.prisma.aiRun.create({
      data: {
        userId: user.id,
        requestId,
        status: 'PENDING',
        payloadRequest: {
          sessao: user.email,
          habilidade: habilidadeString,
          instrucao: dto.instrucao,
          duracao: dto.duracao,
          recursos_digitais: dto.recursosDigitais,
        },
      },
    });

    let n8nResponse;
    try {
      n8nResponse = await this.n8nClient.generateLessonPlan(
        {
          sessao: user.email,
          habilidade: habilidadeString,
          instrucao: dto.instrucao,
          duracao: dto.duracao,
          recursos_digitais: dto.recursosDigitais,
        },
        requestId,
      );
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'FAILED',
          errorMessage,
          durationMs,
        },
      });

      this.logger.warn(
        `[PlansService] Falha na geração do plano pelo n8n (requestId: ${requestId}, user: ${user.email}): ${errorMessage}`,
      );

      if (err instanceof N8nTimeoutError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.GATEWAY_TIMEOUT,
            message:
              'Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.',
            error: 'AI_GENERATION_TIMEOUT',
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message:
            'Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.',
          error: 'AI_GENERATION_FAILED',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Extrai título do Markdown (# Título) com fallback
    const titleMatch = n8nResponse.answer.match(/^#\s+(.+)$/m);
    let titulo = titleMatch
      ? titleMatch[1].trim()
      : dto.tituloProvisorio || `Plano de Aula - ${skills[0].codigo}`;

    if (titulo.length > 100) {
      titulo = titulo.substring(0, 100);
    }

    const durationMs = Date.now() - startTime;

    // Transação atômica: persistência do plano e atualização do AiRun para SUCCEEDED
    const createdPlan = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          userId: user.id,
          titulo,
          instrucao: dto.instrucao,
          duracao: dto.duracao,
          recursosDigitais: dto.recursosDigitais,
          conteudoMarkdown: n8nResponse.answer,
          status: 'RASCUNHO',
          aiAssisted: true,
          aiRunId: aiRun.id,
          skills: {
            create: skills.map((s) => ({ skillId: s.id })),
          },
        },
        include: {
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

      await tx.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'SUCCEEDED',
          payloadResponse: n8nResponse as any,
          durationMs,
        },
      });

      return plan;
    });

    return {
      id: createdPlan.id,
      titulo: createdPlan.titulo,
      instrucao: createdPlan.instrucao,
      duracao: createdPlan.duracao,
      recursosDigitais: createdPlan.recursosDigitais,
      conteudoMarkdown: createdPlan.conteudoMarkdown,
      status: createdPlan.status,
      aiAssisted: createdPlan.aiAssisted,
      createdAt: createdPlan.createdAt,
      updatedAt: createdPlan.updatedAt,
      skills: createdPlan.skills.map((ps: any) => ({
        codigo: ps.skill.codigo,
        nivel: ps.skill.nivel,
        ano: ps.skill.ano,
        eixo: ps.skill.eixo,
      })),
    };
  }

  async listPlans(userId: string, q?: string) {
    const where: any = { userId };

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { titulo: { contains: term, mode: 'insensitive' } },
        {
          skills: {
            some: {
              skill: {
                OR: [
                  { codigo: { contains: term, mode: 'insensitive' } },
                  { descricao: { contains: term, mode: 'insensitive' } },
                  { eixo: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        include: {
          skills: {
            include: {
              skill: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      total,
      items: plans.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        duracao: p.duracao,
        recursosDigitais: p.recursosDigitais,
        status: p.status,
        aiAssisted: p.aiAssisted,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        skills: p.skills.map((ps: any) => ({
          codigo: ps.skill.codigo,
          nivel: ps.skill.nivel,
          ano: ps.skill.ano,
          eixo: ps.skill.eixo,
        })),
      })),
    };
  }

  async getPlanById(id: string, userId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, userId },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!plan) {
      this.logger.warn(
        `[PlansService] Tentativa de acesso a plano inexistente ou pertencente a outro docente (id: ${id}, userId: ${userId})`,
      );
      throw new NotFoundException('Plano não encontrado.');
    }

    return {
      id: plan.id,
      titulo: plan.titulo,
      instrucao: plan.instrucao,
      duracao: plan.duracao,
      recursosDigitais: plan.recursosDigitais,
      conteudoMarkdown: plan.conteudoMarkdown,
      status: plan.status,
      aiAssisted: plan.aiAssisted,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      skills: plan.skills.map((ps: any) => ({
        id: ps.skill.id,
        codigo: ps.skill.codigo,
        nivel: ps.skill.nivel,
        ano: ps.skill.ano,
        eixo: ps.skill.eixo,
        descricao: ps.skill.descricao,
      })),
    };
  }

  async updatePlan(id: string, userId: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      this.logger.warn(
        `[PlansService] Tentativa de edição em plano inexistente ou de outro docente (id: ${id}, userId: ${userId})`,
      );
      throw new NotFoundException('Plano não encontrado.');
    }

    const updated = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.conteudoMarkdown !== undefined
          ? { conteudoMarkdown: dto.conteudoMarkdown }
          : {}),
      },
    });

    return {
      id: updated.id,
      titulo: updated.titulo,
      conteudoMarkdown: updated.conteudoMarkdown,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }
}
