-- 필수 확장
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) 상품
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(64) UNIQUE,
  name text NOT NULL,
  price_wei numeric(78,0) NOT NULL,
  image_url text,
  hover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_products_price_nonneg CHECK (price_wei >= 0)
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- 2) 유저 (지갑 기반)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid varchar(64),
  wallet_address varchar(64) UNIQUE NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 항상 소문자로만 저장되도록 강제
  CONSTRAINT chk_users_wallet_lower CHECK (wallet_address = lower(wallet_address))
);

-- 조회 최적화 (선택)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 3) 로그인 이력 (분리)
CREATE TABLE IF NOT EXISTS user_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip varchar(64),
  user_agent text,
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_user ON user_login_history(user_id);

-- 4) 배송지 (여러 개 가능)
-- ShippingInfo 테이블 (프론트 엔티티와 호환)
CREATE TABLE IF NOT EXISTS shipping_info (
  id serial PRIMARY KEY,                          -- 엔티티: number
  user_address varchar(64) NOT NULL,              -- 엔티티: userAddress (지갑주소, 소문자 권장)
  recipient_name text NOT NULL,                   -- 엔티티: recipientName
  phone_number text NOT NULL,                     -- 엔티티: phoneNumber
  address text NOT NULL,                          -- 엔티티: address (단일 문자열)
  delivery_status varchar(32) NOT NULL DEFAULT 'Ready',  -- 엔티티: DeliveryStatus (enum)
  created_at timestamptz NOT NULL DEFAULT now(),  -- 엔티티: CreateDateColumn
  updated_at timestamptz NOT NULL DEFAULT now()   -- 엔티티: UpdateDateColumn (앱단에서 갱신)
);
-- 조회 최적화: 지갑주소 인덱스
CREATE INDEX IF NOT EXISTS idx_shipping_user_address ON shipping_info(user_address);

-- (옵션) 쿠폰 카탈로그 캐시 (표시용/검색용)
CREATE TABLE IF NOT EXISTS coupon_catalog (
  "tokenId" int PRIMARY KEY,   -- ERC1155 tokenId
  "ipfsCid" text,              -- 메타데이터 CID (표시용 캐시)
  "name" text,                 -- 표시용 캐시 (권위는 IPFS)
  "imageUrl" text,             -- 표시용 캐시 
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- 5) 결제 원장
-- payments table: matches payment.entity.ts exactly (camelCase, types)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  "txHash" varchar(66) NOT NULL UNIQUE,
  "from"   varchar(42) NOT NULL,         -- reserved word -> quoted

  "originalPrice"   numeric(78,0) NOT NULL,
  "discountAmount"  numeric(78,0) NOT NULL,
  "discountedPrice" numeric(78,0) NOT NULL,
  "cashbackAmount"  numeric(78,0) NOT NULL,

  "gasUsed" numeric(78,0),
  "gasCost" numeric(78,0),

  "status"         varchar(16) NOT NULL DEFAULT 'PENDING',
  "cashbackStatus" varchar(16) NOT NULL DEFAULT 'PENDING',

  "cashbackTxHash" varchar(66),

  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),

  "retryCount" int NOT NULL DEFAULT 0,

  -- FK: Product.id (uuid)
  "productId" uuid REFERENCES products(id) ON DELETE SET NULL,

  -- non-negative money guards (mirror of @Check in entity)
  CONSTRAINT chk_pay_original_price_nonneg   CHECK ("originalPrice"   >= 0),
  CONSTRAINT chk_pay_discount_amount_nonneg  CHECK ("discountAmount"  >= 0),
  CONSTRAINT chk_pay_discounted_price_nonneg CHECK ("discountedPrice" >= 0),
  CONSTRAINT chk_pay_cashback_amount_nonneg  CHECK ("cashbackAmount"  >= 0)
);

-- Indexes (mirror of @Index)
CREATE INDEX IF NOT EXISTS idx_pay_from_createdat   ON payments("from", "createdAt");
CREATE INDEX IF NOT EXISTS idx_pay_status           ON payments("status");
CREATE INDEX IF NOT EXISTS idx_pay_cashback_status  ON payments("cashbackStatus");
CREATE INDEX IF NOT EXISTS idx_pay_product_id       ON payments("productId");
CREATE INDEX IF NOT EXISTS idx_pay_cashback_txhash  ON payments("cashbackTxHash");

-- 6) 쿠폰 사용 이력 (1회용/소모 추적)
CREATE TABLE IF NOT EXISTS coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletAddress" varchar(64) NOT NULL,
  "couponId" int NOT NULL,
  "paymentId" uuid NULL REFERENCES payments(id) ON DELETE CASCADE,
  "quoteId" varchar(100),
  "txHash" varchar(66) NOT NULL,
  "usedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_wallet_coupon_tx UNIQUE ("walletAddress","couponId","txHash")
);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_wallet ON coupon_uses("walletAddress");
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON coupon_uses("couponId");
CREATE INDEX IF NOT EXISTS idx_coupon_uses_payment ON coupon_uses("paymentId");

-- 7) 캐시백 원장 (적립/지급 등 이벤트 단위)
CREATE TABLE IF NOT EXISTS cashback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  "walletAddress" varchar(64) NOT NULL,
  "paymentId" uuid NULL REFERENCES payments(id) ON DELETE SET NULL,

  "rateBps" int,
  "amountWei" numeric(78,0) NOT NULL,

  "status" varchar(16) NOT NULL DEFAULT 'PENDING', -- CashbackStatus와 호환
  "txHash" varchar(66),
  "memo" text,

  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),

  -- 금액 음수/양수 허용(차감 이벤트 지원). 필요 시 하한/상한 정책 추가 가능
  CONSTRAINT chk_cashback_amount_not_nan CHECK ("amountWei" IS NOT NULL)
);

-- 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_cashback_wallet   ON cashback_entries("walletAddress");
CREATE INDEX IF NOT EXISTS idx_cashback_status   ON cashback_entries("status");
CREATE INDEX IF NOT EXISTS idx_cashback_payment  ON cashback_entries("paymentId");
CREATE INDEX IF NOT EXISTS idx_cashback_txhash   ON cashback_entries("txHash");

-- (선택) 누적 캐시백 잔액 캐시 (집계 성능용)
CREATE TABLE IF NOT EXISTS user_cashback_balances (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "walletAddress" varchar(64) UNIQUE NOT NULL,
  balance_wei numeric(78,0) NOT NULL DEFAULT 0,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
