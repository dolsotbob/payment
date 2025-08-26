// JWT 토큰 검증 로직 
// PassportStrategy(Strategy)를 상속해서 JWT 토큰을 검증하고, validate(payload)를 정의함
// 여기서 req.user에 들어갈 객체가 만들어짐 
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";  // passport-jwt 전략을 NestJS 스타일로 래핑(wrap)해주는 헬퍼
import { ExtractJwt, Strategy } from 'passport-jwt';  // JWT를 추출하고 검증하는 데 필요한 Passport JWT 전략 구성 도구
import { ConfigService } from "@nestjs/config";

@Injectable()
// PassportStrategy를 상속해 JwtStrategy를 구현한다 
// Strategy는 passposrt-jwt에서 가져온 JWT 전략을 의미한다 
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        // 부모 클래스(PassportStrategy)에 옵션을 넘겨 JWT 전략을 설정한다 
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 요청 헤더에서 토큰 추출
            ignoreExpiration: false,  // 토큰 만료 시간을 무시하지 않겠다는 의미 
            secretOrKey: configService.get<string>('JWT_SECRET'), // ConfigService로 불러오기 
        });
    }

    // JWT가 유효할 경우 이 함수가 자동으로 호출됨 
    async validate(payload: any) {
        return payload; // req.user = { sub: '0x...' , iat, exp }
    }
}