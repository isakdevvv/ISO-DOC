import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ProjectDocsService } from './project-docs.service';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { GenerateProjectStructureDto } from './dto/generate-project-structure.dto';

interface AuthenticatedRequest extends Request {
    user?: {
        tenantId?: string;
    };
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectDocsController {
    constructor(private readonly projectDocsService: ProjectDocsService) { }

    @Post(':projectId/attachments')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 50 * 1024 * 1024 },
    }))
    uploadAttachment(
        @Param('projectId') projectId: string,
        @Body() dto: UploadAttachmentDto,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.projectDocsService.uploadAttachment(projectId, dto, file, this.getAuth(req));
    }

    @Post(':projectId/generate')
    generateStructure(
        @Param('projectId') projectId: string,
        @Body() dto: GenerateProjectStructureDto,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.projectDocsService.generateStructure(projectId, dto, this.getAuth(req));
    }

    @Get(':projectId/tree')
    getTree(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest) {
        return this.projectDocsService.getFolderTree(projectId, this.getAuth(req));
    }

    @Post(':projectId/regenerate/internkontroll')
    regenerateInternkontroll(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest) {
        return this.projectDocsService.regenerateInternkontroll(projectId, this.getAuth(req));
    }

    private getAuth(req: AuthenticatedRequest) {
        return { tenantId: req.user?.tenantId };
    }
}
