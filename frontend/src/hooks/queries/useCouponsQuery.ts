// src/hooks/queries/useCouponsQuery.ts
// React Query 훅: access_token 기반 보유 쿠폰 목록 조회
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import type { OwnedCoupon } from "../../types/couponTypes";
import { fetchOwnedCoupons } from "../../api/couponApi";
import { useAuth } from "../../context/AuthContext"; // 전역 토큰/유저

/**
 * 사용법:
 *  - 기본: const { data } = useCouponsQuery();
 *  - 토큰 오버라이드 필요 시: useCouponsQuery(customToken)
 */
export function useCouponsQuery(
    accessTokenOverride?: string
): UseQueryResult<OwnedCoupon[], Error> {
    const { accessToken, user } = useAuth();
    const token = accessTokenOverride ?? accessToken ?? null;

    return useQuery<OwnedCoupon[], Error>({
        // queryKey: 캐시를 구분하는 키. 사용자별로 캐시가 분리됨 
        queryKey: ["coupons", user?.address ?? token ?? "anon"],
        enabled: !!token,           // 토큰 없으면 자동 비활성
        staleTime: 1000 * 30,     // 30초 동안 신선
        gcTime: 1000 * 60 * 5,    // 5분 후 캐시 회수
        retry: (failureCount, err: any) => {
            // 401은 재시도하지 않음
            if (err?.response?.status === 401) return false;
            return failureCount < 2;
        },
        // 실제 데이터를 가져오는 비동기 함수 
        queryFn: async () => {
            if (!token) throw new Error("로그인이 필요합니다.");
            const res = await fetchOwnedCoupons(token); // GetOwnedResponse
            return res.items ?? [];
        },
    });
}
