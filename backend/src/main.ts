import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { utilities as nestWinstonUtilities } from 'nest-winston';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: WinstonModule.createLogger({
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.ms(),
                        nestWinstonUtilities.format.nestLike('IsoDocPlatform', {
                            colors: true,
                            prettyPrint: true,
                        }),
                    ),
                }),
            ],
        }),
    });
    app.enableCors();
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const swaggerConfig = new DocumentBuilder()
        .setTitle('TermoTeam API')
        .setDescription('Project, node and ingestion endpoints')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);

    await app.listen(process.env.PORT || 4000);
}

if (process.env.VERCEL) {
    // Vercel Serverless Entry Point
} else {
    bootstrap();
}

let cachedServer: any;

// Export for Vercel
export default async function handler(req: any, res: any) {
    if (!cachedServer) {
        const app = await NestFactory.create(AppModule);
        app.enableCors();
        await app.init();
        cachedServer = app.getHttpAdapter().getInstance();
    }
    return cachedServer(req, res);
}
