// 상품 목록과 배송지 + 결제 흐름만 관리  

import React, { useState, useEffect, useCallback } from 'react';  // React 라이브러리와 useState 상태 저장 리액트 훅 
import { Product, ShippingInfo } from '../types';
import ProductList from '../components/ProductList';
import { ShippingForm } from '../components/ShippingForm';
import PayButton from '../components/PayButton';
import Modal from '../components/Modal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './paymentPage.css';
import mainImage from '../images/payment_main_img.jpg';

interface Props {
    account: string | null;  // 유저 주소 
    connectWallet: () => Promise<void>;
}

const PaymentPage: React.FC<Props> = ({ account, connectWallet }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [showShippingForm, setShowShippingForm] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        // 1. 상품 목록 로드 
        const fetchProducts = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/product`);
                // const res = await fetch('http://localhost:4000/product');
                if (!res.ok) throw new Error('서버 응답 오류');
                const data = await res.json();
                // 변환: price를 string → number
                const parsedData = data.map((p: any) => ({
                    ...p,
                    price: p.price,
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
            const data = await res.json();
            setShippingInfo(data);  // 기존 상태 업데이트
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
            <h1 className='store-name'>🛍️ <span style={{ color: 'darkblue' }}>코</span>인로 <span style={{ color: 'darkblue' }}>쇼</span>핑하는 <span style={{ color: 'darkblue' }}>스</span>토어</h1>

            {!account ? (
                <button onClick={connectWallet} className="connect-wallet-button">🦊 지갑 연결</button>
            ) : (
                <p>✅ 연결된 지갑: {account}</p>
            )}

            <img
                src={mainImage}
                alt="Payment Visual"
                className="main-image"
            />

            {products.length === 0 ? (
                <p>상품 목록을 불러오는 중입니다...</p>
            ) : (
                <ProductList products={products} onPurchase={handlePurchase} />
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

            {account && selectedProduct && !showShippingForm && shippingInfo && (
                <Modal onClose={() => {
                    setSelectedProduct(null);
                    setShippingInfo(null);
                }}>
                    <PayButton
                        account={account}
                        amount={selectedProduct.price}
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
