// AuthService는 다음을 담당: 
// 	1.	유저 검증 (validateUser)→ 주어진 username과 password가 유효한지 확인
// 	2.	JWT 토큰 발급 (login) → 로그인 성공 시 JWT 토큰을 생성하여 반환

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';  // JWT 토큰 생성과 검증 기능을 제공하는 NestJS의 서비스
import { UserService } from 'src/user/user.service';  //  유저 정보 조회를 위한 서비스 

@Injectable()
export class AuthService {
    // 생성자에서 UserService와 JwtService를 주입 받음
    constructor(
        private readonly userService: UserService,  // 유저 조회 
        private readonly jwtService: JwtService,  // JWT 생성 
    ) { }

    // 로그인 정보 검증 
    // 로그인 시 입력된 username과 password를 확인하는 함수  
    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.userService.findOne(username);
        if (user && user.password === password) { // 유저가 존재하고 비번이 일치할 때만 인증 성공 
            const { password, ...result } = user;
            return result; // 비밀번호 제외하고 반환
        }
        return null;  // 인증 실패시 null 반환 
    }

    // JWT 토큰 생성 
    async login(user: any) {  // 인증된 유저에 대해 JWT 토큰을 발급하는 함수 
        // JWT 토큰에 담을 데이터(payload)를 정의한다 
        // 일반적으로 sub은 사용자 고유 ID로 사용한다 
        const payload = { username: user.username, sub: user.userId };
        // payload를 서명(sign)하여 토큰을 만들고 access_token 형식으로 반환한다 
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
