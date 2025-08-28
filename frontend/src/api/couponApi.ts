// frontend/src/api/couponApi.ts
// 프론트엔드에서 백엔드 쿠폰 관련 API를 호출하는 전용 클라이언트 모듈
// 역할 1: 쿠폰 데이터 가져오기 (/coupons/owned)
// 역할 2: 숫자 필드(balance 등) 정규화

import api from "./axios";
import { GetOwnedResponse } from "../types/couponTypes";

/** Nest 오류에서 reason/message 뽑기(배열 메시지도 평탄화) */
export function extractCouponReason(err: any): string | undefined {
    const data = err?.response?.data;
    const reason = data?.reason;
    const msg = data?.message;
    if (reason) return String(reason);
    if (Array.isArray(msg)) return msg.join(", ");
    if (msg) return String(msg);
    return undefined;
}

/** 문자열 -> 숫자 변환 유틸(안전) */
const asNumber = (v: any): number =>
    typeof v === "string" ? parseInt(v, 10) : Number(v ?? 0);

/** JWT 헤더 헬퍼 */
const authHeaders = (access_token?: string) =>
    access_token ? { Authorization: `Bearer ${access_token}` } : undefined;

/** 1) 보유 쿠폰 조회 */
export async function fetchOwnedCoupons(
    access_token: string
): Promise<GetOwnedResponse> {
    const res = await api.get<unknown>("/coupons/owned", {
        headers: authHeaders(access_token),
    });

    const d = res?.data as any;
    const items: any[] = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
    const wallet: string = d?.wallet ?? "";
    const fetchedAt: string = d?.fetchedAt ?? new Date().toISOString();

    // balance(string|number) 정규화 + isConsumable 보정
    const normalized: GetOwnedResponse = {
        wallet,
        fetchedAt,
        items: items.map((c) => ({
            ...c,
            balance: asNumber(c.balance),
            rule: {
                ...c.rule, // (선택) 원래 rule 유지
                discountBps: c.rule?.discountBps !== undefined ? asNumber(c.rule?.discountBps) : undefined,
                isConsumable: (c as any).rule?.isConsumable ?? Boolean((c as any).rule?.consumable),
                priceCapUsd: c.rule?.priceCapUsd !== undefined ? asNumber(c.rule?.priceCapUsd) : undefined,
                expiresAt: c.rule?.expiresAt,
            },
        })),
    };

    return normalized;
}

/** 2) 사전 검증 */
export type ValidateCouponParams = {
    couponId: number;
    amount?: number;
    productId: string;
};
export type ValidateCouponRes = {
    ok: boolean;
    reason?: string;
    discountBps?: number;
    priceCapUsd?: number;
    priceAfter?: string;
};

export async function validateCoupon(
    access_token: string,
    params: ValidateCouponParams
): Promise<ValidateCouponRes> {
    const res = await api.get<ValidateCouponRes>("/coupons/validate", {
        params,
        headers: { Authorization: `Bearer ${access_token}` },
    });
    const d = res.data;
    return {
        ...d,
        discountBps: d.discountBps !== undefined ? asNumber(d.discountBps) : undefined,
        priceCapUsd: d.priceCapUsd !== undefined ? asNumber(d.priceCapUsd) : undefined,
    };
}

/** 3) 쿠폰 적용 */
export type ApplyCouponBody = {
    couponId: number;
    paymentId: string;
    amount?: number;
    orderUsdTotal?: number;
};
export type ApplyCouponRes = { ok: true; useId: string };

export async function applyCoupon(
    access_token: string,
    body: ApplyCouponBody
): Promise<ApplyCouponRes> {
    const res = await api.post<ApplyCouponRes>("/coupons/apply", body, {
        headers: authHeaders(access_token),
    });
    return res.data;
}

/** 4) 내 사용 이력 */
export type CouponUseItem = {
    id: string;
    walletAddress: string;
    couponId: number;
    txHash: string;
    quoteId?: string | null;
    usedAt: string;
};

export async function fetchMyCouponUses(
    access_token: string,
    limit = 50
): Promise<CouponUseItem[]> {
    const res = await api.get<CouponUseItem[]>("/coupons/uses", {
        params: { limit },
        headers: authHeaders(access_token),
    });
    return res.data;
}

api.interceptors.response.use(
    r => r,
    (err) => {
        const s = err?.response?.status;
        const data = err?.response?.data;
        console.warn('[API ERR]', err.config?.url, s, data);
        return Promise.reject(err);
    }
);