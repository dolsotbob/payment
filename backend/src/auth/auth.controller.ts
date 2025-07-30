// 로그인 API 제공 

import { Controller, Post, Body, UnauthorizedException, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginHistoryService } from 'src/login-history/login-history.service';

@Controller('auth')
export class AuthController {
    // readonly 키워드로 이 서비스는 애부에서만 읽을 수 있도록 보호
    constructor(
        private readonly authService: AuthService,
        private readonly loginHistoryService: LoginHistoryService,
    ) { }

    @Post('login')
    async login(
        @Body() body: { address: string; message: string; signature: string },
        @Req() req: Request
    ) {
        const { address, message, signature } = body;

        const isValid = await this.authService.verifySignature(address, message, signature);
        if (!isValid) {
            throw new UnauthorizedException('Invalid wallet signature');
        }

        const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (req as any).socket?.remoteAddress ||
            'unknown';

        // 로그인 기록 저장
        await this.loginHistoryService.create({
            walletAddress: address,
            ipAddress: ip,
            userAgent: req.headers['user-agent']?.toString() ?? '',
        })

        // JWT 토큰 발급 
        return this.authService.login(address);
    }
}
