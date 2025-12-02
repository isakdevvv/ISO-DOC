import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PublicApiService } from './public-api.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Controller('api/v1')
@UseGuards(ApiKeyGuard)
export class PublicApiController {
    constructor(private readonly publicApiService: PublicApiService) { }

    @Get('nodes/:id')
    async getNode(@Param('id') id: string) {
        return this.publicApiService.getNode(id);
    }
}
