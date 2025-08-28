// backend/src/coupons/dto/buy-coupon.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class BuyCouponDto {
  @IsInt()
  couponId: number;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;     // 구매자 지갑 주소 (소문자 권장)

  @IsOptional()
  @IsString()
  quoteId?: string;          // 결제 견적/주문번호(선택)
}

