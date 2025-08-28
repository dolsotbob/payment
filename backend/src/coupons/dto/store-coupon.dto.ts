export class StoreCouponDto {
    id: number;             // 상품(쿠폰) ID
    name: string;           // 표시 이름
    priceUsd?: number;      // 표시용 가격(선택)
    discountBps: number;    // 500 = 5%
    expiresAt?: string;     // ISO string
    imageUrl?: string;      // 썸네일(선택)
}


