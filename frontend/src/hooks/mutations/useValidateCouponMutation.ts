// src/hooks/mutations/useValidateCouponMutation.ts
// 결제 전에 선택한 쿠폰이 현재 사용 가능한지 사전 점금 
// 서버 정책(만료, 잔여 수량, 금액 한도 등)에 따라 ok / reason / discountBps 등을 받아 UI/결제 흐름을 결정함
// 실패/로딩 상태를 React Query가 관리하므로 컴포넌트는 호출만 하면 됨
import { useMutation } from "@tanstack/react-query";
import { validateCoupon, type ValidateCouponParams, type ValidateCouponRes } from "../../api/coupons";
import { useAuth } from "../../context/AuthContext";

export function useValidateCouponMutation() {
    const { access_token } = useAuth();

    return useMutation<ValidateCouponRes, unknown, ValidateCouponParams>({
        mutationFn: async (vars) => {
            if (!access_token) throw new Error("로그인이 필요합니다.");
            return await validateCoupon(vars);     // 객체 그대로 전달
        },
        retry: (failureCount, err: any) => {
            if (err?.response?.status === 401) return false; // 401은 재시도 X
            return failureCount < 2;
        },
    });
}
