// 지갑 소유 쿠폰 조회 
// src/coupons/dto/get-owned.dto.ts
import { OwnedCoupon } from '../types/owned-coupon.type';

export class GetOwnedResponseDto {
    wallet!: string;
    items!: OwnedCoupon[];
    fetchedAt!: string; // ISO string
}