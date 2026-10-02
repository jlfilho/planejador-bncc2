import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BnccModule } from './bncc/bncc.module';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [PrismaModule, AuthModule, BnccModule, PlansModule],
})
export class AppModule {}

