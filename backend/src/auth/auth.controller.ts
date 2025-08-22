// src/auth/auth.controller.ts
import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
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
}