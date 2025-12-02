import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('tenants')
// @UseGuards(JwtAuthGuard) // Temporarily disable auth for dev speed if needed, but better keep it
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    @Get(':id')
    get(@Param('id') id: string) {
        return this.tenantsService.getTenant(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
        return this.tenantsService.updateTenant(id, dto);
    }
}
