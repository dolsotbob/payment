export interface Product {
    id: number;
    name: string;
    price: string;  // 예: "0.01 ETH" 
    imageUrl: string;
}

export interface ShippingInfo {
    id: number;
    userAddress: string;
    recipientName: string;
    phoneNumber: string;
    address: string;
}
