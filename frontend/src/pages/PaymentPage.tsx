// src/pages/PaymentPage.tsx
// 상품 목록과 배송지 + 결제 흐름만 관리

import React, { useState, useEffect, useCallback } from "react";
import { Product, ShippingInfo } from "../types/types";
import ProductList from "../components/ProductList";
import { ShippingForm } from "../components/ShippingForm";
import PayButton from "../components/PayButton";
import Modal from "../components/Modal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./paymentPage.css";
import HeroSection from "../components/HeroSection";
import { CouponList } from "../components/coupons/CouponList";
import type { OwnedCoupon } from "../types/couponTypes";
import { useValidateCouponMutation } from "../hooks/mutations/useValidateCouponMutation";
import { useAuth } from "../context/AuthContext";

interface Props {
    account: string | null;  // 유저 주소 
    onLogin: () => void;
}

const DebugLog: React.FC<{ label: string; data: any }> = ({ label, data }) => {
    console.log(label, data);
    return null; // JSX에 넣어도 ReactNode로 허용됨
};

const PaymentPage: React.FC<Props> = ({ account, onLogin }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedCoupon, setSelectedCoupon] = useState<OwnedCoupon | null>(null);
    const [finalAmountWei, setFinalAmountWei] = useState<string | null>(null);
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [showShippingForm, setShowShippingForm] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // ref (렌더 간 유지용, 값 바뀌어도 리랜더 안 됨)
    const lastValidateKeyRef = React.useRef<string | null>(null);

    // 상품이 바뀌면 새 조합으로 다시 검증 가능하도록 리셋
    useEffect(() => {
        lastValidateKeyRef.current = null;
    }, [selectedProduct]);

    // Context에서 토큰 사용(직접 localStorage 접근 지양)
    const { accessToken: ctxAccessToken } = useAuth();
    const accessToken = ctxAccessToken ?? null;

    // 훅에 토큰 전달 (미전달 시 401 가능)
    const validateMut = useValidateCouponMutation(accessToken ?? undefined);

    const BASE =
        process.env.REACT_APP_BACKEND_URL ??
        "https://payment-backend-feature.onrender.com";

    useEffect(() => {
        // 1. 상품 목록 로드 
        const fetchProducts = async () => {
            try {
                const res = await fetch(`${BASE}/product`, { method: 'GET' });
                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    throw new Error(`상품 API 오류: ${res.status} ${txt}`);
                }

                const data = await res.json();
                // (2) 변환:
                // 서버 응답의 키는 priceWei(문자열, wei)
                // 표시용으로 priceTori(문자열, TORI) 필드를 만들기 
                const parsedData: Product[] = data.map((p: any) => ({
                    ...p,
                    priceWei: p.priceWei ?? p.price_wei,     // 혹시 백엔드가 raw로 보낼 때 대비
                }));
                setProducts(parsedData);
            } catch (err) {
                console.error('❌ 상품 목록 로드 실패:', err);
            }
        };

        fetchProducts();
    }, [BASE]);

    // 2. 배송지 조회 (GET /shipping-info/:userAddress)
    const fetchShippingInfo = useCallback(async () => {
        if (!account) {
            // 로그아웃/계정 해제 시 상태 정리
            setShippingInfo(null);
            return;
        }

        try {
            const userAddr = account.toLowerCase();
            const res = await fetch(
                `${BASE}/shipping-info/${encodeURIComponent(userAddr)}`,
                { method: "GET" }
            );

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error("❌ 배송지 조회 실패:", res.status, txt);
                throw new Error(`배송지 조회 실패: ${res.status}`);
            }

            const text = await res.text();
            const data = text ? JSON.parse(text) : null;
            setShippingInfo(data);  // 기존 상태 업데이트; null이면 배송지 없음으로 처리 가능 
        } catch (err) {
            console.error('❌ 배송지 정보 로드 실패:', err);
        }
    }, [account, BASE]);

    // 계정이 바뀌면 배송지 재조회 
    useEffect(() => {
        fetchShippingInfo();
    }, [fetchShippingInfo]);

    // 3. 상품 선택 -> 배송지 폼 열기 
    const handlePurchase = (product: Product) => {
        setSelectedProduct(product);
        setShowShippingForm(true);
        setSelectedCoupon(null);
        setFinalAmountWei(product.priceWei); // 기본 금액으로 초기화
    };

    // 4. 배송지 제출 (POST /shipping-info)
    const handleShippingSubmit = async (info: Omit<ShippingInfo, 'id'>) => {
        try {
            if (!account) {
                alert("로그인 후 배송지를 저장할 수 있습니다.");
                return;
            }

            // DTO에 맞는 필드만 새 객체로 구성
            const body = {
                userAddress: account.toLowerCase(),
                recipientName: String(info.recipientName ?? "").trim(),
                phoneNumber: String(info.phoneNumber ?? "").trim(),
                address: String(info.address ?? "").trim(),
            };

            // 간단한 클라이언트 검증(빈 값 방지)
            if (!body.recipientName || !body.phoneNumber || !body.address) {
                alert("모든 배송 정보를 입력해주세요.");
                return;
            }

            const res = await fetch(`${BASE}/shipping-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                // 서버 validation 에러 메시지 확인
                const data = await res.json().catch(() => ({}));
                console.error("❌ 배송지 저장 실패:", res.status, data);
                const msg =
                    (Array.isArray(data?.message) && data.message.join(", ")) ||
                    data?.message ||
                    "배송지 저장에 실패했습니다.";
                alert(msg);
                return;
            }

            const savedInfo = await res.json(); // id 포함된 응답
            setShippingInfo(savedInfo);
        } catch (err) {
            console.error('❌ 배송지 저장 실패:', err);
            alert("배송지 저장 중 오류가 발생했습니다.");
        } finally {
            setShowShippingForm(false);
        }
    };

    // 5. 배송지 폼 닫기 
    const handleCancelShipping = () => {
        setShowShippingForm(false);
    };

    // 쿠폰 적용 시 최종금액 설정 보조: 어떤 타입이 와도 문자열 wei로 정규화
    const toWeiString = (v: unknown): string | null => {
        if (v == null) return null;
        if (typeof v === "string") return v;
        if (typeof v === "bigint") return v.toString();
        // 서버가 number로 보내는 건 권장되지 않지만, 방어적으로 처리
        return String(v);
    };

    return (
        <div>
            {/* 🛍️  */}
            <h1 className="store-name">My Little Coin Cart</h1>

            {!account || !accessToken ? (
                <button onClick={onLogin} className="connect-wallet-button">
                    🦊 지갑으로 로그인
                </button>
            ) : (
                <p>✅ 연결된 지갑: {account}</p>
            )}

            <HeroSection />

            {products.length === 0 ? (
                <p>상품 목록을 불러오는 중입니다...</p>
            ) : (
                <ProductList products={products} onPurchase={handlePurchase} />
            )}

            {/* 상품 리스트 아래에 쿠폰 리스트 표시 */}
            {account && accessToken && (
                <div style={{ margin: "12px 0" }}>
                    <h3>쿠폰 선택</h3>
                    <CouponList
                        accessToken={accessToken!}
                        onSelectCoupon={async (coupon) => {
                            setSelectedCoupon(coupon);

                            // 해제: 원가 복원 + 키 리셋 
                            if (!coupon) {
                                if (selectedProduct) setFinalAmountWei(selectedProduct.priceWei);
                                lastValidateKeyRef.current = null;
                                return;
                            }
                            // 상품 미선택 시 검증 지연 
                            if (!selectedProduct) return;

                            const thisKey = `${selectedProduct!.id}:${coupon.id}`;

                            // 같은 조합의 중복 요청 막기 (요청 in-flight 또는 직후)
                            if (lastValidateKeyRef.current === thisKey) return;
                            lastValidateKeyRef.current = thisKey;


                            try {
                                const res = await validateMut.mutateAsync({
                                    couponId: Number(coupon.id),
                                    productId: selectedProduct!.id,
                                });

                                // 응답이 돌아왔을 때 여전히 최신 요청인지 확인 (레이스가드)
                                if (lastValidateKeyRef.current !== thisKey) return;

                                // 서버가 priceAfter(wei)를 주면 그 값을 사용 
                                const priceAfter = (res as any)?.priceAfter as string | undefined;
                                if (priceAfter) {
                                    setFinalAmountWei(priceAfter);
                                    // 없으면 discountBps로 계산(프론트 계산)
                                } else {
                                    const priceWei = BigInt(selectedProduct.priceWei);
                                    const bps = (res as any)?.discountBps ?? 0; // 예: 500 = 5%
                                    const discount = (priceWei * BigInt(bps)) / 10_000n;
                                    setFinalAmountWei((priceWei - discount).toString());
                                }
                            } catch (e: any) {
                                // 실패 시 다음 시도 가능하도록 리셋 
                                lastValidateKeyRef.current = null;
                                console.error("[onSelectCoupon] validate failed:", e);
                                // 실패 시 선택 해제 + 원가 복원
                                setSelectedCoupon(null);
                                if (selectedProduct) setFinalAmountWei(selectedProduct.priceWei);
                                alert(e?.response?.status === 401 ? "세션 만료. 다시 로그인" : "쿠폰 검증 실패");
                            }
                        }}
                    />
                    {/* 검증 상태/최종 금액 표시 */}
                    <div style={{ marginTop: 8 }}>
                        {validateMut.isPending
                            ? "쿠폰 검증 중..."
                            : <> 최종 결제 금액: <b>{finalAmountWei ?? selectedProduct?.priceWei ?? "-"}</b></>}
                    </div>
                </div>
            )}

            {/* 배송지 폼 */}
            {account && selectedProduct && showShippingForm && (
                <Modal onClose={() => setShowShippingForm(false)}>
                    <ShippingForm
                        initialData={shippingInfo ?? undefined}
                        onSubmit={handleShippingSubmit}
                        onCancel={handleCancelShipping}
                    />
                </Modal>
            )}

            {/* 결제 모달 */}
            {account && selectedProduct && !showShippingForm && shippingInfo && (
                <>
                    {/*  PayButton 렌더 순간의 값 확인 */}
                    <DebugLog
                        label="[PaymentPage] render PayButton ▶"
                        data={{
                            selectedCoupon,
                            originalPriceWei: selectedProduct.priceWei,
                            finalAmountWei,
                        }}
                    />
                    <Modal
                        onClose={() => {
                            setSelectedProduct(null);
                            setShippingInfo(null);
                            setSelectedCoupon(null);
                            setFinalAmountWei(null);
                        }}
                    >
                        <PayButton
                            account={account}
                            amount={String(finalAmountWei ?? selectedProduct.priceWei)} // 최종가(할인 후)
                            productId={selectedProduct.id}
                            selectedCoupon={selectedCoupon}
                            originalPriceWei={selectedProduct.priceWei}
                            onSuccess={() => {
                                setPaymentSuccess(true);
                                setTimeout(() => {
                                    setPaymentSuccess(false);
                                    setSelectedProduct(null);
                                    setShippingInfo(null);
                                }, 2500);
                            }}
                            onCancel={() => {
                                setSelectedProduct(null);
                                setShippingInfo(null);
                            }}
                        />
                    </Modal>
                </>
            )}

            {paymentSuccess && (
                <div className="success-popup">🎉 결제가 완료되었습니다</div>
            )}

            <ToastContainer />
        </div>
    );
};

export default PaymentPage;