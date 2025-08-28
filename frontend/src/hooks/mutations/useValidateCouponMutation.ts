// src/hooks/mutations/useValidateCouponMutation.ts
// 결제 전에 선택한 쿠폰이 현재 사용 가능한지 사전 점금 
// 서버 정책(만료, 잔여 수량, 금액 한도 등)에 따라 ok / reason / discountBps 등을 받아 UI/결제 흐름을 결정함
// 실패/로딩 상태를 React Query가 관리하므로 컴포넌트는 호출만 하면 됨
import { useMutation } from "@tanstack/react-query";
import {
    validateCoupon,
    type ValidateCouponParams,
    type ValidateCouponRes,
} from "../../api/couponApi";
import { useAuth } from "../../context/AuthContext";

/**
 * 쿠폰 사전 검증 뮤테이션 훅
 * - accessToken 인자를 넘기면 그 토큰을 우선 사용
 * - 인자가 없으면 Context의 access_token 사용
 */
export function useValidateCouponMutation(accessToken: string | null) {
    const { accessToken: ctxAccessToken } = useAuth();
    const token = accessToken ?? ctxAccessToken ?? "";

    return useMutation<ValidateCouponRes, unknown, ValidateCouponParams>({
        mutationFn: async (vars: ValidateCouponParams) => {
            if (!token) throw new Error("로그인이 필요합니다.");
            return validateCoupon(token, vars);
        },
        retry: (failureCount, err: any) => {
            if (err?.response?.status === 401) return false; // 인증 에러는 재시도 X
            return failureCount < 2;
        },
    });
}