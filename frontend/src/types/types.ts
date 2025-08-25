export interface Product {
    id: string;
    sku: string;               // DB에 있는 필드 → 추가해 두는 게 좋아요
    name: string;
    priceWei: string;          // ✅ 서버 응답에 맞춤 (wei, string)
    imageUrl: string;
    hoverImageUrl?: string;
    isActive: boolean;         // 서버 응답에 있는 필드
    createdAt: string;         // 날짜도 들어오니 타입 맞추기
}

export interface ShippingInfo {
    id: number;
    userAddress: string;
    recipientName: string;
    phoneNumber: string;
    address: string;
}
