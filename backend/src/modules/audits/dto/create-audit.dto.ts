import {
    AuditActionStatus,
    AuditChecklistStatus,
    AuditFindingSeverity,
    AuditStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';

export class AuditChecklistItemDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title!: string;

    @IsOptional()
    @IsString()
    clause?: string;

    @IsOptional()
    @IsString()
    owner?: string;

    @IsOptional()
    @IsEnum(AuditChecklistStatus)
    status?: AuditChecklistStatus;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    orderIndex?: number;
}

export class AuditFindingDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsEnum(AuditFindingSeverity)
    severity?: AuditFindingSeverity;

    @IsOptional()
    @IsString()
    owner?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsEnum(AuditStatus)
    status?: AuditStatus;

    @IsOptional()
    @IsString()
    description?: string;
}

export class AuditActionDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    owner?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsEnum(AuditActionStatus)
    status?: AuditActionStatus;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateAuditDto {
    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsString()
    projectId?: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    standard!: string;

    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsOptional()
    @IsString()
    scope?: string;

    @IsOptional()
    @IsString()
    owner?: string;

    @IsOptional()
    @IsEnum(AuditStatus)
    status?: AuditStatus;

    @IsDateString()
    startDate!: string;

    @IsDateString()
    endDate!: string;

    @IsOptional()
    metadata?: Record<string, unknown>;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AuditChecklistItemDto)
    checklist?: AuditChecklistItemDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AuditFindingDto)
    findings?: AuditFindingDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AuditActionDto)
    actions?: AuditActionDto[];
}
