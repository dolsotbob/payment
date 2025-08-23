// frontend/src/api/coupons.ts
// 프론트엔드에서 백엔드 쿠폰 관련 API를 호출하는 전용 클라이언트 모듈
// 역할 1: 쿠폰 데이터 가져오기 - JWT 로그인된 유저 지갑 주소 기준으로 보유한 NFT 쿠폰 목록을 가져온다. (/coupons/owned)
// 역할 2: 데이터 후처리 - DB/백앤드에서 숫자 필드(balance)를 문자열로 내려줄 수 있으므로 이를 프론트에서 바로 쓸 수 있게 number 타입으로 변환 

import api from "./axios";
import { OwnedCoupon } from "../types/couponTypes";

/** Nest 오류에서 reason/message 뽑기(배열 메시지도 평탄화) */
export function extractCouponReason(err: any): string | undefined {
    const data = err?.response?.data;
    const reason = data?.reason;
    const msg = data?.message;
    if (reason) return String(reason);
    if (Array.isArray(msg)) return msg.join(', ');
    if (msg) return String(msg);
    return undefined;
}

/** 문자열 숫자 → number 변환 유틸(안전) */
function asNumber(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

/** 백엔드 응답 전용 타입: balance가 string|number로 내려올 수 있음 */
type ApiOwnedCoupon = Omit<OwnedCoupon, "balance"> & { balance: number | string };

/** 1) 보유 쿠폰 조회 */
// axios.get<OwnedCoupon[]>: 응답이 OwnedCoupon[] 형태임을 명시.
// 요청 헤더에 Authorization: Bearer <jwt> 추가 → 인증된 사용자만 접근 가능.
// /coupons/owned 엔드포인트를 호출하여 해당 유저가 가진 쿠폰들을 가져옴.
export async function fetchOwnedCoupons(): Promise<OwnedCoupon[]> {
    const res = await api.get<OwnedCoupon[]>('/coupons/owned');
    // balance 같은 값이 string으로 내려올 경우 변환
    // res.data.map(...): 가져온 쿠폰 배열을 순회.
    // balance: DB/백엔드에서 string으로 내려올 수 있어서, 타입 안정성을 위해 parseInt로 변환.
    // 최종적으로 모든 쿠폰 객체를 OwnedCoupon 타입으로 맞춰 리턴.
    return res.data.map((c): OwnedCoupon => ({
        ...c,
        balance: asNumber(c.balance),
    }));
}

/** 2) (선택) 사전 검증: 사용 가능 여부만 체크 */
export type ValidateCouponParams = {
    couponId: number;   // ← tokenId → couponId로 통일
    amount?: number;    // 결제 금액이 검증에 필요하다
    productId: string;
};
export type ValidateCouponRes = {
    ok: boolean;
    reason?: string;
    discountBps?: number;
    priceCapUsd?: number;
};

export async function validateCoupon(access_token: string, params: ValidateCouponParams): Promise<ValidateCouponRes> {
    const res = await api.get<ValidateCouponRes>("/coupons/validate", { params });
    // 필요시 숫자 정규화 
    const d = res.data;
    return {
        ...d,
        discountBps: d.discountBps !== undefined ? asNumber(d.discountBps) : undefined,
        priceCapUsd: d.priceCapUsd !== undefined ? asNumber(d.priceCapUsd) : undefined,
    };
}

/** 3) 쿠폰 적용(결제 성공 후 사용 기록 생성) */
export type ApplyCouponBody = {
    couponId: number;     // ← tokenId → couponId로 통일
    paymentId: string;    // ← orderId → paymentId로 통일
    amount?: number;
    orderUsdTotal?: number;
};
export type ApplyCouponRes = { ok: true; useId: string };

export async function applyCoupon(access_token: string, body: ApplyCouponBody): Promise<ApplyCouponRes> {
    const res = await api.post<ApplyCouponRes>("/coupons/apply", body);
    return res.data;
}

/** 4) (선택) 내 사용 이력: 최근 N건 */
export type CouponUseItem = {
    id: string;
    walletAddress: string;
    couponId: number;
    txHash: string;
    quoteId?: string | null;
    usedAt: string; // ISO
};

export async function fetchMyCouponUses(limit = 50): Promise<CouponUseItem[]> {
    const res = await api.get<CouponUseItem[]>("/coupons/uses", { params: { limit } });
    return res.data;
}
