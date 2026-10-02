import { Module } from '@nestjs/common';
import { BnccService } from './bncc.service';
import { BnccController } from './bncc.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BnccController],
  providers: [BnccService],
  exports: [BnccService],
})
export class BnccModule {}
