export class CreateMaintenanceEventDto {
    projectId: string;
    source?: string;
    eventType?: string;
    payload?: any;
    performedAt?: string;
    performedBy?: string;
}
