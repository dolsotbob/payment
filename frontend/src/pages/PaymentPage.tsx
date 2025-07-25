// 상품 목록과 배송지 + 결제 흐름만 관리  

import React, { useState, useEffect } from 'react';  // React 라이브러리와 useState 상태 저장 리액트 훅 
import { Product, ShippingInfo } from '../types';
import ProductList from '../components/ProductList';
import { ShippingForm } from '../components/ShippingForm';
import PayButton from '../components/PayButton';
import Modal from '../components/Modal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './paymentPage.css';
// import '../components/css/ConnectWalletButton.css';

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

    // 상품을 클릭(선택) 했을 때 호출되는 함수 
    // 전달 받은 product 객체를 상태 변수 selectedProduct에 저장 
    // 저장된 selectedProduct는 아래 컴포넌트들(PayButton...)에서 amount={selectedProduct.price} 형태로 전달된다 
    const handlePurchase = (product: Product) => {
        setSelectedProduct(product);
        setShowShippingForm(true);
    };

    const handleShippingSubmit = async (info: Omit<ShippingInfo, 'id'>) => {
        // 배송지 백엔드 저장
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/shipping-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...info, userAddress: account }),
        });
        setShippingInfo({ ...info, id: 0 }); // id는 모름 → 더미 처리
        setShowShippingForm(false);
    };

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

            <ProductList
                products={products}
                onPurchase={handlePurchase}
            />

            {account && selectedProduct && showShippingForm && (
                <Modal onClose={() => setShowShippingForm(false)}>
                    <ShippingForm
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
