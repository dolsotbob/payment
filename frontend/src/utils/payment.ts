// 공동 결제 함수 
import { ethers } from 'ethers';

interface PaymentResponse {
    message: string;
    id?: number;
}

// 선택적으로 enum-like 객체를 선언해 안전성 향상
export const PaymentStatus = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
} as const;
type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const sendPaymentToBackend = async (
    // receipt: TransactionReceipt,
    // 프론트에서 executeMetaTransaction을 통해 pay()를 실행한 후, tx.hash만 추출해서 이 함수에 넘겨주면 됨 
    txHash: string,  // ✅ Gasless 트랜잭션이므로 TransactionReceipt 대신 hash만 받음
    amount: string,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
    userAddress: string,
    cashbackAmount?: string,
    productId?: number,
    gasUsed?: bigint,
    gasPrice?: bigint,
): Promise<PaymentResponse> => {
    try {
        if (!productId) {
            throw new Error('productId는 필수입니다.');
        }

        // 프론트에선 ether → wei 변환 후 string으로 전송
        const weiAmount = ethers.parseUnits(amount).toString();
        const cashbackAmountInWei = cashbackAmount
            ? ethers.parseUnits(cashbackAmount).toString()
            : '0';

        // gasUsed와 gasCost는 optional
        const gasUsedStr = gasUsed?.toString();
        const gasCostStr = gasUsed && gasPrice ? gasUsed * gasPrice : undefined;

        const payload = {
            txHash: txHash,
            from: userAddress,
            amount: weiAmount,
            cashbackAmount: cashbackAmountInWei,
            status,
            productId,
            ...(gasUsedStr && { gasUsed: gasUsedStr }),
            ...(gasCostStr && { gasCost: gasCostStr.toString() }),
        };

        console.log('📤 결제 요청 데이터:', payload);

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
