// utils/coupon.ts
import { getCouponsFromAPI } from './request';
import { ethers } from 'ethers';
import Coupon1155ABI from '../abi/Coupon1155.json';

export async function fetchUserCoupons(wallet: string) {
    // 1) 백엔드 API 조회
    try {
        const res = await fetch(`/api/coupons?owner=${wallet}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length) return data; // ex: [{id:1, balance:2}, ...]
        }
    } catch (err) {
        console.warn("API 조회 실패, fallback 실행:", err);
    }

    // 22) fallback: 체인 직접 조회
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
        process.env.REACT_APP_COUPON1155_ADDRESS!,
        Coupon1155ABI,
        provider
    );

    const couponIds = [1, 2, 3]; // 체크할 쿠폰 ID 목록
    const balances = await Promise.all(
        couponIds.map(id => contract.balanceOf(walletAddress, id))
    );

    return couponIds.filter((_, idx) => balances[idx] > 0);
}