// src/coupons/dto/use-coupon.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UseCouponDto {
    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    couponId!: number;          // ← tokenId → couponId

    @IsString()
    @IsNotEmpty()
    paymentId!: string;         // ← orderId → paymentId (Payment와 일치)

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
    amount?: number;            // 기본 1

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
    orderUsdTotal?: number;     // 정책 필요 시
}