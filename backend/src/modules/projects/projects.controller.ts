import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Get('flows')
    getFlows() {
        return this.projectsService.getAvailableFlows();
    }

    @Post()
    createProject(@Body() dto: CreateProjectDto) {
        return this.projectsService.createProject(dto);
    }

    @Get()
    getProjects() {
        return this.projectsService.getProjects();
    }

    @Get(':id')
    getProject(@Param('id') id: string) {
        return this.projectsService.getProject(id);
    }

    @Get(':id/tasks')
    getTasks(@Param('id') id: string) {
        return this.projectsService.getTasks(id);
    }

    @Post(':id/tasks')
    createTask(@Param('id') id: string, @Body() dto: CreateProjectTaskDto) {
        return this.projectsService.addTask(id, dto);
    }

    @Patch(':id/tasks/:taskId')
    updateTask(
        @Param('id') id: string,
        @Param('taskId') taskId: string,
        @Body() dto: UpdateProjectTaskDto,
    ) {
        return this.projectsService.updateTask(id, taskId, dto);
    }
}
