import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceEventDto } from './dto/create-maintenance-event.dto';

@Controller('maintenance')
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    @Post('events')
    createEvent(@Body() dto: CreateMaintenanceEventDto) {
        return this.maintenanceService.createEvent(dto);
    }

    @Get('events/:projectId')
    findAll(@Param('projectId') projectId: string) {
        return this.maintenanceService.findAll(projectId);
    }
}
