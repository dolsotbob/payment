import { useQuery, UseQueryResult } from "@tanstack/react-query";
import type { OwnedCoupon } from "../../types/coupons";
import { fetchOwnedCoupons } from "../../api/coupons";

export function useCouponsQuery(jwt: string | null): UseQueryResult<OwnedCoupon[]> {
    return useQuery({
        queryKey: ["coupons", { jwt }],
        queryFn: async () => {
            if (!jwt) throw new Error("로그인이 필요합니다.");
            return await fetchOwnedCoupons(jwt);
        },
        enabled: !!jwt,           // jwt 없으면 자동 비활성
        staleTime: 1000 * 30,     // 30초 동안 신선
        gcTime: 1000 * 60 * 5,    // 5분 후 캐시 회수
        retry: (failureCount, err: any) => {
            // 401은 재시도하지 않음
            if (err?.response?.status === 401) return false;
            return failureCount < 2;
        },
        select: (data) => data ?? [],
    });
}
