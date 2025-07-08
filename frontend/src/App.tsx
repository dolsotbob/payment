import React, { Component, useState, useEffect } from 'react';  // React 라이브러리와 useState 상태 저장 리액트 훅 
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ethers } from 'ethers';  // 메타마스크와 통신할 수 있는 Ethereum JS 라이브러리
import ProductList from './components/ProductList';
import { Product } from './types';
import PayGaslessButton from './components/PayGaslessButton';
import PaymentHistory from './pages/PaymentHistory';
import Navbar from './components/Navbar';
import './components/css/ConnectWalletButton.css';
import './App.css';
import dotenv from 'dotenv'

dotenv.config();


const App: React.FC = () => {
  // 상태 변수 선언 
  // account: 연결된 지갑 주소를 저장할 변수 
  // 처음엔 null이지만, 지갑을 연결하면 주소가 여기 저장됨
  const [account, setAccount] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // 1. 상품 목록 (App이 상태 주도권을 가짐)
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`{process.env.REACT_APP_API_URL}/product`);
        if (!res.ok) throw new Error('서버 응답 오류');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('❌ 상품 목록 로드 실패:', err);
      }
    };

    fetchProducts();
  }, []);

  // 2. 🦊 지갑 연결
  const connectWallet = async () => {  // 지갑 연결 요청을 실행하는 버튼 이벤트 핸들러 함수 
    try {
      // 사용자의 브라우저에 메마 설치 여부 확인 -> 없으면 경고창 띄우고 함수 종료 
      // window.ethereum: window는 브라우저 전역 객체, ethereum은 메마가 브라우저에 추가해주는 객체 
      if (!window.ethereum) {
        alert("🦊 메타마스크를 설치해주세요!");
        return;
      }
      // provide는 ethers.js에서 메마와 통신하기 위한 연결 통로를 만드는 객체 
      // window.ethereum을 기반으로 하며 이후 모든 요청은 provider를 통해 이루어짐 
      // ethers.BrowserProvider: 브라우저에서 메타마스크로 연결하는 객체     
      const provider = new ethers.BrowserProvider(window.ethereum);
      // 메마에서 사용자 지갑 주소 알려달라고 요청; 여기서 사용자의 지갑 연결 창이 뜬다 (허용 시 주소 반환)
      // eth_requestAccounts: 메타마스크에게 “지갑 연결”을 요청하는 명령어
      const accounts = await provider.send("eth_requestAccounts", []);
      // 상태 업데이트 
      // 대부분의 dApp은 첫 번째 지갑 주소만 사용하므로 accounts[0]을 사용 
      setAccount(accounts[0]);
    } catch (error) {
      console.error("지갑 연결 실패:", error);
      alert('지갑 연결에 실패했습니다.');
    }
  };

  // 3. 💸 결제 처리
  // 상품을 클릭(선택) 했을 때 호출되는 함수 
  // 전달 받은 product 객체를 상태 변수 selectedProduct에 저장 
  // 저장된 selectedProduct는 아래 컴포넌트들(PayButton, ApproveAndPay)에서 amount={selectedProduct.price} 형태로 전달된다 
  const handlePurchase = (product: Product) => {
    setSelectedProduct(product);
  };

  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);

  return (
    <Router>
      <Navbar />
      <div style={{ padding: '2rem' }}>
        <h1 className='store-name'>🛍️ <span style={{ color: 'darkblue' }}>코</span>인로 <span style={{ color: 'darkblue' }}>쇼</span>핑하는 <span style={{ color: 'darkblue' }}>스</span>토어</h1>

        {/* // 지갑 연결 여부에 따라 조건부 렌더링  */}
        {!account ? (
          <button onClick={connectWallet} className="connect-wallet-button">🦊 지갑 연결</button>
        ) : (
          <p>✅ 연결된 지갑: {account}</p>
        )}

        <Routes>
          <Route path="/" element={
            <>
              <ProductList
                products={products}
                onPurchase={(product) => setSelectedProduct(product)}
              />
              {/* <ProductList products={products} onPurchase={handlePurchase} /> */}
              {account && selectedProduct && (
                <>
                  <div className='overlay' onClick={() => setSelectedProduct(null)} />
                  <div className="popup-wrapper">
                    <button className="close-button" onClick={() => setSelectedProduct(null)}>✖</button>
                    <PayGaslessButton
                      account={account}
                      amount={selectedProduct.price}
                      productId={selectedProduct.id}
                      onSuccess={() => {
                        setPaymentSuccess(true);
                        setTimeout(() => {
                          setPaymentSuccess(false);
                          setSelectedProduct(null);
                        }, 2500);  // 2.5초 후에 자동 닫기 
                      }}
                    />
                  </div>
                </>
              )}

              {paymentSuccess &&
                <div className="success-popup">🎉 결제가 완료되었습니다</div>
              }
            </>
          } />

          <Route path="/payment-history" element={
            account ? <PaymentHistory account={account} /> : <p>지갑을 먼저 연결해주세요</p>
          } />
        </Routes>
      </div>
    </Router >
  );
};

export default App;
