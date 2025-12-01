import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaTestHelper {
    constructor(private readonly prisma: PrismaService) { }

    async cleanDatabase() {
        console.log('Cleaning database...');
        const tablenames = await this.prisma.$queryRaw<
            Array<{ tablename: string }>
        >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

        const tables = tablenames
            .map(({ tablename }) => tablename)
            .filter((name) => name !== '_prisma_migrations')
            .map((name) => `"public"."${name}"`)
            .join(', ');

        if (tables.length > 0) {
            try {
                await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
                console.log('Database cleaned.');
            } catch (error) {
                console.log({ error });
            }
        } else {
            console.log('No tables to clean.');
        }
    }
}
