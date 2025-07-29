// AuthService는 다음을 담당: (로그인, 토큰 관련 로직 구현)
// JWT 토큰 발급 (login) → 로그인 성공 시 JWT 토큰을 생성하여 반환

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';  // JWT 토큰 생성과 검증 기능을 제공하는 NestJS의 서비스
import { UserService } from 'src/user/user.service';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
    // 생성자에서 JwtService를 주입 받음
    constructor(
        private readonly jwtService: JwtService,  // JWT 생성 
        private readonly userService: UserService,
    ) { }

    // ethers.verifyMessage()는 서명자의 지갑 주소를 복원하는 표준 방식
    async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            return recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
            return false;
        }
    }

    // JWT 토큰 생성 
    async login(address: string) {  // 인증된 유저에 대해 JWT 토큰을 발급하는 함수 
        const user = await this.userService.findOrCreate(address); // 유저 관리 
        // JWT 토큰에 담을 데이터(payload)를 정의한다 
        // 일반적으로 sub은 사용자 고유 ID로 사용한다 
        const payload = { sub: address };
        // payload를 서명(sign)하여 토큰을 만들고 access_token 형식으로 반환한다 
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: '1h' }),
        };
    }
}
