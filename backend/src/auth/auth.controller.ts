// 로그인 API 제공 

import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    // readonly 키워드로 이 서비스는 애부에서만 읽을 수 있도록 보호
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(
        @Body()
        body: { address: string; message: string; signature: string }
    ) {
        const { address, message, signature } = body;

        const isValid = await this.authService.verifySignature(
            address,
            message,
            signature
        );

        if (!isValid) {
            throw new UnauthorizedException('Invalid wallet signature');
        }

        return this.authService.login(address);
    }
}
