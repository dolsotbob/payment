// utils/payment.ts
// 결제 결과를 백엔드에 기록하는 공통 함수
import api from "../api/axios";
import { ethers } from 'ethers';

interface PaymentResponse {
    message: string;
    id?: string;   // 백앤드가 생성한 payment id 
}

// 선택적으로 enum-like 객체를 선언해 안전성 향상
export const PaymentStatus = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

type SendPaymentArgs = {
    txHash: string;

    // 금액 필드는 모두 wei 문자열(정수)이어야 함 — 백엔드 DTO와 동일한 키 사용
    originalPrice: string;

    // ===== 할인 관련 입력(현재는 무시) =====
    // [쿠폰 할인 재활성화 시 이 주석 제거]: 아래 두 필드를 다시 사용
    discountAmount: string;
    discountedPrice: string;

    status?: PaymentStatus;
    userAddress: string; // from 으로 매핑
    cashbackAmountWei?: string;
    cashbackAmount?: string;

    productId: string; // UUID
    gasUsed?: bigint;
    gasPrice?: bigint;
};

export async function sendPaymentToBackend({
    // 프론트에서 executeMetaTransaction을 통해 pay()를 실행한 후, tx.hash만 추출해서 이 함수에 넘겨주면 됨 
    txHash,
    originalPrice,
    // coupon 관련 입력값은 무시

    // ===== 현재는 무시합니다 =====
    // [쿠폰 할인 재활성화 시 이 주석 제거]: 아래 파라미터를 다시 활용
    discountAmount: _inDiscountAmount,
    discountedPrice: _inDiscountedPrice,

    status = PaymentStatus.SUCCESS,
    userAddress,
    cashbackAmountWei,
    cashbackAmount,
    productId,
    gasUsed,
    gasPrice,
}: SendPaymentArgs): Promise<PaymentResponse> {
    if (!productId) throw new Error("productId는 필수입니다.");
    if (!/^[0-9]+$/.test(originalPrice)) throw new Error("originalPrice는 wei 정수 문자열이어야 합니다.");

    // 할인 무시: 항상 0/원가로 강제
    // [쿠폰 할인 재활성화 시 이 라인 삭제] 후 아래 두 줄에서 _inDiscountAmount/_inDiscountedPrice를 사용하세요.
    const discountAmount = '0';            // [쿠폰 할인 재활성화 시 이 라인 삭제]
    const discountedPrice = originalPrice; // [쿠폰 할인 재활성화 시 이 라인 삭제]

    // (검증도 고정값 기준으로)
    if (!/^[0-9]+$/.test(discountAmount)) throw new Error("discountAmount는 wei 정수 문자열이어야 합니다.");
    if (!/^[0-9]+$/.test(discountedPrice)) throw new Error("discountedPrice는 wei 정수 문자열이어야 합니다.");

    // 캐시백(선택)
    const cashback =
        (cashbackAmountWei ?? cashbackAmount) && /^[0-9]+$/.test(cashbackAmountWei ?? cashbackAmount!)
            ? cashbackAmountWei ?? cashbackAmount!
            : undefined;

    const gasUsedStr = gasUsed?.toString();
    const gasCostStr = gasUsed && gasPrice ? (gasUsed * gasPrice).toString() : undefined;

    const payload: Record<string, unknown> = {
        txHash,
        from: userAddress,
        productId,
        originalPrice,
        discountAmount,   // ✅ 항상 '0'
        discountedPrice,  // ✅ 항상 originalPrice
        status,
        ...(cashback ? { cashbackAmount: cashback } : {}),
        ...(gasUsedStr ? { gasUsed: gasUsedStr } : {}),
        ...(gasCostStr ? { gasCost: gasCostStr } : {}),
    };

    console.log("[payment-payload]", payload);

    const { data } = await api.post<PaymentResponse>("/payment", payload, { timeout: 20_000 });
    return data;
}