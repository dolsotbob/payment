// 상품 목록과 배송지 + 결제 흐름만 관리  

import React, { useState, useEffect, useCallback } from 'react';  // React 라이브러리와 useState 상태 저장 리액트 훅 
import { Product, ShippingInfo } from '../types/types';
import ProductList from '../components/ProductList';
import { ShippingForm } from '../components/ShippingForm';
import PayButton from '../components/PayButton';
import Modal from '../components/Modal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './paymentPage.css';
import HeroSection from '../components/HeroSection';
import { CouponList } from '../components/coupons/CouponList';
import type { OwnedCoupon } from '../types/couponTypes';
import { useValidateCouponMutation } from '../hooks/mutations/useValidateCouponMutation';

interface Props {
    account: string | null;  // 유저 주소 
    onLogin: () => void;
}

const PaymentPage: React.FC<Props> = ({ account, onLogin }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedCoupon, setSelectedCoupon] = useState<OwnedCoupon | null>(null);
    const [finalAmount, setFinalAmount] = useState<number | null>(null); // 토큰/법정 통화 중 현재 amount 타입에 맞춰 사용
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [showShippingForm, setShowShippingForm] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const validateMut = useValidateCouponMutation();

    // (1) access_token 가드: CouponList 렌더링/전달 전에 존재 확인
    const accessToken = localStorage.getItem('access_token');

    useEffect(() => {
        // 1. 상품 목록 로드 
        const fetchProducts = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/product`);
                // const res = await fetch('http://localhost:4000/product');
                if (!res.ok) throw new Error('서버 응답 오류');
                const data = await res.json();
                // (2) 변환: price를 string → number
                const parsedData = data.map((p: any) => ({
                    ...p,
                    price: Number(p.price),  // 문자열로 오면 number로 통일 
                }));
                setProducts(parsedData);
            } catch (err) {
                console.error('❌ 상품 목록 로드 실패:', err);
            }
        };

        fetchProducts();
    }, []);

    // 2. 배송지 정보 로드 - 지갑 주소(account)가 있을 때만 실행 
    const fetchShippingInfo = useCallback(async () => {
        if (!account) return;

        try {
            const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/shipping-info/${account}`);
            if (!res.ok) throw new Error('배송지 조회 실패');

            const text = await res.text();
            const data = text ? JSON.parse(text) : null;
            setShippingInfo(data);  // 기존 상태 업데이트; null이면 배송지 없음으로 처리 가능 
        } catch (err) {
            console.error('❌ 배송지 정보 로드 실패:', err);
        }
    }, [account]);

    useEffect(() => {
        fetchShippingInfo();
    }, [fetchShippingInfo]);

    // 3. 상품 선택 
    // 상품을 클릭(선택) 했을 때 호출되는 함수 
    // 전달 받은 product 객체를 상태 변수 selectedProduct에 저장 
    // 저장된 selectedProduct는 아래 컴포넌트들(PayButton...)에서 amount={selectedProduct.price} 형태로 전달된다 
    const handlePurchase = (product: Product) => {
        setSelectedProduct(product);
        setShowShippingForm(true);
        setSelectedCoupon(null);
        setFinalAmount(product.price); // 기본 금액으로 초기화
    };

    // 4. 배송지 제출 
    const handleShippingSubmit = async (info: Omit<ShippingInfo, 'id'>) => {
        try {
            const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/shipping-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...info, userAddress: account }),
            });
            const savedInfo = await res.json(); // id 포함된 응답
            setShippingInfo(savedInfo);
        } catch (err) {
            console.error('❌ 배송지 저장 실패:', err);
        } finally {
            setShowShippingForm(false);
        }
    };

    // 5. 배송지 폼 닫기 
    const handleCancelShipping = () => {
        setShowShippingForm(false);
    };

    return (
        <div>
            {/* 🛍️  */}
            <h1 className='store-name'>My Little Coin Cart</h1>

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

            {/* // 상품 리스트 아래에 쿠폰 리스트 표시  */}
            {account && selectedProduct && localStorage.access_token && (
                <div style={{ margin: '12px 0' }}>
                    <h3>쿠폰 선택</h3>
                    <CouponList
                        accessToken={accessToken as string} // 프로젝트 전반 정리된 prop명이 accessToken이면 그에 맞춰 변경
                        onSelectCoupon={async (coupon) => {
                            setSelectedCoupon(coupon);
                            if (!coupon) {
                                setFinalAmount(selectedProduct.price);
                                return;
                            }
                            try {
                                const res = await validateMut.mutateAsync({
                                    couponId: coupon.id,
                                    productId: selectedProduct.id, // uuid 가정
                                });
                                // 서버가 최종가를 내려주는 경우 사용
                                const priceAfter = (res as any)?.priceAfter;
                                if (priceAfter != null) {
                                    setFinalAmount(typeof priceAfter === 'string' ? Number(priceAfter) : priceAfter);
                                } else {
                                    // 응답 필드명이 다르면 여기서 계산/매핑. 시간이 없으면 기본가 유지.
                                    setFinalAmount(selectedProduct.price);
                                }
                            } catch (e: any) {
                                alert(
                                    e?.response?.status === 401
                                        ? '세션이 만료되었습니다. 다시 로그인 해주세요.'
                                        : '쿠폰을 적용할 수 없습니다.'
                                );
                                setSelectedCoupon(null);
                                setFinalAmount(selectedProduct.price);
                            }
                        }}
                    />
                    {/* 검증 상태/최종 금액 간단 표시 */}
                    <div style={{ marginTop: 8 }}>
                        {validateMut.isPending ? '쿠폰 검증 중...' : (
                            <>최종 결제 금액: <b>{finalAmount ?? selectedProduct.price}</b></>
                        )}
                    </div>
                </div>
            )}

            {account && selectedProduct && showShippingForm && (
                <Modal onClose={() => setShowShippingForm(false)}>
                    <ShippingForm
                        initialData={shippingInfo ?? undefined} // 초기값 전달 
                        onSubmit={handleShippingSubmit}
                        onCancel={handleCancelShipping}
                    />
                </Modal>
            )}

            {/* // PayButton 모달 부분  */}
            {account && selectedProduct && !showShippingForm && shippingInfo && (
                <Modal onClose={() => {
                    setSelectedProduct(null);
                    setShippingInfo(null);
                    setSelectedCoupon(null);
                    setFinalAmount(null);
                }}>
                    <PayButton
                        account={account}
                        amount={String(finalAmount ?? selectedProduct.price)}
                        productId={selectedProduct.id}
                        onSuccess={() => {
                            setPaymentSuccess(true);
                            setTimeout(() => {
                                setPaymentSuccess(false);
                                setSelectedProduct(null);
                                setShippingInfo(null);
                            }, 2500);  // 2.5초 후에 자동 닫기 
                        }}
                        onCancel={() => {
                            setSelectedProduct(null); // 선택 취소
                            setShippingInfo(null); // 배송지 초기화 
                        }}
                    />
                </Modal>
            )}

            {paymentSuccess && (
                <div className="success-popup">🎉 결제가 완료되었습니다</div>
            )}

            <ToastContainer />
        </div >
    );
};

export default PaymentPage;
