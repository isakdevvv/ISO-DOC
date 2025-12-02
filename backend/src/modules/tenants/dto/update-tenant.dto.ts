import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateTenantDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    contactEmail?: string;

    @IsOptional()
    @IsObject()
    agentSettings?: any;
}
