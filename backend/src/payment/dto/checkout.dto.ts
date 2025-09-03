import { IsEthereumAddress, IsString, IsNumberString } from 'class-validator';

export class CheckoutRequestDto {
    @IsString()
    quoteId!: string;

    @IsEthereumAddress()
    wallet!: string;

    @IsString()
    txHash!: string;

    @IsString()
    productId!: string;

    @IsNumberString()
    expectedPaidWei!: string;  // BigInt라 문자열로 받는게 안전 
}

export class CheckoutResponseDto {
    paymentId!: string;
    status!: 'SUCCESS' | 'PENDING' | 'FAILED';
    txHash?: string;
}

