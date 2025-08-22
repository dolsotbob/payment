// React Query 훅을 통해 JWT 기반 쿠폰 목록을 가져오는 전용 커스텀 훅 
/*
 역할: 
 - fetchOwnedCoupons(jwt) API를 "React Query의 useQuery"로 감싼 래퍼 
 - 쿠폰 목록을 가져오는 로직을 재사용하게 만든다 
 - 컴포넌트에서는 단순히 const { data, isLoading, isError } = useCouponsQuery(jwt) 형태로 호출만 하면 된다  
 */
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import type { OwnedCoupon } from "../../types/coupons";
import { fetchOwnedCoupons } from "../../api/coupons";

export function useCouponsQuery(jwt: string | null): UseQueryResult<OwnedCoupon[]> {
    return useQuery({
        // queryKey: 캐시를 구분하는 키. 사용자별로 캐시가 분리됨 
        queryKey: ["coupons", { jwt }],
        // 실제 데이터를 가져오는 비동기 함수 
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
        // select: API 응답을 가공하는 단계 
        select: (data) => data ?? [],
    });
}
