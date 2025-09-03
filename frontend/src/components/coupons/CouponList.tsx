import React, { useEffect, useMemo, useState, useCallback } from "react";
import type { OwnedCoupon } from "../../types/couponTypes";
import { CouponCard } from "./CouponCard";
import styles from "../css/coupons.module.css";
import { useCouponsQuery } from "../../hooks/queries/useCouponsQuery";
import { COUPON_DISCOUNT_ENABLED } from '../../config/featureFlags';

type Props = {
    accessToken: string;
    // 결제 페이지에 선택된 쿠폰을 전달하고 싶을 때 사용
    onSelectCoupon?: (coupon: OwnedCoupon | null) => void;
    // 자동으로 첫 번째 사용 가능 쿠폰을 선택할지 여부
    autoPickFirstUsable?: boolean;
};

const STORAGE_KEY = "selected_coupon_id";

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

    // 저장된 선택(있다면) 복원
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;

            const found = coupons.find(c => String(c.id) === saved);
            if (found) {
                setSelectedId(saved);
                // [쿠폰 할인 재활성화 시 이 주석 제거]: 저장된 선택을 실제 결제 할인에 반영하려면 아래 콜백을 그대로 사용하세요.
                onSelectCoupon?.(found);
            } else {
                // 저장된 id가 더 이상 유효하지 않으면 정리
                localStorage.removeItem(STORAGE_KEY);
                setSelectedId(null);
                onSelectCoupon?.(null);
            }
        } catch { }
        // coupons가 바뀔 때만 동작
    }, [coupons, onSelectCoupon]);

    // 첫 사용가능 쿠폰 자동 선택
    useEffect(() => {
        // ✅ 할인 비활성화 상태에서는 자동 선택을 강제로 끕니다(프리뷰 혼동 방지)
        if (!COUPON_DISCOUNT_ENABLED) return; // [쿠폰 할인 재활성화 시 이 라인 삭제]

        if (autoPickFirstUsable && usableCoupons.length > 0 && selectedId == null) {
            const first = usableCoupons[0];
            const id = String(first.id);
            setSelectedId(id);
            onSelectCoupon?.(first);
            try {
                localStorage.setItem(STORAGE_KEY, id);
            } catch { }
        }
    }, [autoPickFirstUsable, usableCoupons, selectedId, onSelectCoupon]);

    const handleApply = useCallback(
        (coupon: OwnedCoupon) => {
            const id = String(coupon.id);

            // ✅ 할인 비활성화 상태: 선택/해제는 UI 프리뷰용으로만 동작합니다.
            //    실제 결제 금액에는 영향을 주지 않습니다.
            if (!COUPON_DISCOUNT_ENABLED) {
                console.info("[coupon] 미적용(MVP): 쿠폰은 UI 프리뷰 전용입니다."); // [쿠폰 할인 재활성화 시 이 라인 삭제]
            }

            if (selectedId === id) {
                setSelectedId(null);
                onSelectCoupon?.(null);
                try {
                    localStorage.removeItem(STORAGE_KEY);
                } catch { }
            } else {
                setSelectedId(id);
                // [쿠폰 할인 재활성화 시 이 주석 제거]: 실제 할인 계산을 트리거하려면 이 콜백에서 서버 검증 → 결제금액 반영 로직을 연결하세요.
                onSelectCoupon?.(coupon);
                try {
                    localStorage.setItem(STORAGE_KEY, id);
                } catch { }
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
        <>
            {/* ✅ 할인 비활성화 안내 배너 */}
            {!COUPON_DISCOUNT_ENABLED && (
                <div
                    className={styles.box}
                    style={{
                        marginBottom: 8,
                        background: "#fff8e1",
                        border: "1px solid #f0d58c",
                        color: "#5f4b1a",
                        fontSize: 13,
                    }}
                // [쿠폰 할인 재활성화 시 이 블록 통째로 제거]
                >
                    NFT 쿠폰은 <b>UI 프리뷰 전용</b>입니다. 이번 MVP에서는 <b>할인 금액이 결제에 반영되지 않아요.</b>
                </div>
            )}

            <div className={styles.list} role="list">
                {sortedCoupons.map((coupon) => {
                    const id = String(coupon.id);
                    const selected = selectedId === id;
                    const usable =
                        coupon.status === "ACTIVE" && !isExpired(coupon.rule?.expiresAt) && coupon.balance > 0;

                    // 비활성화 상태에서는 hover 시 툴팁으로도 안내
                    const disabledTitle = !COUPON_DISCOUNT_ENABLED
                        ? "MVP: 쿠폰 미적용 (프리뷰 전용)"
                        : undefined;

                    return (
                        <div
                            key={id}
                            role="listitem"
                            className={`${styles.listItem} ${selected ? styles.listItemSelected : ""} ${!usable ? styles.listItemDisabled : ""}`}
                            title={disabledTitle} // [쿠폰 할인 재활성화 시 이 속성 제거]
                        >
                            <div
                                role="button"
                                tabIndex={0}
                                aria-pressed={selected}
                                aria-selected={selected}
                                className={styles.clickable}
                                onClick={(e) => {
                                    e.stopPropagation(); // 부모로 이벤트 전파 방지 
                                    handleApply(coupon);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleApply(coupon);
                                    }
                                }}
                            >
                                <CouponCard
                                    coupon={coupon}
                                    // CouponCard 내부 버튼이 따로 있다면 이 콜백과 충돌되지 않도록 전달
                                    onApply={() => handleApply(coupon)}
                                />
                                {/* ✅ 뱃지: 미적용 안내(간단 텍스트). 
                                    보다 예쁜 배지는 CouponCard 컴포넌트에서 처리하는 것을 권장합니다. */}
                                {!COUPON_DISCOUNT_ENABLED && (
                                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                                        (MVP: 미적용)
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};
