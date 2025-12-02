import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyScope } from '@prisma/client';

// TODO: Add AuthGuard here once we have a proper user context
@Controller('api-keys')
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Post()
    async create(@Body() body: {
        tenantId: string;
        projectId?: string;
        nodeId?: string;
        name: string;
        scope: ApiKeyScope;
        expiresAt?: string;
    }) {
        return this.apiKeysService.create({
            ...body,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        });
    }

    @Get()
    async findAll(@Query('tenantId') tenantId: string, @Query('projectId') projectId?: string) {
        return this.apiKeysService.findAll(tenantId, projectId);
    }

    @Delete(':id')
    async revoke(@Param('id') id: string) {
        return this.apiKeysService.revoke(id);
    }
}
