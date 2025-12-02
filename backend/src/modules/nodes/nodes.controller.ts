import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { Prisma } from '@prisma/client';
import { DocumentBuilderService } from '@/modules/document-builder/document-builder.service';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('nodes')
export class NodesController {
    constructor(
        private readonly nodesService: NodesService,
        private readonly documentBuilder: DocumentBuilderService,
    ) { }

    @Post()
    create(@Body() createNodeDto: Prisma.NodeCreateInput) {
        return this.nodesService.create(createNodeDto);
    }

    @Get()
    findAll(@Query('projectId') projectId: string) {
        return this.nodesService.findAll(projectId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.nodesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateNodeDto: Prisma.NodeUpdateInput) {
        return this.nodesService.update(id, updateNodeDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.nodesService.remove(id);
    }

    @Post(':id/generate')
    generate(@Param('id') id: string) {
        return this.documentBuilder.generateNode(id);
    }

    @Get(':id/revisions')
    getRevisions(@Param('id') id: string) {
        return this.nodesService.getRevisions(id);
    }

    @Get(':id/revisions/:revisionId')
    getRevision(@Param('id') id: string, @Param('revisionId') revisionId: string) {
        return this.nodesService.getRevision(id, revisionId);
    }
}
