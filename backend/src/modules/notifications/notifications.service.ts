import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async create(data: { title: string; message: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }) {
        return this.prisma.notification.create({
            data,
        });
    }

    async findAll(): Promise<Notification[]> {
        return this.prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to last 50
        });
    }

    async markAsRead(id: string): Promise<Notification> {
        return this.prisma.notification.update({
            where: { id },
            data: { read: true },
        });
    }

    async markAllAsRead(): Promise<void> {
        await this.prisma.notification.updateMany({
            where: { read: false },
            data: { read: true },
        });
    }
}
