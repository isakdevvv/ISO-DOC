import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (configService: ConfigService) => {
                const host = configService.get<string>('REDIS_HOST');
                const port = configService.get<number>('REDIS_PORT');
                const password = configService.get<string>('REDIS_PASSWORD');

                if (!host) {
                    return null; // Redis not configured
                }

                return new Redis({
                    host,
                    port,
                    password,
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class RedisModule { }
