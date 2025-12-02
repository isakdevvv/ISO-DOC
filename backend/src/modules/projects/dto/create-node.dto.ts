import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { NodeStatus } from '@prisma/client';

class CreateComponentPayloadDto {
    @IsString()
    @IsNotEmpty()
    componentTypeCode: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    tag?: string;

    @IsOptional()
    @IsString()
    serialNumber?: string;

    @IsOptional()
    @IsString()
    manufacturer?: string;

    @IsOptional()
    @IsObject()
    facts?: Record<string, any>;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class CreateNodeDto {
    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsOptional()
    @IsEnum(NodeStatus)
    status?: NodeStatus;

    @IsOptional()
    @IsString()
    templateCode?: string;

    @IsOptional()
    @IsString()
    templateVersion?: string;

    @IsOptional()
    @IsObject()
    data?: Record<string, any>;

    @IsOptional()
    @IsObject()
    facts?: Record<string, any>;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @IsOptional()
    @IsString()
    componentId?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateComponentPayloadDto)
    component?: CreateComponentPayloadDto;
}
