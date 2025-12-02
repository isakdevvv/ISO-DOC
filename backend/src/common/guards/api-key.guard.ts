import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private apiKeysService: ApiKeysService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // If no API key, we might fall back to other guards, but for now let's assume this guard enforces it
            // Or we can check for a specific header like 'X-API-Key'
            const apiKeyHeader = request.headers['x-api-key'];
            if (!apiKeyHeader) {
                throw new UnauthorizedException('API Key required');
            }

            const apiKey = await this.apiKeysService.validateKey(apiKeyHeader as string);
            if (!apiKey) {
                throw new UnauthorizedException('Invalid API Key');
            }

            request.apiKey = apiKey;
            return true;
        }

        // If Bearer token is present, we assume it's a user token and let other guards handle it
        // But if we want to support Bearer for API keys too:
        const token = authHeader.split(' ')[1];
        if (token.startsWith('sk_iso_')) {
            const apiKey = await this.apiKeysService.validateKey(token);
            if (!apiKey) {
                throw new UnauthorizedException('Invalid API Key');
            }
            request.apiKey = apiKey;
            return true;
        }

        return true;
    }
}
