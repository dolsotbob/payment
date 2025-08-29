// src/hooks/mutations/useApplyCouponMutations.ts
// 결제 성공 후 쿠폰 사용 사실을 오프체인에 기록
// 성공 시 보유 쿠폰 목록이 바뀌므로 React Query 캐시를 무효화하여 화면 상태를 최신으로 동기화

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyCoupon, type ApplyCouponBody, type ApplyCouponRes } from "../../api/couponApi";
import { useAuth } from "../../context/AuthContext";

export function useApplyCouponMutation(accessToken?: string | null) {
    const qc = useQueryClient();
    const { accessToken: ctxAccessToken } = useAuth();

    return useMutation<ApplyCouponRes, unknown, ApplyCouponBody>({
        mutationFn: async (vars) => {
            const token = (accessToken ?? ctxAccessToken ?? undefined) || undefined;

            // 🔧 토큰 없으면 네트워크 호출 skip (조용히 성공처럼 처리하거나 상위에서 조건부 호출)
            if (!token) {
                // 필요시: 그냥 no-op 성공으로 처리
                return Promise.resolve({ ok: true, useId: "" } as ApplyCouponRes);
            }

            return applyCoupon(token, vars);
        },
        onSuccess: () => {
            qc.invalidateQueries({
                predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "coupons",
            });
        },
        retry: (failureCount, err: any) => {
            if (err?.response?.status === 401) return false;
            return failureCount < 2;
        },
    });
}