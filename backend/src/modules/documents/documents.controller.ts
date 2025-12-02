import { Controller, Get, Post, Delete, Body, Param, UseInterceptors, UploadedFiles, Res, UseGuards, Query, Patch } from '@nestjs/common';
import { Response } from 'express';

import { FilesInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { Document } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';

import { IngestionService } from '../ingestion/ingestion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly ingestionService: IngestionService,
    ) { }


    @Post()
    @UseInterceptors(FilesInterceptor('files', 10, {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async create(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() body: { title?: string }
    ): Promise<{ batchId: string, documents: Document[] }> {
        const createdDocs: Document[] = [];
        const batchId = crypto.randomUUID();

        for (const file of files) {
            const doc = await this.documentsService.createDocument({
                title: file.originalname, // Use filename as title for bulk
                filePath: file.path,
                status: 'UPLOADING', // Initial status
                batchId: batchId,
            });
            createdDocs.push(doc);

            // Trigger staging (async, fire and forget)
            this.ingestionService.stageDocument(doc.id).catch(err => {
                console.error(`Background staging failed for ${doc.id}:`, err);
            });
        }

        return { batchId, documents: createdDocs };
    }

    @Get('batch/:batchId/progress')
    async getBatchProgress(@Param('batchId') batchId: string) {
        return this.documentsService.getBatchStats(batchId);
    }

    @Post('commit')
    async commit(@Body() body: { documentIds: string[] }) {
        const results = [];
        for (const id of body.documentIds) {
            try {
                await this.ingestionService.commitDocument(id);
                results.push({ id, status: 'COMMITTED' });
            } catch (e) {
                results.push({ id, status: 'FAILED', error: e.message });
            }
        }
        return results;
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

    @Patch(':id/review')
    async updateReview(
        @Param('id') id: string,
        @Body() body: any,
    ): Promise<Document> {
        return this.documentsService.updateDocument({
            where: { id },
            data: { reviewData: body },
        });
    }

    @Patch(':id/remediation-form')
    async updateRemediationForm(
        @Param('id') id: string,
        @Body() body: any,
    ): Promise<Document> {
        return this.documentsService.updateDocument({
            where: { id },
            data: { remediationForm: body },
        });
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

    @Get(':id/export')
    async export(@Param('id') id: string, @Res() res: Response) {
        const document = await this.documentsService.document({ id });
        if (!document) {
            return res.status(404).send('Document not found');
        }

        // Check if extractedData exists
        if (!document.extractedData) {
            return res.status(404).send('No extracted data available. Document might not be analyzed yet.');
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${document.title.replace(/\s+/g, '_')}_extracted.json"`);
        res.send(document.extractedData);
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) return [];
        return this.ingestionService.search(query);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.documentsService.updateDocument({
            where: { id },
            data: body
        });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.documentsService.deleteDocument({ id });
    }

}
