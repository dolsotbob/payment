// src/auth/auth.service.ts
// AuthService는 다음을 담당: (로그인, 토큰 관련 로직 구현)
// JWT 토큰 발급 (login) → 로그인 성공 시 JWT 토큰을 생성하여 반환

import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginChallenge } from './entities/login-challenge.entity';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { LoginHistoryService } from 'src/login-history/login-history.service';
import { ethers } from 'ethers';
import { LoginRequestDto } from './dto/login.dto';
import { Request } from 'express';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly loginHistoryService: LoginHistoryService,
        @InjectRepository(LoginChallenge)
        private readonly challenges: Repository<LoginChallenge>,
    ) { }

    // ===== Helpers =====
    private makeNonce(len = 16) {
        return randomBytes(len).toString('hex'); // 32 chars
    }

    private extractNonceFromMessage(message: string): string {
        const m = /nonce:([a-z0-9]+)/i.exec(message);
        if (!m) throw new BadRequestException('nonce missing in message');
        return m[1];
    }

    // ===== Challenge Issue (for POST /auth/challenge) =====
    async issueChallenge(address: string, chainId?: number) {
        if (!address) throw new BadRequestException('address required');
        const addr = address.toLowerCase();

        const nonce = this.makeNonce();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분

        // 메시지 포맷: 프론트 서명용 (도메인/앱명은 프로젝트에 맞게)
        const message =
            `Login to MLCC\n` +
            `address:${addr}\n` +
            `chainId:${chainId ?? 0}\n` +
            `time:${new Date().toISOString()}\n` +
            `nonce:${nonce}`;

        await this.challenges.insert({ address: addr, nonce, expiresAt, used: false });

        return {
            message,
            nonce,
            expiresAt: expiresAt.toISOString(),
        };
    }

    // ===== ECDSA signature verify =====
    // ethers.verifyMessage()는 서명자의 지갑 주소를 복원하는 표준 방식
    async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            return recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch {
            return false;
        }
    }

    // ===== JWT 발급 =====
    async login(address: string) {  // 인증된 유저에 대해 JWT 토큰을 발급하는 함수 
        // JWT 토큰에 담을 데이터(payload)를 정의한다 
        // 일반적으로 sub은 사용자 고유 ID로 사용한다 
        const payload = { sub: address.toLowerCase() };
        // payload를 서명(sign)하여 토큰을 만들고 access_token 형식으로 반환한다 
        const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });
        return { access_token };
    }

    // ===== Login with signature (for POST /auth/login) =====
    async loginWithSignature(body: LoginRequestDto, req: Request) {
        const { address, message, signature } = body;
        const addr = address.toLowerCase();

        // 1) message에서 nonce 파싱
        const nonce = this.extractNonceFromMessage(message);

        // 2) 저장된 challenge 조회
        const challenge = await this.challenges.findOne({ where: { address: addr, nonce } });
        if (!challenge) throw new UnauthorizedException('invalid challenge');
        if (challenge.used) throw new UnauthorizedException('challenge already used');
        if (challenge.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('challenge expired');
        }

        // 3) 서명 검증
        const isValid = await this.verifySignature(address, message, signature);
        if (!isValid) {
            throw new UnauthorizedException('Invalid wallet signature');
        }

        // 4) nonce 사용 처리(재사용 방지)
        await this.challenges.update(challenge.id, { used: true });

        // 5) 유저 확보/로그 기록
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

        // 6) JWT 발급 
        return this.login(address);  // { access_token }
    }
}
