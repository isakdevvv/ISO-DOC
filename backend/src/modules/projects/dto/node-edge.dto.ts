import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class ManageNodeEdgeDto {
    @IsString()
    @IsNotEmpty()
    fromNodeId: string;

    @IsString()
    @IsNotEmpty()
    toNodeId: string;

    @IsString()
    @IsNotEmpty()
    edgeType: string;
}

export class CreateNodeEdgeDto extends ManageNodeEdgeDto {
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class DeleteNodeEdgeDto extends ManageNodeEdgeDto {}
