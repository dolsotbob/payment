import React, { useEffect, useMemo, useState, useCallback } from "react";
import type { OwnedCoupon } from "../../types/coupons";
// import { fetchOwnedCoupons } from "../../api/coupons";
import { CouponCard } from "./CouponCard";
import styles from "../css/coupons.module.css";
import { useCouponsQuery } from "../../hooks/queries/useCouponsQuery";

type Props = {
    accessToken: string;
    // 결제 페이지에 선택된 쿠폰을 전달하고 싶을 때 사용
    onSelectCoupon?: (coupon: OwnedCoupon | null) => void;
    // 자동으로 첫 번째 사용 가능 쿠폰을 선택할지 여부
    autoPickFirstUsable?: boolean;
};

export const CouponList: React.FC<Props> = ({
    accessToken,
    onSelectCoupon,
    autoPickFirstUsable = false,
}) => {
    // 훅으로 data, isPending, isError, error를 한 번에 제공
    const { data: coupons = [], isPending, isError, error, refetch, isRefetching } = useCouponsQuery(accessToken);
    // 쿠폰 id가 string일 가능성이 높으므로 단순화
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 안전한 만료 체크 헬퍼
    const isExpired = (exp?: string | null) => {
        if (!exp) return false;
        const ts = Date.parse(exp); // ISO 기준
        if (!Number.isFinite(ts)) return false; // 파싱 실패 시 만료로 보지 않음
        return ts < Date.now();
    };

    // 사용 가능 쿠폰 필터 + 정렬(usable 먼저, 그 안에서는 만료 임박순)
    const [usableCoupons, sortedCoupons] = useMemo(() => {
        const usable = coupons.filter(
            (c) => c.status === "ACTIVE" && !isExpired(c.rule?.expiresAt) && c.balance > 0
        );
        const sorter = (a: OwnedCoupon, b: OwnedCoupon) => {
            const ax = Date.parse(a.rule?.expiresAt ?? "");
            const bx = Date.parse(b.rule?.expiresAt ?? "");
            // 숫자 아닌 값은 뒤로
            const aValid = Number.isFinite(ax);
            const bValid = Number.isFinite(bx);
            if (aValid && bValid) return ax - bx; // 임박한 순
            if (aValid) return -1;
            if (bValid) return 1;
            return 0;
        };

        const unusable = coupons.filter((c) => !usable.includes(c));
        // usable 먼저, 각각 내부 정렬
        usable.sort(sorter);
        unusable.sort(sorter);
        return [usable, [...usable, ...unusable]];
    }, [coupons]);

    // 옵션: 첫 사용가능 쿠폰 자동 선택
    // autoPickFirstUsable가 true면 첫 사용가능 쿠폰을 자동으로 선택하여 결제 플로우로 전달
    useEffect(() => {
        if (autoPickFirstUsable && usableCoupons.length > 0 && selectedId == null) {
            const first = usableCoupons[0];
            setSelectedId(String(first.id));
            onSelectCoupon?.(first);
        }
    }, [autoPickFirstUsable, usableCoupons, selectedId, onSelectCoupon]);

    const handleApply = useCallback(
        (coupon: OwnedCoupon) => {
            const id = String(coupon.id);
            // 같은 쿠폰을 다시 누르면 해제
            if (selectedId === id) {
                setSelectedId(null);
                onSelectCoupon?.(null);
            } else {
                setSelectedId(id);
                onSelectCoupon?.(coupon);
            }
        },
        [selectedId, onSelectCoupon]
    );

    if (isPending) {
        return <div className={styles.box}>쿠폰을 불러오는 중...</div>;
    }

    if (isError) {
        const httpStatus = (error as any)?.response?.status;
        const message =
            httpStatus === 401
                ? "세션이 만료되었습니다. 다시 로그인 해주세요."
                : (error as any)?.message ?? "쿠폰을 불러오지 못했습니다.";
        return (
            <div className={`${styles.box} ${styles.boxError}`}>
                오류: {message}
                <div className={styles.actions}>
                    <button className={styles.retryBtn} onClick={() => refetch()} disabled={isRefetching}>
                        {isRefetching ? "다시 시도 중..." : "다시 시도"}
                    </button>
                </div>
            </div>
        );
    }

    if (!coupons || coupons.length === 0) {
        return <div className={styles.box}>보유한 쿠폰이 없습니다.</div>;
    }

    return (
        <div className={styles.list} role="list">
            {sortedCoupons.map((coupon) => {
                const id = String(coupon.id);
                const selected = selectedId === id;
                const usable =
                    coupon.status === "ACTIVE" && !isExpired(coupon.rule?.expiresAt) && coupon.balance > 0;

                return (
                    <div
                        key={id}
                        role="listitem"
                        className={`${styles.listItem} ${selected ? styles.listItemSelected : ""} ${!usable ? styles.listItemDisabled : ""
                            }`}
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            aria-pressed={selected}
                            aria-selected={selected}
                            className={styles.clickable}
                            onClick={() => handleApply(coupon)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleApply(coupon);
                                }
                            }}
                        >
                            <CouponCard
                                coupon={coupon}
                                // CouponCard 내부 버튼이 따로 있다면 이 콜백과 충돌되지 않도록 전달
                                onApply={() => handleApply(coupon)}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
