import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { RuleEngineController } from './rule-engine.controller';
import { RuleEngineService } from './rule-engine.service';

@Module({
    controllers: [RuleEngineController],
    providers: [RuleEngineService, PrismaService],
    exports: [RuleEngineService],
})
export class RuleEngineModule { }
