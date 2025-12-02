import { Body, Controller, Get, Param, Post, Put, UploadedFile, UploadedFiles, UseGuards, UseInterceptors, StreamableFile, Res } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { IngestFilesDto } from './dto/ingest-files.dto';
import { CreateUploadRequestDto } from './dto/create-upload-request.dto';
import { IngestionService } from './ingestion.service';

const originalsDir = './uploads/originals';
if (!fs.existsSync(originalsDir)) {
    fs.mkdirSync(originalsDir, { recursive: true });
}

@Controller('ingestion')
@UseGuards(JwtAuthGuard)
export class IngestionController {
    constructor(private readonly ingestionService: IngestionService) { }

    @Post('files')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: diskStorage({
                destination: originalsDir,
                filename: (_, file, cb) => {
                    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    async uploadFiles(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() body: IngestFilesDto,
    ) {
        return this.ingestionService.ingestFiles({
            tenantId: body.tenantId,
            projectId: body.projectId,
            nodeId: body.nodeId,
            source: body.source,
            files,
        });
    }

    @Post('upload')
    async requestUpload(@Body() body: CreateUploadRequestDto) {
        return this.ingestionService.requestUpload(body);
    }

    @Put('upload/:fileId/content')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB default limit
        },
    }))
    async uploadContent(
        @Param('fileId') fileId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.ingestionService.receiveUploadedFile(fileId, file);
    }

    @Get('projects/:projectId/files')
    async listProjectFiles(@Param('projectId') projectId: string) {
        return this.ingestionService.listProjectFiles(projectId);
    }

    @Get('files/:fileId/content')
    async downloadFile(@Param('fileId') fileId: string, @Res({ passthrough: true }) res: Response) {
        const { stream, mimeType, fileName } = await this.ingestionService.getFileStream(fileId);

        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="${fileName}"`,
        });

        return new StreamableFile(stream);
    }
}
