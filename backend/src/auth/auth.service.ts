// AuthService는 다음을 담당: (로그인, 토큰 관련 로직 구현)
// JWT 토큰 발급 (login) → 로그인 성공 시 JWT 토큰을 생성하여 반환

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';  // JWT 토큰 생성과 검증 기능을 제공하는 NestJS의 서비스
import { UserService } from 'src/user/user.service';
import { LoginHistoryService } from 'src/login-history/login-history.service';
import { ethers } from 'ethers';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';

@Injectable()
export class AuthService {
    // 생성자에서 JwtService를 주입 받음
    constructor(
        private readonly jwtService: JwtService,  // JWT 생성 
        private readonly userService: UserService,
        private readonly loginHistoryService: LoginHistoryService,
    ) { }

    // ethers.verifyMessage()는 서명자의 지갑 주소를 복원하는 표준 방식
    async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            console.log('Recovered address:', recoveredAddress);
            console.log('Input address:', address);
            return recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
            return false;
        }
    }

    // JWT 토큰 생성 
    async login(address: string) {  // 인증된 유저에 대해 JWT 토큰을 발급하는 함수 
        // JWT 토큰에 담을 데이터(payload)를 정의한다 
        // 일반적으로 sub은 사용자 고유 ID로 사용한다 
        const payload = { sub: address };
        // payload를 서명(sign)하여 토큰을 만들고 access_token 형식으로 반환한다 
        const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });
        return { access_token };
    }

    async loginWithSignature(body: LoginDto, req: Request) {
        console.log('✅ loginWithSignature 실행됨');
        const { address, message, signature } = body;

        const isValid = await this.verifySignature(address, message, signature);
        if (!isValid) {
            console.warn('❌ Invalid signature', { address, message, signature });
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
        this.loginHistoryService.createWithUser(
            {
                ipAddress: ip,
                userAgent: req.headers['user-agent'] ?? '',
            },
            user
        );

        return this.login(address);
    }
}
