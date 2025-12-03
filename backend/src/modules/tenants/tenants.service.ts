import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
    constructor(private readonly prisma: PrismaService) { }

    async getTenant(idOrSlug: string) {
        const tenant = await this.prisma.tenant.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug },
                ],
            },
        });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }
        return tenant;
    }

    async updateTenant(id: string, dto: UpdateTenantDto) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id } });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return this.prisma.tenant.update({
            where: { id },
            data: {
                ...dto,
            },
        });
    }
}
