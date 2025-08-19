import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class GetOwnedQueryDto {
    @IsNotEmpty()
    @IsEthereumAddress()
    wallet!: string;
}

export class GetOwnedResponseDto {
    wallet!: string;
    items!: import('../types/owned-coupon.type').OwnedCoupon[];
    fetchedAt!: string; // ISO
}