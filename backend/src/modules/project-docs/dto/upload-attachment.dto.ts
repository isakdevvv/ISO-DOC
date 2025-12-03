import { AttachmentCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadAttachmentDto {
    @IsEnum(AttachmentCategory)
    category: AttachmentCategory;

    @IsOptional()
    @IsString()
    description?: string;
}
