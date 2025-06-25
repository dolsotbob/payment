// 공동 결제 함수 
import { TransactionReceipt, ethers } from 'ethers';

export const sendPaymentToBackend = async (
    receipt: TransactionReceipt,
    amount: string,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
) => {
    try {
        // 프론트에선 ether → wei 변환 후 string으로 전송
        const weiAmount = ethers.parseUnits(amount, 18).toString();

        const response = await fetch('http://localhost:3000/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                txHash: receipt.hash,
                from: receipt.from,
                to: receipt.to,
                amount: weiAmount,
                status,
                // timestamp: Date.now(),  // 삭제 - timestamp는 서버에서 처리하는게 일반적 
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