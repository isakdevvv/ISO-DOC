import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { PrismaService } from '../../prisma.service';

@Module({
    imports: [],
    controllers: [ApiKeysController],
    providers: [ApiKeysService, PrismaService],
    exports: [ApiKeysService],
})
export class ApiKeysModule { }
