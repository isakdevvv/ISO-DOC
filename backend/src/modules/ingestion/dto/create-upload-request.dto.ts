import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateUploadRequestDto {
    @IsOptional()
    @IsUUID()
    tenantId?: string;

    @IsOptional()
    @IsUUID()
    projectId?: string;

    @IsOptional()
    @IsUUID()
    nodeId?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsString()
    @IsNotEmpty()
    mimeType: string;

    @IsNumber()
    @Min(1)
    size: number;

    @IsString()
    @IsNotEmpty()
    checksum: string;
}
