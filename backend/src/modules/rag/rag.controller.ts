import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectRagQueryDto } from './dto/project-rag-query.dto';
import { RagSearchQueryDto } from './dto/search-rag.dto';
import { RagService } from './rag.service';

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
    constructor(private readonly ragService: RagService) { }

    @Post('project')
    queryProject(@Body() dto: ProjectRagQueryDto) {
        return this.ragService.getProjectContext(dto);
    }

    @Post('project/:projectId/search')
    searchProject(
        @Param('projectId') projectId: string,
        @Body() dto: RagSearchQueryDto,
    ) {
        return this.ragService.searchProjectSegments({
            projectId,
            query: dto.q,
            limit: dto.limit,
            nodeId: dto.nodeId,
        });
    }
}
