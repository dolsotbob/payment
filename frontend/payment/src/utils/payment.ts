// 공동 결제 함수 
import { TransactionReceipt } from 'ethers';

export const sendPaymentToBackend = async (
    receipt: TransactionReceipt,
    amount: string,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
) => {
    try {
        const response = await fetch('http://localhost:3000/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                txHash: receipt.hash,
                from: receipt.from,
                to: receipt.to,
                amount,
                status,
                timestamp: Date.now(),
            }),
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