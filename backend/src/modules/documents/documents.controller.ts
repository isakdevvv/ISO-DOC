import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { Response } from 'express';

import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { Document } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { IngestionService } from '../ingestion/ingestion.service';

@Controller('documents')
export class DocumentsController {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly ingestionService: IngestionService
    ) { }


    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async create(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { title?: string }
    ): Promise<Document> {
        const doc = await this.documentsService.createDocument({
            title: body.title || file.originalname,
            filePath: file.path,
            status: 'PENDING',
        });

        // Trigger ingestion (async)
        this.ingestionService.ingestDocument(doc.id);

        return doc;
    }


    @Get()
    async findAll(): Promise<Document[]> {
        return this.documentsService.documents({
            orderBy: { createdAt: 'desc' }
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Document | null> {
        return this.documentsService.document({ id });
    }

    @Get(':id/content')
    async download(@Param('id') id: string, @Res() res: Response) {
        const document = await this.documentsService.document({ id });
        if (!document) {
            return res.status(404).send('Document not found');
        }
        // Use sendFile to allow inline viewing (browser preview)
        // We assume filePath is relative to the project root (e.g. "uploads/...")
        res.sendFile(document.filePath, { root: '.' });
    }

}

