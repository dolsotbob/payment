// 로그인 API 제공 

import { Controller, Post, Body, UnauthorizedException, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginHistoryService } from 'src/login-history/login-history.service';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto /login.dto';

@Controller('auth')
export class AuthController {
    // readonly 키워드로 이 서비스는 애부에서만 읽을 수 있도록 보호
    constructor(
        private readonly authService: AuthService,
        private readonly loginHistoryService: LoginHistoryService,
        private readonly userService: UserService,
    ) { }

    @Post('login')
    async login(
        @Body() body: LoginDto,
        @Req() req: Request
    ) {
        console.log('LoginDto:', body);
        const { address, message, signature } = body;

        const isValid = await this.authService.verifySignature(address, message, signature);
        if (!isValid) {
            throw new UnauthorizedException('Invalid wallet signature');
        }

        const ip =
            // x-forwarded-for는 프록시(Render, Nginx 등)를 통과할 때 실제 클라이언트의 IP를 담고 있음
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            // Express의 low-level 네트워크 주소
            (req as any).socket?.remoteAddress ||
            'unknown';  // 모든 방식 실패 시 fallback 

        // 유저 객체 먼저 확보 
        const user = await this.userService.findOrCreate(address);

        // 로그인 기록 저장
        await this.loginHistoryService.createWithUser(
            {
                walletAddress: address,
                ipAddress: ip.toString(),
                userAgent: req.headers['user-agent'] ?? '',
            },
            user // 별도 인자로 전달
        );

        // JWT 토큰 발급 
        return this.authService.login(address);
    }
}
