// 로그인 API 제공 

import { Controller, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
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
        @Body()
        body: { address: string; message: string; signature: string },
        @Req() req: Request
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

        // 로그인 기록 저장
        await this.loginHistoryService.create({
            walletAddress: address,
            ipAddress: req.referrerPolicy,
            userAgent: req.headers['user-agent']?.toString() ?? '',
        })

        // JWT 토큰 발급 
        return this.authService.login(address);
    }
}
