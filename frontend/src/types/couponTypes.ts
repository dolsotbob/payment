// frontend/src/types/coupons.ts

// 쿠폰 상태 (백엔드 enum과 일치)
export type CouponStatus = 'ACTIVE' | 'EXPIRED' | 'DISABLED' | 'USED_UP';

// 쿠폰 규칙 (백엔드 네이밍에 맞춰 isConsumable 사용)
export type CouponRule = {
    discountBps?: number;   // 할인율 bps(=1/100%)
    isConsumable: boolean;  // 단일/소모성 여부 (기존 consumable → isConsumable로 정규화)
    priceCapUsd?: number;   // 할인 상한(USD)
    expiresAt?: string;     // ISO datetime string
};

// 쿠폰 메타데이터
export type CouponMeta = {
    name: string | null;
    imageUrl: string | null;
    ipfsCid: string | null;
};

// 프론트에서 다루는 보유 쿠폰 단건
export type OwnedCoupon = {
    id: number;             // tokenId
    balance: number;        // ERC1155 balance (정수)
    status: CouponStatus;
    rule: CouponRule;
    meta?: CouponMeta;
};

// /coupons/owned 응답 DTO (백엔드 GetOwnedResponseDto와 일치)
export type GetOwnedResponse = {
    wallet: string;         // 소유자 지갑
    items: OwnedCoupon[];   // 보유 쿠폰 목록
    fetchedAt: string;      // ISO datetime string
};

// 쿠폰 사용 요청(백엔드 UseCouponDto와 일치)
export type UseCouponRequest = {
    couponId: number;       // tokenId → couponId
    paymentId: string;      // orderId → paymentId
    amount?: number;        // 기본 1
    orderUsdTotal?: number; // 정책 필요 시
};