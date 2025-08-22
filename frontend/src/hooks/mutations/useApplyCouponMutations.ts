// useApplyCouponMutation.ts
// 결제 성공 후 쿠폰 사용 사실을 오프체인에 기록 
// 성공 시 내 보츄 쿠폰 목록이 바뀌므로 React Query 캐시를 무효화하여 화면 상태를 최신 상태로 동기화함 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyCoupon, type ApplyCouponBody, type ApplyCouponRes } from "../../api/coupons";

export function useApplyCouponMutation(jwt: string | null) {
    const qc = useQueryClient();
    return useMutation<ApplyCouponRes, unknown, ApplyCouponBody>({
        mutationFn: async (vars) => {
            if (!jwt) throw new Error("로그인이 필요합니다.");
            return applyCoupon(jwt, vars); // { couponId, paymentId, ... }
        },
        onSuccess: () => {
            // 사용 후 내 보유 쿠폰 목록 갱신
            qc.invalidateQueries({ queryKey: ["coupons", { jwt }] });
        },
    });
}

