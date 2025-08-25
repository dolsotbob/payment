// src/auth/auth.controller.ts
import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { LoginRequestDto } from './dto/login.dto';
import { ChallengeRequestDto } from './dto/challenge.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('challenge')
    challenge(@Body() dto: ChallengeRequestDto) {
        // 프로퍼티 이름 통일: this.authService
        return this.authService.issueChallenge(dto.address, dto.chainId);
    }

    @Post('login')
    login(@Body() dto: LoginRequestDto, @Req() req: Request) {
        // 단일 핸들러만 유지
        return this.authService.loginWithSignature(dto, req);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    me(@Req() req: Request) {
        // 토큰 payload = { sub: address, iat, exp }
        const payload: any = (req as any).user;
        const address = payload?.sub;
        return {
            id: address,          // 간단히 address를 id로 사용 (필요 시 DB 조회로 확장)
            address,
            iat: payload?.iat,
            exp: payload?.exp,
        };
    }
}