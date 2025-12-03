import { IsBoolean, IsOptional } from 'class-validator';

export class GenerateProjectStructureDto {
    @IsOptional()
    @IsBoolean()
    createPhysicalFolders?: boolean;

    @IsOptional()
    @IsBoolean()
    generateInternkontroll?: boolean;

    @IsOptional()
    @IsBoolean()
    generateChecklists?: boolean;
}
