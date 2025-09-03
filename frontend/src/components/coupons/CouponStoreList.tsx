// src/components/coupons/CouponStoreList.tsx
import { useQuery } from "@tanstack/react-query";
import { CouponCard } from "./CouponCard";
import { OwnedCoupon } from "../../types/couponTypes";

export default function CouponStoreList() {
    const { data: storeCoupons = [] as OwnedCoupon[], isLoading } = useQuery<OwnedCoupon[]>({
        queryKey: ["coupon-store"],
        queryFn: async () => {
            const res = await fetch("/api/coupons/store"); // 백엔드 API 필요
            return res.json();
        },
    });

    if (isLoading) return <div>쿠폰 상점 불러오는 중...</div>;

    return (
        <div>
            <h2>쿠폰 상점</h2>
            {storeCoupons.map((c: OwnedCoupon) => (
                <CouponCard
                    key={c.id}
                    coupon={c}
                    hideApplyButton
                    onApply={() => console.log("구매/발급", c.id)}
                />
            ))}
        </div>
    );
}
