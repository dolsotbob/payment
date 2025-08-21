import {
    Controller,
    Get,
    Post,
    Body,
    UsePipes,
    ValidationPipe,
    UseGuards,
    Req,
    UnauthorizedException,
    Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { CouponsService } from './coupons.service';
import { UseCouponDto } from './dto/use-coupon.dto';

@Controller('coupons')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CouponsController {
    constructor(private readonly coupons: CouponsService) { }

    // ─────────────────────────────────────────────────────────────
    // 유틸: 현재 사용자 주소 추출
    private userAddr(req: Request): string {
        const addr = (req.user as any)?.sub;
        if (!addr) throw new UnauthorizedException('JWT payload에 address가 없습니다.');
        return addr.toLowerCase();
    }

    // JWT 인증 필요, 주소는 토큰의 payload에서 획득 
    @UseGuards(AuthGuard('jwt'))
    @Get('owned')
    // @ApiOkResponse({ type: GetOwnedResponseDto })
    getOwned(@Req() req: Request) {
        return this.coupons.getOwned(this.userAddr(req));
    }

    // 쿠폰 사용 가능 여부만 사전 검증 (프론트에서 사전 체크용)
    @UseGuards(AuthGuard('jwt'))
    @Get('validate')
    async validate(
        @Req() req: Request,
        @Query('tokenId') tokenIdRaw: string,
        @Query('amount') amountRaw?: string,
    ) {
        const address = this.userAddr(req);
        const tokenId = Number(tokenIdRaw);
        const amount = amountRaw ? Number(amountRaw) : 1;
        if (!Number.isFinite(tokenId) || tokenId < 0) {
            throw new UnauthorizedException('잘못된 tokenId');
        }
        const result = await this.coupons.canUse(address, tokenId, amount);
        return result; // { ok: boolean, reason?: string }
    }

    // 쿠폰 적용도 JWT 인증, body의 address는 무시하고 토큰의 address 사용 (오프체인 기록만 저장)
    @UseGuards(AuthGuard('jwt'))
    @Post('apply')
    apply(@Body() dto: UseCouponDto, @Req() req: Request) {
        return this.coupons.apply(dto, { address: this.userAddr(req) });
    }

    // (선택) 내 쿠폰 사용 이력
    // 프론트에서 주문 상세/마이페이지에 쓰기 좋음
    @UseGuards(AuthGuard('jwt'))
    @Get('uses')
    async listUses(@Req() req: Request) {
        const address = this.userAddr(req);
        // 서비스에 listUses(address) 만들어서 최근 50건 같은 식으로 반환하도록 하세요.
        // return this.coupons.listUses(address);
        return []; // 서비스 구현 전 임시
    }

}