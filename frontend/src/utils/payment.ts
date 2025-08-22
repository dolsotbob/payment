// utils/payment.ts
// 공동 결제 함수 
import { http } from "../api/http";  // axios 인스턴스 (Authorization/401 인터셉터 포함)
import { ethers } from 'ethers';

interface PaymentResponse {
    message: string;
    id?: number;   // 백앤드가 생성한 payment id 
}

// 선택적으로 enum-like 객체를 선언해 안전성 향상
export const PaymentStatus = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

type SendPaymentArgs = {
    txHash: string;
    // 아래 둘 중 하나만 사용:
    amountWei?: string;          // 권장: 호출부에서 이미 decimals 반영해 전달
    amount?: string;             // 문자열 토큰 수량 (decimals 전달 시에만 사용)
    tokenDecimals?: number;      // amount 사용 시 필수

    status?: PaymentStatus;      // 기본 SUCCESS
    userAddress: string;
    cashbackAmountWei?: string;  // 권장: 이미 wei로 변환해 전달
    cashbackAmount?: string;     // 문자열 토큰 수량 (decimals 전달 시에만 사용)
    productId: number;
    gasUsed?: bigint;
    gasPrice?: bigint;
};

export async function sendPaymentToBackend({
    // receipt: TransactionReceipt,
    // 프론트에서 executeMetaTransaction을 통해 pay()를 실행한 후, tx.hash만 추출해서 이 함수에 넘겨주면 됨 
    txHash,
    amountWei,
    amount,
    tokenDecimals,
    status = PaymentStatus.SUCCESS,
    userAddress,
    cashbackAmountWei,
    cashbackAmount,
    productId,
    gasUsed,
    gasPrice,
}: SendPaymentArgs): Promise<PaymentResponse> {
    if (!productId) {
        throw new Error("productId는 필수입니다.");
    }

    // BACKEND URL 방어
    const BASE_URL = process.env.REACT_APP_BACKEND_URL;
    if (!BASE_URL) {
        throw new Error("REACT_APP_BACKEND_URL이 설정되어 있지 않습니다.");
    }

    // 프론트에선 ether → wei 변환 후 string으로 전송
    const amtWei =
        amountWei ??
        (() => {
            if (amount == null) throw new Error("amountWei 또는 (amount + tokenDecimals) 중 하나가 필요합니다.");
            if (tokenDecimals == null) throw new Error("tokenDecimals가 필요합니다.");
            return ethers.parseUnits(amount, tokenDecimals).toString();
        })();

    const cashbackWei =
        cashbackAmountWei ??
        (cashbackAmount ? ethers.parseUnits(cashbackAmount, tokenDecimals ?? 18).toString() : "0");

    // gasUsed와 gasCost는 optional
    const gasUsedStr = gasUsed?.toString();
    const gasCostStr = gasUsed && gasPrice ? gasUsed * gasPrice : undefined;

    const payload = {
        txHash: txHash,
        from: userAddress,
        amount: amtWei,
        cashbackAmount: cashbackWei,
        status,
        productId,
        ...(gasUsedStr && { gasUsed: gasUsedStr }),
        ...(gasCostStr && { gasCost: gasCostStr.toString() }),
    };

    // axios 인스턴스 사용: Authorization/timeout/에러 처리 일원화
    const { data } = await http.post<PaymentResponse>("/payment", payload, {
        timeout: 20_000,
    });

    return data;
}