// frontend/src/api/coupons.ts
// 프론트엔드에서 백엔드 쿠폰 관련 API를 호출하는 전용 클라이언트 모듈
// 역할 1: 쿠폰 데이터 가져오기 - JWT 로그인된 유저 지갑 주소 기준으로 보유한 NFT 쿠폰 목록을 가져온다. (/coupons/owned)
// 역할 2: 데이터 후처리 - DB/백앤드에서 숫자 필드(balance)를 문자열로 내려줄 수 있으므로 이를 프론트에서 바로 쓸 수 있게 number 타입으로 변환 

import axios from "axios";  // HTTP 요청을 보낼 라이브러리 
// 백앤드에서 내려주는 쿠폰 응답 타입을 프론트앤드에서 공유하기 위해 types/coupons.ts에 정의한 타입 
import { OwnedCoupon } from "../types/coupons";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "https://payment-backend-feature.onrender.com";

/** 공통: Nest 오류 형식에서 reason/message 안전하게 뽑기 */
export function extractCouponReason(err: any): string | undefined {
    return err?.response?.data?.reason || err?.response?.data?.message;
}

/** 1) 보유 쿠폰 조회 */
// axios.get<OwnedCoupon[]>: 응답이 OwnedCoupon[] 형태임을 명시.
// 요청 헤더에 Authorization: Bearer <jwt> 추가 → 인증된 사용자만 접근 가능.
// /coupons/owned 엔드포인트를 호출하여 해당 유저가 가진 쿠폰들을 가져옴.
export async function fetchOwnedCoupons(jwt: string): Promise<OwnedCoupon[]> {
    const res = await axios.get<OwnedCoupon[]>(`${API_BASE}/coupons/owned`, {
        headers: {
            Authorization: `Bearer ${jwt}`,
        },
    });

    // 🔎 balance 같은 값이 string으로 내려올 경우 변환
    // res.data.map(...): 가져온 쿠폰 배열을 순회.
    // balance: DB/백엔드에서 string으로 내려올 수 있어서, 타입 안정성을 위해 parseInt로 변환.
    // 최종적으로 모든 쿠폰 객체를 OwnedCoupon 타입으로 맞춰 리턴.
    return res.data.map((c) => ({
        ...c,
        balance: typeof c.balance === "string" ? parseInt(c.balance, 10) : c.balance,
    }));
}

/** 2) 쿠폰 적용(오프체인 기록) */
export async function applyCoupon(
    jwt: string,
    input: { tokenId: number; orderId: string; amount?: number; orderUsdTotal?: number }
) {
    const res = await axios.post(`${API_BASE}/coupons/apply`, input, {
        headers: { Authorization: `Bearer ${jwt}` },
    });
    return res.data; // 서버가 저장한 coupon_uses 레코드(or OK 응답)
}

/** 3) (선택) 사전 검증: 사용 가능 여부만 체크 */
export async function validateCoupon(
    jwt: string,
    params: { tokenId: number; amount?: number }
): Promise<{ ok: boolean; reason?: string }> {
    const res = await axios.get(`${API_BASE}/coupons/validate`, {
        headers: { Authorization: `Bearer ${jwt}` },
        params,
    });
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
export async function fetchMyCouponUses(jwt: string, limit = 50): Promise<CouponUseItem[]> {
    const res = await axios.get<CouponUseItem[]>(`${API_BASE}/coupons/uses`, {
        headers: { Authorization: `Bearer ${jwt}` },
        params: { limit },
    });
    return res.data;
}