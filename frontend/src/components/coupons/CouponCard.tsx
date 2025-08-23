import React from "react";
import type { OwnedCoupon } from "../../types/couponTypes";
import { CouponApplyButton } from "./CouponApplyButton";
import styles from "../css/coupons.module.css";

type Props = {
    coupon: OwnedCoupon;
    onApply?: (coupon: OwnedCoupon) => void | Promise<void>;
    applying?: boolean;
    hideApplyButton?: boolean;
};

function formatDate(input?: string) {
    if (!input) return "";
    const ts = Date.parse(input);
    if (!Number.isFinite(ts)) return "";
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

export const CouponCard: React.FC<Props> = ({
    coupon,
    onApply,
    applying = false,
    hideApplyButton = false,
}) => {
    // types/coupons.ts에 맞춘 필드 접근
    const name = coupon.meta?.name ?? `#${coupon.id}`;
    const description = coupon.meta?.ipfsCid ?? ""; // description이 따로 없다면 ipfsCid 대신 meta에 추가할 수도 있음
    const expiresAt = coupon.rule.expiresAt;
    const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

    const isUsable =
        coupon.status === "ACTIVE" &&
        !isExpired &&
        coupon.balance > 0;

    const badgeClass =
        coupon.status === "ACTIVE" && !isExpired
            ? `${styles.badge} ${styles.badgeActive}`
            : `${styles.badge} ${styles.badgeDisabled}`;

    return (
        <div className={styles.card} role="group" aria-label={`Coupon ${name}`}>
            <div className="flex-1" style={{ flex: 1 }}>
                <div className={styles.titleRow}>
                    <h3 className={styles.title}>{name}</h3>
                    <span className={badgeClass}>
                        {coupon.status === "ACTIVE" && !isExpired ? "사용 가능" :
                            coupon.status === "EXPIRED" ? "만료" :
                                coupon.status === "USED_UP" ? "모두 사용" :
                                    "비활성"}
                    </span>
                </div>

                {description && <p className={styles.desc}>{description}</p>}

                <div className={styles.meta}>
                    <span>잔여 수량: <b>{coupon.balance}</b></span>
                    {expiresAt && <span>만료일: {formatDate(expiresAt)}</span>}
                    <span>ID: {coupon.id}</span>
                </div>
            </div>

            {!hideApplyButton && onApply && (
                <CouponApplyButton
                    coupon={coupon}
                    disabled={!isUsable}
                    busy={applying}
                    onApply={() => onApply(coupon)}
                />
            )}
        </div>
    );
};