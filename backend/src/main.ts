import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
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
