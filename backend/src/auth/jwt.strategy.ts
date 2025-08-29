// JWT 토큰 검증 로직 
// PassportStrategy(Strategy)를 상속해서 JWT 토큰을 검증하고, validate(payload)를 정의함
// 여기서 req.user에 들어갈 객체가 만들어짐 
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";  // passport-jwt 전략을 NestJS 스타일로 래핑(wrap)해주는 헬퍼
import { ExtractJwt, Strategy } from 'passport-jwt';  // JWT를 추출하고 검증하는 데 필요한 Passport JWT 전략 구성 도구
import { ConfigService } from "@nestjs/config";
import type { Request } from 'express';

function fromCookie(req: Request): string | null {
    // 프론트가 쿠키를 쓰지 않는다면 남겨만 두고 실제로는 헤더만 사용해도 됩니다.
    return (req as any)?.cookies?.access_token ?? null;
}

@Injectable()
// PassportStrategy를 상속해 JwtStrategy를 구현한다 
// Strategy는 passposrt-jwt에서 가져온 JWT 전략을 의미한다 
export class JwtStrategy extends PassportStrategy(Strategy) {
    logger: any;
    constructor(private readonly configService: ConfigService) {
        const secret = configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
        if (!secret) {
            // 시크릿이 없으면 애플리케이션이 부팅되면 안 됩니다.
            throw new InternalServerErrorException('JWT_SECRET is not configured');
        }
        // 부모 클래스(PassportStrategy)에 옵션을 넘겨 JWT 전략을 설정한다 
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(), // 요청 헤더에서 토큰 추출
                (req: Request) => fromCookie(req), // 선택: 쿠키 지원 
            ]),
            ignoreExpiration: false,  // 토큰 만료 시간을 무시하지 않겠다는 의미 
            secretOrKey: configService.get<string>('JWT_SECRET'), // ConfigService로 불러오기 
            // algorithms: ['HS256'],   // 발급측과 맞추기
            // clockTolerance: 5,       // 선택
        });
    }

    /**
   * 유효한 JWT이면 호출됩니다.
   * 여기서 req.user에 들어갈 형태를 표준화합니다.
   * 컨트롤러의 userAddr()가 기대하는 키들을 모두 채워 줍니다.
   */
    async validate(payload: any) {
        this.logger.debug('[JWT validate] payload=%o', payload);
        // 발급 시점에 sub에 지갑주소를 넣고 있다면 그대로 사용
        const rawAddr: string | undefined =
            payload?.sub ??
            payload?.address ??
            payload?.walletAddress ??
            payload?.userAddress;

        // 주소가 없다면 그래도 payload는 넘겨두되, 컨트롤러에서 BadRequest로 처리
        const lower = rawAddr ? String(rawAddr).toLowerCase() : undefined;

        return {
            ...payload,
            // 표준화된 필드 세트 제공 (컨트롤러 userAddr에서 어떤 키를 쓰든 동작)
            sub: lower ?? payload?.sub,
            address: lower,
            walletAddress: lower,
            userAddress: lower,
        };
    }
}