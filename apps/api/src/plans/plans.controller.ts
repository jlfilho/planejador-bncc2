import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GeneratePlanDto, GeneratePlanSchema } from './dto/generate-plan.dto';
import { UpdatePlanDto, UpdatePlanSchema } from './dto/update-plan.dto';

@Controller('api/plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: GeneratePlanDto,
  ) {
    const parsed = GeneratePlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors[0]?.message || 'Dados de entrada inválidos para geração do plano.',
      );
    }

    return this.plansService.generatePlan(user, parsed.data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listPlans(
    @CurrentUser('id') userId: string,
    @Query('q') q?: string,
  ) {
    return this.plansService.listPlans(userId, q);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPlanById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.plansService.getPlanById(id, userId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: UpdatePlanDto,
  ) {
    const parsed = UpdatePlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors[0]?.message || 'Dados de atualização inválidos.',
      );
    }

    return this.plansService.updatePlan(id, userId, parsed.data);
  }
}
