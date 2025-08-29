import {
    Controller,
    Get,
    Post,
    Body,
    UsePipes,
    ValidationPipe,
    UseGuards,
    Req,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CouponsService } from './coupons.service';
import { UseCouponDto } from './dto/use-coupon.dto';
import { Product } from 'src/product/entities/product.entity';

@Controller('coupons')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CouponsController {
    constructor(private readonly coupons: CouponsService) { }

    // ─────────────────────────────────────────────────────────────
    // 유틸: 현재 사용자 주소 추출
    private userAddr(req: Request): string {
        const u = (req as any).user || {};
        const addr =
            u.sub ??
            u.address ??
            u.walletAddress ??
            u.userAddress ??
            null;

        if (!addr) throw new BadRequestException('JWT payload에 address가 없습니다.');
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
        @Query('couponId') couponIdRaw: string,
        @Query('productId') productId?: string,
        @Query('amount') amountRaw?: string,
    ) {
        const address = this.userAddr(req);

        const couponId = Number(couponIdRaw);
        if (!Number.isFinite(couponId) || couponId < 0) {
            throw new BadRequestException('잘못된 couponId');
        }

        // amount는 선택 (없으면 1로 처리 or 서비스에서 자체 계산)
        const amount = amountRaw ? Number(amountRaw) : 1;
        if (amount <= 0 || !Number.isFinite(amount)) {
            throw new BadRequestException('잘못된 amount');
        }

        // 서비스 시그니처를 productId를 받도록 확장하는 것을 권장
        // ex) canUseWithProduct(address, couponId, { productId, amount })
        const result = await this.coupons.canUseWithProduct?.(address, couponId, { productId, amount })
            ?? await this.coupons.canUse(address, couponId, amount);

        // 프론트 계약 형식으로 반환 보장
        // { ok, reason?, discountBps?, priceAfter? }
        return {
            ok: !!result?.ok,
            reason: result?.reason,
            discountBps: result?.discountBps,
            priceAfter: result?.priceAfter, // wei 문자열 기대 시 서비스에서 계산해 전달
        };
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