// 공동 결제 함수 
import { TransactionReceipt, ethers } from 'ethers';

interface PaymentResponse {
    message: string;
    id?: number;
}

export const sendPaymentToBackend = async (
    // receipt: TransactionReceipt,
    // 프론트에서 executeMetaTransaction을 통해 pay()를 실행한 후, tx.hash만 추출해서 이 함수에 넘겨주면 됨 
    txHash: string,  // ✅ Gasless 트랜잭션이므로 TransactionReceipt 대신 hash만 받음
    amount: string,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
    userAddress: string,
    cashbackAmount?: string,
    productId?: number
): Promise<PaymentResponse> => {
    try {
        // 프론트에선 ether → wei 변환 후 string으로 전송
        const weiAmount = ethers.parseUnits(amount, 18).toString();

        const payload = {
            txHash: txHash,
            from: userAddress,
            amount: weiAmount,
            cashbackAmount: cashbackAmount ?? '0',
            status,
            productId,
        };

        console.log('📤 결제 정보 전송 중:', payload);

        const BASE_URL = process.env.REACT_APP_BACKEND_URL;

        const response = await fetch(`${BASE_URL}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('❌ 백엔드 전송 실패:', error);
        throw error;
    }
};
