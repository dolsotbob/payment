import React, { useEffect, useMemo, useState } from "react";
import type { OwnedCoupon } from "../../types/coupons";
// import { fetchOwnedCoupons } from "../../api/coupons";
import { CouponCard } from "./CouponCard";
import styles from "../css/coupons.module.css";
import { useCouponsQuery } from "../../hooks/queries/useCouponsQuery";

type Props = {
    jwt: string;
    // 결제 페이지에 선택된 쿠폰을 전달하고 싶을 때 사용
    onSelectCoupon?: (coupon: OwnedCoupon | null) => void;
    // 자동으로 첫 번째 사용 가능 쿠폰을 선택할지 여부
    autoPickFirstUsable?: boolean;
};

export const CouponList: React.FC<Props> = ({
    jwt,
    onSelectCoupon,
    autoPickFirstUsable = false,
}) => {
    // 훅으로 data, isPending, isError, error를 한 번에 제공
    const { data: coupons = [], isPending, isError, error } = useCouponsQuery(jwt);
    const [selectedId, setSelectedId] = useState<string | number | null>(null);

    // 사용 가능 쿠폰 계산 (메모화)
    // 만료일과 잔여 수량으로 필터링 
    const usableCoupons = useMemo(() => {
        // if (!coupons) return [];
        const now = Date.now();
        return coupons.filter((c) => {
            const exp = c.rule?.expiresAt;
            const isExpired = exp ? new Date(exp).getTime() < now : false;
            return c.status === "ACTIVE" && !isExpired && c.balance > 0;
        });
    }, [coupons]);

    // 옵션: 첫 사용가능 쿠폰 자동 선택
    // autoPickFirstUsable가 true면 첫 사용가능 쿠폰을 자동으로 선택하여 결제 플로우로 전달
    useEffect(() => {
        if (autoPickFirstUsable && usableCoupons.length > 0 && selectedId == null) {
            const first = usableCoupons[0];
            setSelectedId(first.id);
            onSelectCoupon?.(first);
        }
    }, [autoPickFirstUsable, usableCoupons, selectedId, onSelectCoupon]);

    if (isPending) return <div className={styles.box}>쿠폰을 불러오는 중...</div>;
    if (isError) {
        const message =
            (error as any)?.response?.status === 401
                ? "세션이 만료되었습니다. 다시 로그인 해주세요."
                : ((error as any)?.message ?? "쿠폰을 불러오지 못했습니다.");
        return <div className={`${styles.box} ${styles.boxError}`}>오류: {message}</div>;
    }

    if (!coupons || coupons.length === 0) {
        return <div className={styles.box}>보유한 쿠폰이 없습니다.</div>;
    }

    return (
        <div className={styles.list}>
            {coupons.map((coupon) => (
                <div
                    key={coupon.id}
                    className={`${styles.listItem} ${selectedId === coupon.id ? styles.listItemSelected : ""
                        }`}
                >
                    <CouponCard
                        coupon={coupon}
                        onApply={() => {
                            setSelectedId(coupon.id);
                            onSelectCoupon?.(coupon);
                        }}
                    />
                </div>
            ))}
        </div>
    );
};
