import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() body: any) {
        console.log("Login attempt for:", body.username);
        const user = await this.authService.validateUser(body.username, body.password);
        if (!user) {
            console.log("Invalid credentials for:", body.username);
            throw new UnauthorizedException();
        }
        return this.authService.login(user);
    }
}
