export type OwnedCoupon = {
    id: number;
    balance: number; // ERC1155 balance
    status: 'ACTIVE' | 'EXPIRED' | 'DISABLED' | 'USED_UP';
    rule: {
        discountBps?: number;
        priceCapUsd?: number;
        consumable?: boolean;
        expiresAt?: string; // ISO
    };
    metadata?: { name?: string; image?: string; description?: string };
};