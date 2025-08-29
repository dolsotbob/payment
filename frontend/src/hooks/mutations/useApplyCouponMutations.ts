// src/hooks/mutations/useApplyCouponMutations.ts
// 결제 성공 후 쿠폰 사용 사실을 오프체인에 기록
// 성공 시 보유 쿠폰 목록이 바뀌므로 React Query 캐시를 무효화하여 화면 상태를 최신으로 동기화

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyCoupon, type ApplyCouponBody, type ApplyCouponRes } from "../../api/couponApi";
import { useAuth } from "../../context/AuthContext";

export function useApplyCouponMutation(accessToken?: string | null) {
    const qc = useQueryClient();
    const { accessToken: ctxAccessToken } = useAuth();
    const token: string | undefined =
        (accessToken ?? ctxAccessToken ?? undefined) || undefined;

    return useMutation<ApplyCouponRes, unknown, ApplyCouponBody>({
        mutationFn: async (vars) => {
            if (!token) {
                throw new Error("로그인이 필요합니다.");
            }
            return applyCoupon(token, vars);
        },
        onSuccess: () => {
            // ✅ 토큰 포함 여부와 무관하게 coupons 계열 쿼리 전부 무효화
            qc.invalidateQueries({
                predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "coupons",
            });
        },
        retry: (failureCount, err: any) => {
            if (err?.response?.status === 401) return false; // 인증 에러는 재시도 X
            return failureCount < 2;
        },
    });
}