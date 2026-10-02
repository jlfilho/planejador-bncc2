import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BnccService } from './bncc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/bncc')
@UseGuards(JwtAuthGuard)
export class BnccController {
  constructor(private readonly bnccService: BnccService) {}

  @Get('skills')
  async findAll(
    @Query('q') q?: string,
    @Query('nivel') nivel?: string,
    @Query('ano') ano?: string,
    @Query('eixo') eixo?: string,
  ) {
    const parsedAno = ano ? parseInt(ano, 10) : undefined;
    return this.bnccService.findAll({
      q,
      nivel,
      ano: parsedAno,
      eixo,
    });
  }

  @Get('skills/:codigo')
  async findByCodigo(@Param('codigo') codigo: string) {
    return this.bnccService.findByCodigo(codigo);
  }
}
