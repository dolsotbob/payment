import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";  // passport-jwt 전략을 NestJS 스타일로 래핑(wrap)해주는 헬퍼
import { ExtractJwt, Strategy } from 'passport-jwt';  // JWT를 추출하고 검증하는 데 필요한 Passport JWT 전략 구성 도구

@Injectable()
// PassportStrategy를 상속해 JwtStrategy를 구현한다 
// Strategy는 passposrt-jwt에서 가져온 JWT 전략을 의미한다 
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        // 부모 클래스(PassportStrategy)에 옵션을 넘겨 JWT 전략을 설정한다 
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 요청 헤더에서 토큰 추출
            ignoreExpiration: false,  // 토큰 만료 시간을 무시하지 않겠다는 의미 
            secretOrKey: process.env.JWT_SECRET, // .env에 설정한 시크릿 키 사용
        });
    }

    // JWT가 유효할 경우 이 함수가 자동으로 호출됨 
    async validate(payload: any) {
        // 토큰에서 payload 추출됨
        // 예: { username: 'testuser', sub: 1 }
        return { userId: payload.sub, username: payload.username };
    }
}