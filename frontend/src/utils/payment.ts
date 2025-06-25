// 공동 결제 함수 
import { TransactionReceipt, ethers } from 'ethers';

interface PaymentResponse {
    message: string;
    id?: number;
}

export const sendPaymentToBackend = async (
    receipt: TransactionReceipt,
    amount: string,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
): Promise<PaymentResponse> => {
    try {
        // 프론트에선 ether → wei 변환 후 string으로 전송
        const weiAmount = ethers.parseUnits(amount, 18).toString();

        const payload = {
            txHash: receipt.hash,
            from: receipt.from ?? '',
            to: receipt.to ?? '',
            amount: weiAmount,
            status,
        };

        console.log('📤 결제 정보 전송 중:', payload);

        const BASE_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000';

        const response = await fetch(`${BASE_URL}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        console.log('✅ API URL:', process.env.NEXT_PUBLIC_API_URL);

        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('❌ 백엔드 전송 실패:', error);
        throw error;
    }
};
