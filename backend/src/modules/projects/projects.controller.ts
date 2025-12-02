import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CreateNodeDto } from './dto/create-node.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { DeleteNodeEdgeDto, CreateNodeEdgeDto } from './dto/node-edge.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
        username: string;
        tenantId?: string;
    };
}

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    @ApiOperation({ summary: 'Create project' })
    create(@Body() dto: CreateProjectDto, @Req() req: AuthenticatedRequest) {
        return this.projectsService.createProject(dto, this.getTenant(req));
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update project' })
    update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req: AuthenticatedRequest) {
        return this.projectsService.updateProject(id, dto, this.getTenant(req));
    }

    @Get()
    @ApiOperation({ summary: 'List projects' })
    findAll(@Query('tenantId') tenantId: string | undefined, @Req() req: AuthenticatedRequest) {
        return this.projectsService.getProjects(this.getTenant(req), tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get project' })
    @ApiOkResponse({ description: 'Project with nodes/tasks/facts' })
    findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.projectsService.getProject(id, this.getTenant(req));
    }

    @Post(':id/nodes')
    @ApiOperation({ summary: 'Create node within project' })
    createNode(@Param('id') projectId: string, @Body() dto: CreateNodeDto, @Req() req: AuthenticatedRequest) {
        return this.projectsService.createNode(projectId, dto, this.getTenant(req));
    }

    @Get(':id/nodes')
    @ApiOperation({ summary: 'List nodes for project' })
    listNodes(@Param('id') projectId: string, @Req() req: AuthenticatedRequest) {
        return this.projectsService.listNodes(projectId, this.getTenant(req));
    }

    @Get(':id/edges')
    @ApiOperation({ summary: 'List node edges for project' })
    listEdges(@Param('id') projectId: string, @Req() req: AuthenticatedRequest) {
        return this.projectsService.listEdges(projectId, this.getTenant(req));
    }

    @Post(':id/edges')
    @ApiOperation({ summary: 'Create or update a node edge' })
    createEdge(@Param('id') projectId: string, @Body() dto: CreateNodeEdgeDto, @Req() req: AuthenticatedRequest) {
        return this.projectsService.linkNodes(projectId, dto, this.getTenant(req));
    }

    @Delete(':id/edges')
    @ApiOperation({ summary: 'Remove a node edge' })
    removeEdge(@Param('id') projectId: string, @Body() dto: DeleteNodeEdgeDto, @Req() req: AuthenticatedRequest) {
        return this.projectsService.unlinkNodes(projectId, dto, this.getTenant(req));
    }

    private getTenant(req: AuthenticatedRequest) {
        return req.user?.tenantId;
    }
}
