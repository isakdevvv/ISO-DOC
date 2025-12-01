import { Controller, Get, Post, Param, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsoStandardsService } from './iso-standards.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('iso-standards')
export class IsoStandardsController {
    constructor(private readonly isoStandardsService: IsoStandardsService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/iso-standards',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return `${randomName}${extname(file.originalname)}`;
            },
        }),
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('standardId') standardId: string) {
        return this.isoStandardsService.create(file, standardId);
    }

    @Get()
    async findAll() {
        return this.isoStandardsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.isoStandardsService.findOne(id);
    }
}
