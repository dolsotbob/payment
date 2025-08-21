// frontend/src/types/coupons.ts
// define OwnedCoupon and related DTO types aligned with backend (status/rule/meta fields). 
// This ensures type-safe  parsing/rendering of coupon lists on the frontend.

export type OwnedCoupon = {
    id: number;
    balance: number; // ERC1155 balance
    status: 'ACTIVE' | 'EXPIRED' | 'DISABLED' | 'USED_UP';
    rule: {
        discountBps?: number;
        consumable: boolean;   // 오타 확인: consumable이 맞는지 확인 필요
        priceCapUsd?: number;
        expiresAt?: string;   // ISO format string
    };
    meta?: {
        name: string | null;
        imageUrl: string | null;
        ipfsCid: string | null;
    };
};