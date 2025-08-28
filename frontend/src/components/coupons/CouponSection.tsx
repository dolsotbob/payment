import React, { useState } from "react";
import type { OwnedCoupon } from "../../types/couponTypes";
import { CouponList } from "./CouponList";

type Props = {
    accessToken: string | null;              // AuthContext 등에서 전달
    onAppliedChange?: (c: OwnedCoupon | null) => void; // 선택/해제 시 상위로 알림(선택)
    autoPickFirstUsable?: boolean;           // 첫 사용가능 쿠폰 자동 선택(선택)
};

export default function CouponsSection({
    accessToken,
    onAppliedChange,
    autoPickFirstUsable = false,
}: Props) {
    const [selected, setSelected] = useState<OwnedCoupon | null>(null);

    if (!accessToken) {
        return <div style={{ padding: 12 }}>쿠폰을 보려면 먼저 로그인하세요.</div>;
    }

    return (
        <section style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>내 쿠폰</h2>
            <CouponList
                accessToken={accessToken}
                autoPickFirstUsable={autoPickFirstUsable}
                onSelectCoupon={(c) => {
                    setSelected(c);
                    onAppliedChange?.(c ?? null);
                }}
            />
            {selected ? (
                <div style={{ fontSize: 14 }}>
                    선택한 쿠폰: <b>{selected.meta?.name ?? `#${selected.id}`}</b>
                </div>
            ) : (
                <div style={{ fontSize: 14, opacity: 0.7 }}>선택된 쿠폰 없음</div>
            )}
        </section>
    );
}