import { Module, Global } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaService } from '@/prisma.service';

@Global()
@Module({
    controllers: [TenantsController],
    providers: [TenantsService, PrismaService],
    exports: [TenantsService],
})
export class TenantsModule { }
