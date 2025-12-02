import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsObject } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class CreateTaskDto {
    @IsString()
    @IsOptional()
    tenantId?: string;

    @IsString()
    projectId: string;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    type: string;

    @IsInt()
    @IsOptional()
    priority?: number;

    @IsDateString()
    @IsOptional()
    dueAt?: string;

    @IsString()
    @IsOptional()
    assigneeId?: string;

    @IsString()
    @IsOptional()
    nodeId?: string;

    @IsString()
    @IsOptional()
    maintenanceEventId?: string;

    @IsString()
    @IsOptional()
    taskTemplateId?: string;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
