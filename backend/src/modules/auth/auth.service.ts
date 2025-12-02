import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '@/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private prisma: PrismaService,
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        // In a real app, you'd check the database.
        // For MVP, we'll use a hardcoded admin user.
        if (username === 'admin' && pass === 'admin123') {
            const tenant = await this.prisma.tenant.findFirst({ where: { slug: process.env.DEFAULT_TENANT_SLUG || 'termoteam' } });
            return { userId: 1, username: 'admin', tenantId: tenant?.id };
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.userId, tenantId: user.tenantId };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
