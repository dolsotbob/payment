// src/coupons/dto/use-coupon.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UseCouponDto {
    @IsNumber()
    @Min(0)
    tokenId!: number;        // ERC1155 tokenId

    @IsString()
    @IsNotEmpty()
    orderId!: string;        // 중복 방지 키 (offchain txHash 구성에도 사용)

    @IsOptional()
    @IsNumber()
    @Min(1)
    amount?: number;         // 기본 1

    @IsOptional()
    @IsNumber()
    orderUsdTotal?: number;  // (정책 필요 시 사용)
}