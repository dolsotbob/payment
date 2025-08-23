// utils/couponUtils.ts
import api from "../api/axios";
import { ethers } from "ethers";
import Coupon1155Artifact from "../abis/Coupon1155.json";

export type SimpleCoupon = { id: number; balance: bigint };

/**
 * 지갑 보유 쿠폰을 가져옵니다.
 * 1) 백엔드 API 우선
 * 2) 실패 시 체인에서 ERC1155 balanceOf로 폴백 조회
 */
export async function fetchUserCoupons(wallet: string): Promise<SimpleCoupon[]> {
    if (!wallet) throw new Error("wallet 주소가 필요합니다.");

    // 1) 백엔드 API 조회 (api 인스턴스는 Authorization 자동 첨부)
    try {
        const { data } = await api.get<Array<{ id: number; balance: string }>>('/coupons/owned', {
            timeout: 15_000,
        });
        if (Array.isArray(data)) {
            // 문자열 balance → bigint로 정규화
            return data.map(d => ({ id: d.id, balance: BigInt(d.balance) })) as SimpleCoupon[];
        }
    } catch (err) {
        console.warn("API 조회 실패, 체인 폴백으로 진행:", err);
    }

    // 2) 체인 폴백 조회
    const contractAddr = process.env.REACT_APP_COUPON1155_ADDRESS;
    if (!contractAddr) throw new Error("REACT_APP_COUPON1155_ADDRESS가 설정되어 있지 않습니다.");
    if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("지갑(provider)을 찾을 수 없습니다. 브라우저 지갑을 연결해 주세요.");
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(contractAddr, Coupon1155Artifact.abi, provider);

    // 실제 프로젝트에서는 서버/메타데이터에서 ID 목록을 내려받기 
    const couponIds = [1, 2, 3];

    const balances = await Promise.all(
        couponIds.map(async (id) => {
            const bal = (await contract.balanceOf(wallet, id)) as bigint; // ethers v6: bigint
            return { id, balance: bal };
        })
    );

    // balance > 0n 인 것만 반환
    return balances.filter((c) => c.balance > 0n);
}