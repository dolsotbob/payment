// JWT 토큰 검증 로직 
// PassportStrategy(Strategy)를 상속해서 JWT 토큰을 검증하고, validate(payload)를 정의함
// 여기서 req.user에 들어갈 객체가 만들어짐 
import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";  // passport-jwt 전략을 NestJS 스타일로 래핑(wrap)해주는 헬퍼
import { ExtractJwt, Strategy } from 'passport-jwt';  // JWT를 추출하고 검증하는 데 필요한 Passport JWT 전략 구성 도구
import { ConfigService } from "@nestjs/config";
import type { Request } from 'express';

function fromCookie(req: Request): string | null {
    // 프론트가 쿠키를 쓰지 않는다면 남겨만 두고 실제로는 헤더만 사용해도 됩니다.
    return (req as any)?.cookies?.access_token ?? null;
}

type JwtPayload = { sub?: string };

@Injectable()
// PassportStrategy를 상속해 JwtStrategy를 구현한다 
// Strategy는 passposrt-jwt에서 가져온 JWT 전략을 의미한다 
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(private readonly configService: ConfigService) {
        const secret = configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
        if (!secret) throw new InternalServerErrorException('JWT_SECRET is not configured');
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(), // 요청 헤더에서 토큰 추출
                (req: Request) => fromCookie(req),        // 선택: 쿠키 지원
            ]),
            ignoreExpiration: false,                    // 만료 무시하지 않음
            secretOrKey: secret,                        // 한 번 읽은 값을 전달
            // algorithms: ["HS256"],                   // 필요 시 발급측과 맞춰 지정
            // clockTolerance: 5,                       // 필요 시 허용 편차(초)
        });
    }
    /**
   * 유효한 JWT이면 호출됩니다.
   * 여기서 req.user에 들어갈 형태를 표준화합니다.
   * 컨트롤러의 userAddr()가 기대하는 키들을 모두 채워 줍니다.
   */
    async validate(payload: JwtPayload) {
        // Nest Logger는 printf 포맷 아규먼트를 지원하지 않으므로 문자열로 변환
        this.logger.debug(`[JWT validate] payload=${JSON.stringify(payload)}`);
        // 발급 시점에 sub에 지갑주소를 넣고 있다면 그대로 사용

        const rawAddr: string | undefined =
            payload?.sub ??
            (payload as any)?.address ??
            (payload as any)?.walletAddress ??
            (payload as any)?.userAddress;

        if (!rawAddr) {
            // 토큰에 주소가 전혀 없으면 인증 실패로 처리
            throw new UnauthorizedException("Invalid token payload: missing subject/address");
        }

        const lower = String(rawAddr).toLowerCase();

        // payload를 유지하면서 주소 관련 표준 키를 모두 세팅
        return {
            ...payload,
            sub: lower,
            address: lower,
            walletAddress: lower,
            userAddress: lower,
        };
    }
}