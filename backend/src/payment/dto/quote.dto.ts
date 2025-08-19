import { IsEthereumAddress, IsInt, IsOptional, IsString } from 'class-validator';

export class QuoteRequestDto {
    @IsEthereumAddress() wallet!: string;
    @IsString() productId!: string;
    @IsOptional() @IsInt() selectedCouponId?: number;
}

export class QuoteResponseDto {
    quoteId!: string;
    productId!: string;
    wallet!: string;

    originalPrice!: string;     // wei
    discountAmount!: string;    // wei
    discountedPrice!: string;   // wei
    cashbackAmount!: string;    // wei

    appliedCouponId?: number;
    appliedRule?: any;

    expiresAt!: string;         // ISO
    signature?: string;
    reasonIfInvalid?: string;
}