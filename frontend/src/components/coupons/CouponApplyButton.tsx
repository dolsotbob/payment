import React from "react";
import type { OwnedCoupon } from "../../types/coupons";
import styles from '../css/coupons.module.css'

type Props = {
    coupon: OwnedCoupon;
    onApply: () => void | Promise<void>;
    disabled?: boolean;
    busy?: boolean;
};

export const CouponApplyButton: React.FC<Props> = ({
    coupon,
    onApply,
    disabled = false,
    busy = false,
}) => {
    const isDisabled = disabled || busy;
    return (
        <button
            type="button"
            onClick={onApply}
            disabled={isDisabled}
            className={`${styles.button} ${isDisabled ? styles.buttonDisabled : ""}`}
            aria-disabled={isDisabled}
            aria-label={`Apply coupon ${coupon?.meta?.name ?? coupon?.id}`}
        >
            {busy ? "적용 중..." : "쿠폰 적용"}
        </button>
    );
};