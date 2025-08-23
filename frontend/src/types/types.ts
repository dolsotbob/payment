export interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    hoverImageUrl?: string;
}

export interface ShippingInfo {
    id: number;
    userAddress: string;
    recipientName: string;
    phoneNumber: string;
    address: string;
}
