import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { KiuvaWorkflowService, KiuvaRole } from './kiuva-workflow.service';

export class SignatureDto {
    userId: string;
    notes?: string;
}

@Controller('kiuva')
export class KiuvaController {
    constructor(private readonly kiuvaService: KiuvaWorkflowService) { }

    @Post(':nodeId/sign/utforelse')
    async signUtforelse(@Param('nodeId') nodeId: string, @Body() dto: SignatureDto) {
        return this.kiuvaService.approveUtforelse(nodeId, dto.userId, dto.notes);
    }

    @Post(':nodeId/sign/verifikasjon')
    async signVerifikasjon(@Param('nodeId') nodeId: string, @Body() dto: SignatureDto) {
        return this.kiuvaService.approveVerifikasjon(nodeId, dto.userId, dto.notes);
    }

    @Post(':nodeId/sign/godkjenning')
    async signGodkjenning(@Param('nodeId') nodeId: string, @Body() dto: SignatureDto) {
        return this.kiuvaService.approveGodkjenning(nodeId, dto.userId, dto.notes);
    }

    @Get(':nodeId/status')
    async getKiuvaStatus(@Param('nodeId') nodeId: string) {
        return this.kiuvaService.getSignatureStatus(nodeId);
    }

    @Post(':nodeId/reset')
    async resetSignatures(@Param('nodeId') nodeId: string) {
        return this.kiuvaService.resetKiuvaSignatures(nodeId);
    }
}
