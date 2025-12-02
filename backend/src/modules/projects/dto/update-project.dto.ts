import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    clientName?: string;

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
    decommissionedAt?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @IsOptional()
    @IsObject()
    facts?: Record<string, any>;

    @IsOptional()
    @IsString()
    status?: string;
}
