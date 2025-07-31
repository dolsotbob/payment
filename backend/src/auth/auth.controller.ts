// 로그인 API 제공 

import { Controller, Post, Body, UnauthorizedException, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    // readonly 키워드로 이 서비스는 애부에서만 읽을 수 있도록 보호
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() body: LoginDto, @Req() req: Request) {
        console.log('📩 로그인 요청 도착:', body);
        // JWT 토큰 발급 
        return this.authService.loginWithSignature(body, req);
    }
}
