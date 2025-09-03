// src/config/featureFlags.ts
export const COUPON_DISCOUNT_ENABLED =
    (process.env.REACT_APP_COUPON_DISCOUNT_ENABLED ?? 'false') === 'true';