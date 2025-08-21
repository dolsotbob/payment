export type OwnedCoupon = {
    id: number;
    balance: number; // ERC1155 balance
    status: 'ACTIVE' | 'EXPIRED' | 'DISABLED' | 'USED_UP';
    rule: {
        discountBps?: number;
        cosumable: boolean;
        priceCapUsd?: number;
        expiresAt?: string; // ISO
    };
    meta?: {
        name: string | null;
        imageUrl: string | null;
        ipfsCid: string | null;
    };
};