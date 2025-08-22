import React, { useEffect, useMemo, useState } from "react";
import type { OwnedCoupon } from "../../types/coupons";
import { fetchOwnedCoupons } from "../../api/coupons";
import { CouponCard } from "./CouponCard";
import styles from "../css/coupons.module.css";

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
    const [coupons, setCoupons] = useState<OwnedCoupon[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [applyingId, setApplyingId] = useState<string | number | null>(null);
    const [selectedId, setSelectedId] = useState<string | number | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchOwnedCoupons(jwt);
                if (!alive) return;
                setCoupons(data ?? []);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? "쿠폰을 불러오지 못했습니다.");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [jwt]);

    const usableCoupons = useMemo(() => {
        if (!coupons) return [];
        const now = Date.now();
        return coupons.filter((c: any) => {
            const expiresAt = c.expiresAt ?? c.expiry ?? c.expires_on;
            const isExpired = expiresAt ? new Date(expiresAt).getTime() < now : false;
            const usedCount = c.usedCount ?? c.uses ?? 0;
            const maxUses = c.maxUses ?? c.limit ?? 1;
            return !isExpired && Math.max((maxUses ?? 1) - (usedCount ?? 0), 0) > 0;
        });
    }, [coupons]);

    // 옵션: 첫 사용가능 쿠폰 자동 선택
    useEffect(() => {
        if (autoPickFirstUsable && usableCoupons.length > 0 && selectedId == null) {
            const first = usableCoupons[0];
            setSelectedId(first.id as any);
            onSelectCoupon?.(first);
        }
    }, [autoPickFirstUsable, usableCoupons, selectedId, onSelectCoupon]);

    const handleApply = async (coupon: OwnedCoupon) => {
        try {
            setApplyingId(coupon.id as any);
            setSelectedId(coupon.id as any);
            onSelectCoupon?.(coupon);
            // 여기서는 선택만 담당합니다.
            // 실제 결제 API와 연동해 쿠폰 적용/검증을 하려면:
            // 1) validateCoupon(coupon.id)로 사전검증
            // 2) 결제 버튼에서 couponId를 포함해 결제 요청 보내기
        } catch (e) {
            // 화면상에서 별도 처리 필요시 여기에 로직 추가
        } finally {
            setApplyingId(null);
        }
    };

    if (loading) {
        return <div className={styles.box}>쿠폰을 불러오는 중...</div>;
    }
    if (error) {
        return <div className={`${styles.box} ${styles.boxError}`}>오류: {error}</div>;
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
                        applying={applyingId === coupon.id}
                        onApply={() => handleApply(coupon)}
                    />
                </div>
            ))}
        </div>
    );
};