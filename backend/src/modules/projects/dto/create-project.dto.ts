import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsString()
    externalId?: string;

    @IsOptional()
    @IsString()
    projectNumber?: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    clientName?: string;

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsOptional()
    @IsString()
    siteName?: string;

    @IsOptional()
    @IsString()
    siteAddress?: string;

    @IsOptional()
    @IsString()
    orderNumber?: string;

    @IsOptional()
    @IsString()
    offerNumber?: string;

    @IsOptional()
    @IsString()
    installerCompany?: string;

    @IsOptional()
    @IsString()
    projectManager?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    medium?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    psValue?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    tsValue?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    volume?: number;

    @IsOptional()
    @IsString()
    commissionedAt?: string;

    @IsOptional()
    @IsString()
    commissioningDate?: string;

    @IsOptional()
    @IsString()
    decommissionedAt?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @IsOptional()
    @IsObject()
    facts?: Record<string, any>;
}
